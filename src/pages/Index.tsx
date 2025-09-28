import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VisionPanel from '@/components/VisionPanel';
import AudioControls from '@/components/AudioControls';
import EmergencyInterface from '@/components/EmergencyInterface';
import SettingsDashboard from '@/components/SettingsDashboard';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/Logo';

const Index = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <Logo variant="wordmark" className="h-20 w-auto" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your seeing‑eye assistant in your pocket. Walk with confidence.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant="secondary">EN/FR Canada</Badge>
            <Badge variant="secondary">Offline-First</Badge>
            <Badge variant="secondary">Privacy-First</Badge>
          </div>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="vision" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vision" className="text-sm">
              Vision
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-sm">
              Audio
            </TabsTrigger>
            <TabsTrigger value="emergency" className="text-sm">
              Emergency
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm">
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 flex justify-center">
            <TabsContent value="vision" className="w-full flex justify-center">
              <VisionPanel />
            </TabsContent>
            
            <TabsContent value="audio" className="w-full flex justify-center">
              <AudioControls />
            </TabsContent>
            
            <TabsContent value="emergency" className="w-full flex justify-center">
              <EmergencyInterface />
            </TabsContent>
            
            <TabsContent value="settings" className="w-full flex justify-center">
              <SettingsDashboard />
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground space-y-2">
          <p>Built in Canada • Privacy‑first • Works offline</p>
          <p className="text-xs">Prototype UI for StrideGuide v1 MVP</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
