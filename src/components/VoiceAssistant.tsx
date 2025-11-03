import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder, encodeAudioForAPI, playAudioData, clearAudioQueue } from '@/utils/RealtimeAudio';
import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const VoiceAssistant = () => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentTranscriptRef = useRef<string>('');

  const getWebSocketUrl = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('VITE_SUPABASE_URL not configured');
    }
    const url = supabaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    return `${url}/functions/v1/realtime-voice`;
  };

  const startConversation = async () => {
    try {
      console.log('Starting voice conversation...');
      
      // Initialize audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Connect to WebSocket
      const wsUrl = getWebSocketUrl();
      console.log('Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = async () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Start audio recording
        recorderRef.current = new AudioRecorder((audioData) => {
          if (!isMuted && wsRef.current?.readyState === WebSocket.OPEN) {
            const encoded = encodeAudioForAPI(audioData);
            wsRef.current.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: encoded
            }));
          }
        });
        
        await recorderRef.current.start();
        
        toast({
          title: "Voice assistant ready",
          description: "Alex is listening. Speak naturally.",
        });
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received event:', data.type);

        if (data.type === 'response.audio.delta') {
          setIsAssistantSpeaking(true);
          // Decode and play audio
          const binaryString = atob(data.delta);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          if (audioContextRef.current) {
            await playAudioData(audioContextRef.current, bytes);
          }
        } else if (data.type === 'response.audio.done') {
          setIsAssistantSpeaking(false);
        } else if (data.type === 'response.audio_transcript.delta') {
          currentTranscriptRef.current += data.delta;
        } else if (data.type === 'response.audio_transcript.done') {
          if (currentTranscriptRef.current) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: currentTranscriptRef.current,
              timestamp: new Date()
            }]);
            currentTranscriptRef.current = '';
          }
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          if (data.transcript) {
            setMessages(prev => [...prev, {
              role: 'user',
              content: data.transcript,
              timestamp: new Date()
            }]);
          }
        } else if (data.type === 'error') {
          console.error('OpenAI error:', data.error);
          toast({
            title: "Error",
            description: data.error.message || "Something went wrong",
            variant: "destructive",
          });
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection error",
          description: "Failed to connect to voice assistant",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        endConversation();
      };

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start conversation',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    console.log('Ending conversation...');
    
    recorderRef.current?.stop();
    recorderRef.current = null;
    
    wsRef.current?.close();
    wsRef.current = null;
    
    audioContextRef.current?.close();
    audioContextRef.current = null;
    
    clearAudioQueue();
    setIsConnected(false);
    setIsAssistantSpeaking(false);
    setIsMuted(false);
    currentTranscriptRef.current = '';
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    toast({
      description: isMuted ? "Microphone unmuted" : "Microphone muted",
    });
  };

  useEffect(() => {
    return () => {
      endConversation();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="w-full max-w-2xl">
        {/* Connection Status */}
        <div className="mb-6 text-center">
          {isConnected ? (
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isAssistantSpeaking ? 'bg-green-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isAssistantSpeaking ? 'Alex is speaking...' : 'Listening...'}
              </span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Not connected</span>
          )}
        </div>

        {/* Messages */}
        <div className="mb-6 space-y-4 max-h-[400px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-primary/10 ml-12'
                  : 'bg-secondary/50 mr-12'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-semibold text-sm">
                  {msg.role === 'user' ? 'You' : 'Alex'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-sm">{msg.content}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isConnected ? (
            <Button
              onClick={startConversation}
              size="lg"
              className="bg-primary hover:bg-primary/90"
            >
              <Phone className="mr-2 h-5 w-5" />
              Start Voice Assistant
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleMute}
                size="lg"
                variant={isMuted ? "destructive" : "secondary"}
              >
                {isMuted ? (
                  <>
                    <MicOff className="mr-2 h-5 w-5" />
                    Unmute
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Mute
                  </>
                )}
              </Button>
              <Button
                onClick={endConversation}
                size="lg"
                variant="destructive"
              >
                <PhoneOff className="mr-2 h-5 w-5" />
                End Call
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAssistant;
