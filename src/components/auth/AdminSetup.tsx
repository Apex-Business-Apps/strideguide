import { useState, useEffect } from "react";
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
  const [adminsExist, setAdminsExist] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is admin and if any admins exist
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        // Check if any admins exist in the system
        const { data: adminsExistData, error: adminsError } = await supabase.rpc('admins_exist');
        
        if (adminsError) {
          console.error('Error checking if admins exist:', adminsError);
        } else {
          setAdminsExist(adminsExistData);
        }

        // Check if current user is admin
        const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_admin', {
          _user_id: userId
        });
        
        if (isAdminError) {
          console.error('Error checking admin status:', isAdminError);
        } else {
          setIsAdmin(isAdminData);
        }
      } catch (error) {
        console.error('Error in admin status check:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [userId]);

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

  // Loading state
  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto p-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Setup
          </CardTitle>
          <CardDescription>
            Checking admin status...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // User is already admin - hide this component
  if (isAdmin) {
    return null;
  }

  // Admins exist and user is not admin - show contact message
  if (adminsExist) {
    return (
      <Card className="max-w-2xl mx-auto p-6 border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Admin Access Required
          </CardTitle>
          <CardDescription>
            An administrator is needed to grant admin privileges.
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
          
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium text-primary">
              🔒 Admin Assignment Locked
            </p>
            <p className="text-xs text-muted-foreground">
              Only existing administrators can grant admin privileges. Please contact your system administrator to request access.
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

          <p className="text-xs text-muted-foreground text-center">
            This security measure ensures proper access control and audit trails for administrative actions.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No admins exist - allow first admin self-assignment
  return (
    <Card className="border-green-500/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          First Admin Setup
        </CardTitle>
        <CardDescription>
          No administrators exist. You can assign yourself as the first admin.
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

        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium text-green-600 dark:text-green-500">
            ✓ First Admin Eligibility Confirmed
          </p>
          <p className="text-xs text-muted-foreground">
            As the first administrator, you'll establish the security baseline for the entire system. This is a one-time opportunity.
          </p>
        </div>

        <Button 
          onClick={handleAssignAdmin} 
          disabled={isAssigning}
          className="w-full"
        >
          {isAssigning ? "Granting First Admin Access..." : "Become First Admin"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          After assignment, only admins will be able to grant admin privileges to other users. This action is logged in the security audit trail.
        </p>
      </CardContent>
    </Card>
  );
};
