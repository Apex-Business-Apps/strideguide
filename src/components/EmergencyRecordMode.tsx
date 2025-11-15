import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Video,
  Mic,
  MicOff,
  Shield,
  Clock,
  Eye,
  Play,
  Square,
  Volume2
} from 'lucide-react';
import { useEmergencyRecording } from '@/hooks/useEmergencyRecording';
import { PolicyManager } from '@/utils/PolicyManager';
import { useToast } from '@/hooks/use-toast';

const EmergencyRecordMode = () => {
  const {
    isRecording,
    currentSession,
    sessions,
    settings,
    policy,
    storageUsed,
    isInitialized,
    storagePercentage,
    canRecord: _canRecord,
    needsConsent,
    hasPreEventBuffer,
    startRecording,
    stopRecording
  } = useEmergencyRecording();

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [_consentGiven, setConsentGiven] = useState(false);
  const { toast } = useToast();

  // Handle consent for all-party states
  const handleConsentModal = () => {
    if (needsConsent && !PolicyManager.hasConsent()) {
      setShowConsentModal(true);
    } else {
      startRecording('manual');
    }
  };

  const handleConsentApprove = () => {
    PolicyManager.giveConsent();
    setConsentGiven(true);
    setShowConsentModal(false);
    startRecording('manual');
  };

  const handleConsentDeny = () => {
    setShowConsentModal(false);
    toast({
      title: "Audio Recording Disabled",
      description: "Recording will continue with video only and forced indicators.",
      variant: "destructive"
    });
    startRecording('manual');
  };

  if (!isInitialized || !policy) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Initializing Emergency Record Mode...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Recording Status Banner */}
      {isRecording && (
        <Alert className="border-destructive bg-destructive/5">
          <Video className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="font-medium">
              🔴 RECORDING ACTIVE - {policy.audioAllowed ? 'Video + Audio' : 'Video Only'}
            </span>
            <Badge variant="destructive" className="ml-2">
              {currentSession ? 
                `${Math.floor((Date.now() - currentSession.startTime) / 1000)}s` : 
                'Recording'
              }
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      {/* Policy Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Emergency Record Mode
            <Badge variant={policy.region === 'QC' ? 'destructive' : 'secondary'} className="ml-auto">
              {policy.region}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Legal Basis */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-1">Legal Basis</p>
            <p className="text-xs text-muted-foreground">
              Emergency recording legal basis: Safety and security purposes under applicable privacy laws
            </p>
          </div>

          {/* Recording Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recording Controls</h3>
              <div className="flex items-center gap-2">
                {policy.audioAllowed ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Mic className="h-3 w-3" />
                    Audio Enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <MicOff className="h-3 w-3" />
                    Audio Disabled
                  </Badge>
                )}
                {policy.requiresBeep && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Volume2 className="h-3 w-3" />
                    Beep Required
                  </Badge>
                )}
              </div>
            </div>

            {/* Main Record Button - Large Touch Target */}
            <div className="space-y-3">
              {!isRecording ? (
                <Button
                  onClick={handleConsentModal}
                  size="lg"
                  variant="destructive"
                  className="w-full h-16 text-lg font-semibold"
                  aria-label="Start emergency recording - large touch target"
                >
                  <Play className="h-6 w-6 mr-3" />
                  Start Emergency Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="w-full h-16 text-lg font-semibold"
                  aria-label="Stop emergency recording - large touch target"
                >
                  <Square className="h-6 w-6 mr-3" />
                  STOP RECORDING
                </Button>
              )}

              {/* Pre-event Buffer Status */}
              {hasPreEventBuffer && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Pre-event buffer: 2-5 minutes available
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Recording Triggers */}
          <div className="space-y-3">
            <h3 className="font-medium">Auto-Triggers</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                <p className="font-medium text-sm">Fall Detection</p>
                <p className="text-xs text-muted-foreground">Auto-starts on confirmed fall</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-medium text-sm">SOS Activation</p>
                <p className="text-xs text-muted-foreground">Starts with emergency SOS</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-medium text-sm">Voice Command</p>
                <p className="text-xs text-muted-foreground">"StrideGuide, record"</p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="font-medium text-sm">Triple Volume</p>
                <p className="text-xs text-muted-foreground">Press volume 3x quickly</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Storage & Retention */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Storage & Retention</h3>
              <Badge variant="outline">
                {sessions.length} sessions
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage Used</span>
                <span>{storageUsed.toFixed(2)} GB / {settings.maxStorageGB} GB</span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
              {storagePercentage > 80 && (
                <p className="text-xs text-destructive">
                  Storage nearly full. Will switch to audio-only mode.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted">
                <p className="font-medium">Retention Period</p>
                <p className="text-muted-foreground">{settings.retentionHours}h</p>
              </div>
              <div className="p-2 rounded bg-muted">
                <p className="font-medium">Encryption</p>
                <p className="text-muted-foreground">AES-GCM</p>
              </div>
            </div>
          </div>

          {/* Evidence Locker */}
          {sessions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Evidence Locker
                  </h3>
                  <Badge variant="outline">
                    Biometric Lock
                  </Badge>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sessions.slice(-3).map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-medium">
                          {session.trigger.toUpperCase()} - {new Date(session.startTime).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.endTime ? 
                            `${Math.round((session.endTime - session.startTime) / 1000)}s` : 
                            'In Progress'
                          }
                        </p>
                      </div>
                      <Button variant="outline" size="sm" disabled>
                        Export
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* All-Party Consent Modal */}
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Recording Consent Required
            </DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                This jurisdiction requires all-party consent for audio recording. 
                By proceeding, you confirm all parties present consent to being recorded.
              </p>
              <p className="text-sm text-muted-foreground">
                If consent is not obtained, recording will continue with:
                • Video only (no audio)
                • Forced visual indicators
                • Mandatory recording beep
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button 
              onClick={handleConsentApprove}
              variant="default" 
              className="flex-1"
            >
              All Parties Consent
            </Button>
            <Button 
              onClick={handleConsentDeny}
              variant="outline" 
              className="flex-1"
            >
              Video Only
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyRecordMode;