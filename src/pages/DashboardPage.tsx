import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, CreditCard, Users, BarChart3, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminSetup } from "@/components/auth/AdminSetup";
import { FeatureGate } from "@/components/enterprise/FeatureGate";
import SettingsDashboard from "@/components/SettingsDashboard";
import { Logo } from "@/components/Logo";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface DashboardPageProps {
  user: User;
  onSignOut: () => void;
}

export default function DashboardPage({ user, onSignOut }: DashboardPageProps) {
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');

  const flags = useFeatureFlags();

  const checkUserRole = useCallback(async () => {
    try {
      // Bypass edge calls if disabled
      if (!flags.enableEdgeCheck) {
        setUserRole('user');
        return;
      }
      // Server-side admin authorization check
      const { data: session } = await supabase.auth.getSession();

      if (!session.session?.access_token) {
        setUserRole('user');
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-admin-access', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        console.error('Error checking admin access:', error);
        setUserRole('user');
        return;
      }

      // Set role based on server-side validation
      setUserRole(data?.isAdmin ? 'admin' : 'user');
    } catch (error) {
      console.error('Admin check failed:', error);
      setUserRole('user');
    }
  }, [flags.enableEdgeCheck]);

  useEffect(() => {
    checkUserRole();
  }, [user, flags.enableEdgeCheck, checkUserRole]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
      
      onSignOut();
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const isAdmin = userRole === 'admin' || userRole === 'super-admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo />
              <div>
                <h1 className="text-xl font-bold">StrideGuide Enterprise</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user.user_metadata?.first_name || user.email}
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                    <ShieldCheck className="h-3 w-3" />
                    Admin Access
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!isAdmin ? (
          <div className="space-y-6">
            <AdminSetup userId={user.id} userEmail={user.email || ''} />
            
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="subscription">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-2">Access StrideGuide</h3>
                        <p className="text-muted-foreground mb-4">
                          Launch the main StrideGuide application with all core features
                        </p>
                        <Button asChild>
                          <a href="/app">Launch App</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="subscription">
                <SubscriptionManager user={user} />
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
                    <SettingsDashboard />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subscription">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="admin">
                <BarChart3 className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                
                {/* Main App Access */}
                <div className="md:col-span-2 lg:col-span-3">
                  <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border">
                    <h3 className="text-lg font-semibold mb-2">Access StrideGuide</h3>
                    <p className="text-muted-foreground mb-4">
                      Launch the main StrideGuide application with all core features
                    </p>
                    <Button asChild>
                      <a href="/app">Launch App</a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManager user={user} />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
                <SettingsDashboard />
              </div>
            </div>
          </TabsContent>

            <TabsContent value="admin">
              <FeatureGate
                feature="custom_features"
                user={user}
                showUpgrade={false}
                fallback={
                  <div className="text-center p-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
                    <p className="text-muted-foreground">
                      You need administrator privileges to view this section.
                    </p>
                  </div>
                }
              >
                <AdminDashboard />
              </FeatureGate>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}