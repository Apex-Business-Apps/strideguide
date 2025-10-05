import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, CheckCircle } from "lucide-react";

interface AdminSetupProps {
  userId: string;
  userEmail: string;
}

export const AdminSetup = ({ userId, userEmail }: AdminSetupProps) => {
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleAssignAdmin = async () => {
    setIsAssigning(true);
    try {
      // Call the admin role assignment function
      const { data, error } = await supabase.rpc('assign_admin_role', {
        target_user_id: userId,
        target_role: 'admin'
      });

      if (error) {
        throw error;
      }

      setIsAdmin(true);
      toast({
        title: "Admin access granted!",
        description: "You now have full admin privileges. Please refresh the page.",
      });

      // Refresh the page after 2 seconds to apply new permissions
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error assigning admin role:', error);
      toast({
        title: "Error",
        description: "Failed to assign admin role. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isAdmin) {
    return (
      <Card className="border-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Admin Access Granted
          </CardTitle>
          <CardDescription>
            You have been granted admin privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Refreshing page to apply new permissions...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Setup
        </CardTitle>
        <CardDescription>
          Grant yourself admin access to the dashboard and all features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>User ID:</strong> <code className="text-xs bg-muted px-2 py-1 rounded">{userId}</code>
          </p>
          <p className="text-sm">
            <strong>Email:</strong> {userEmail}
          </p>
        </div>
        
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">Admin privileges include:</p>
          <ul className="text-sm space-y-1 ml-4 list-disc">
            <li>Access to admin dashboard</li>
            <li>User management capabilities</li>
            <li>Subscription and billing oversight</li>
            <li>System analytics and monitoring</li>
            <li>Feature flag management</li>
          </ul>
        </div>

        <Button 
          onClick={handleAssignAdmin} 
          disabled={isAssigning}
          className="w-full"
        >
          {isAssigning ? "Granting Admin Access..." : "Grant Admin Access"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          This action will assign you the 'admin' role and grant full system access.
        </p>
      </CardContent>
    </Card>
  );
};
