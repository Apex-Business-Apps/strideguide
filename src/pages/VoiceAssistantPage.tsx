import React from 'react';
import VoiceAssistant from '@/components/VoiceAssistant';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VoiceAssistantPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Voice Assistant - StrideGuide"
        description="Real-time voice conversation with AI assistant for navigation and safety guidance"
      />
      
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-6">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Voice Assistant</h1>
            <p className="text-muted-foreground">
              Have a natural conversation with Alex, your AI navigation companion
            </p>
          </div>

          <VoiceAssistant />
        </div>
      </div>
    </>
  );
};

export default VoiceAssistantPage;
