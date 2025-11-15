import { useState } from "react";
import { supabase, authRedirectTo } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { z } from "zod";
import { logger } from "@/utils/ProductionLogger";
import { handleAuthError } from "@/utils/AuthErrorHandler";
import { AuthTroubleshooter } from "./AuthTroubleshooter";
import { AuthDiagnosticsInline } from "./AuthDiagnosticsInline";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
});

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("signin");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value.trim() }));
    setError("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Check network connectivity
    if (!navigator.onLine) {
      setError("No internet connection. Please check your network and try again.");
      setIsLoading(false);
      return;
    }

    // B4: Generate correlation ID for this attempt
    const correlationId = crypto.randomUUID();
    logger.info("Sign-in attempt started", { correlationId, action: "signin" });

    try {
      const validated = authSchema.pick({ email: true, password: true }).parse({
        email: formData.email,
        password: formData.password,
      });

      logger.info("Calling Supabase signInWithPassword", { correlationId });
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        const { message } = handleAuthError(error, correlationId, "signin");
        setError(message);
        return;
      }

      logger.info("Sign-in successful", { correlationId, userEmail: data?.user?.email });

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      onAuthSuccess();
    } catch (_error) {
      logger.error("Unexpected sign-in exception", { correlationId, error: _error });

      if (_error instanceof z.ZodError) {
        setError(_error.errors[0].message);
      } else {
        const { message } = handleAuthError(_error, correlationId, "signin");
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Check network connectivity
    if (!navigator.onLine) {
      setError("No internet connection. Please check your network and try again.");
      setIsLoading(false);
      return;
    }

    // B4: Generate correlation ID for this attempt
    const correlationId = crypto.randomUUID();
    logger.info("Sign-up attempt started", { correlationId, action: "signup" });

    try {
      const validated = authSchema.parse(formData);

      logger.info("Calling Supabase signUp", { correlationId });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: authRedirectTo("/auth"),
          data: {
            first_name: validated.firstName,
            last_name: validated.lastName,
          },
        },
      });

      if (error) {
        const { message } = handleAuthError(error, correlationId, "signup");
        setError(message);
        return;
      }

      logger.info("Sign-up successful", { correlationId, userEmail: data?.user?.email });

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      setActiveTab("signin");
    } catch (_error) {
      logger.error("Unexpected sign-up exception", { correlationId, error: _error });

      if (_error instanceof z.ZodError) {
        setError(_error.errors[0].message);
      } else {
        const { message } = handleAuthError(_error, correlationId, "signup");
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setError("Please enter your email address first.");
      return;
    }

    setIsLoading(true);
    setError("");

    const correlationId = crypto.randomUUID();
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: authRedirectTo("/auth"),
      });

      if (error) {
        const { message } = handleAuthError(error, correlationId, "reset");
        setError(message);
        return;
      }

      toast({
        title: "Password reset sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (_error) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold">StrideGuide Enterprise</h1>
          <p className="text-muted-foreground">Professional accessibility solutions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Access Your Account</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                  >
                    Forgot your password?
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="John"
                        required
                        autoComplete="given-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Doe"
                        required
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <AuthTroubleshooter />
            <AuthDiagnosticsInline />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};