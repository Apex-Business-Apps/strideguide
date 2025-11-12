import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/ProductionLogger';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface AIBotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIBotState {
  isActive: boolean;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  messages: AIBotMessage[];
  connectionAttempts: number;
}

const MAX_RECONNECTION_ATTEMPTS = 3;
const RECONNECTION_DELAY = 2000;

export const useAIBot = (user: User | null) => {
  const { toast } = useToast();
  const flags = useFeatureFlags();
  const [state, setState] = useState<AIBotState>({
    isActive: false,
    isConnected: false,
    isLoading: false,
    error: null,
    messages: [],
    connectionAttempts: 0,
  });

  const reconnectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef<boolean>(false);

  // Bot initialization with comprehensive error handling
  const initializeBot = useCallback(async () => {
    if (!user || initializationRef.current) {
      logger.debug('AI Bot: Skipping initialization', { hasUser: !!user, initializing: initializationRef.current });
      return;
    }

    initializationRef.current = true;
    logger.info('AI Bot: Starting initialization', { userId: user.id });

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      connectionAttempts: prev.connectionAttempts + 1
    }));

    try {
      // Test Supabase connection
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (testError) {
        throw new Error(`Database connection failed: ${testError.message}`);
      }

      // Simulate AI service initialization
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Test AI chat function availability (skipped if edge disabled)
      if (flags.enableEdgeCheck) {
        try {
          const { data: testData, error: functionError } = await supabase.functions.invoke('ai-chat', {
            body: { messages: [{ role: 'user', content: 'test' }] }
          });
          if (functionError) {
            logger.warn('AI chat function test failed', { error: functionError.message });
          } else {
            logger.debug('AI chat function test successful');
          }
        } catch (err) {
          logger.debug('AI chat function not available', { error: err });
        }
      } else {
        logger.info('AI chat edge calls disabled via feature flag');
      }

      // Clear any pending reconnection timeout on success
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isLoading: false,
        error: null,
        connectionAttempts: 0
      }));

      logger.info('AI Bot: Successfully initialized');
      
      toast({
        title: "AI Assistant Ready",
        description: "Your AI assistant is now available",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('AI Bot initialization failed', { error: errorMessage });

      setState(prev => {
        const currentAttempts = prev.connectionAttempts;

        // Attempt reconnection if within limits
        if (currentAttempts < MAX_RECONNECTION_ATTEMPTS) {
          logger.info('AI Bot: Scheduling reconnection', { attempt: currentAttempts + 1 });
          reconnectionTimeoutRef.current = setTimeout(() => {
            initializationRef.current = false;
            initializeBot();
          }, RECONNECTION_DELAY * currentAttempts);
        } else {
          logger.error('AI Bot: Max reconnection attempts reached');
          toast({
            title: "AI Assistant Unavailable",
            description: "Unable to connect to AI services. Some features may be limited.",
            variant: "destructive",
          });
        }

        return {
          ...prev,
          isConnected: false,
          isLoading: false,
          error: errorMessage
        };
      });
    } finally {
      initializationRef.current = false;
    }
  }, [user, toast, flags.enableEdgeCheck]);

  // Initialize bot when user changes or component mounts
  useEffect(() => {
    if (user && !state.isConnected && !state.isLoading) {
      logger.debug('AI Bot: User authenticated, initializing bot');
      initializeBot();
    } else if (!user) {
      logger.debug('AI Bot: User signed out, disconnecting bot');
      // Clear any pending timeout
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }
      setState({
        isActive: false,
        isConnected: false,
        isLoading: false,
        error: null,
        messages: [],
        connectionAttempts: 0,
      });
      initializationRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }
    };
  }, [user, state.isConnected, state.isLoading, initializeBot]);

  // Monitor authentication state changes
  useEffect(() => {
    logger.debug('AI Bot state change', {
      userExists: !!user,
      isConnected: state.isConnected,
      isLoading: state.isLoading,
      hasError: !!state.error,
      attempts: state.connectionAttempts
    });
  }, [user, state]);

  const activateBot = useCallback(() => {
    if (!state.isConnected) {
      toast({
        title: "AI Assistant Not Ready",
        description: flags.enableEdgeCheck ? "Please wait for the AI assistant to initialize" : "AI temporarily disabled",
        variant: "destructive",
      });
      return;
    }

    setState(prev => ({ ...prev, isActive: true }));
    logger.info('AI Bot: Activated');
  }, [state.isConnected, toast, flags.enableEdgeCheck]);

  const deactivateBot = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
    logger.info('AI Bot: Deactivated');
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.isConnected || !user) {
      logger.warn('AI Bot: Cannot send message', { connected: state.isConnected, hasUser: !!user });
      return;
    }

    const userMessage: AIBotMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setState(prev => ({ 
      ...prev, 
      messages: [...prev.messages, userMessage],
      isLoading: true
    }));

    try {
      if (!flags.enableEdgeCheck) {
        throw new Error('Edge functions disabled');
      }
      // Call AI chat edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: [
            ...state.messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content }
          ]
        }
      });

      if (error) {
        throw new Error(error.message || 'AI service error');
      }
      
      const botMessage: AIBotMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.message || "I'm sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setState(prev => ({ 
        ...prev, 
        messages: [...prev.messages, botMessage],
        isLoading: false
      }));

    } catch (error) {
      logger.error('AI Bot: Message failed', { error });
      setState(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: "Message Failed",
        description: flags.enableEdgeCheck ? "Unable to send message to AI assistant" : "AI temporarily disabled",
        variant: "destructive",
      });
    }
  }, [state.isConnected, user, state.messages, toast, flags.enableEdgeCheck, supabase]);

  const retryConnection = useCallback(() => {
    setState(prev => ({ ...prev, connectionAttempts: 0, error: null }));
    initializationRef.current = false;
    initializeBot();
  }, [initializeBot]);

  return {
    isActive: state.isActive,
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    messages: state.messages,
    connectionAttempts: state.connectionAttempts,
    activateBot,
    deactivateBot,
    sendMessage,
    retryConnection,
  };
};