import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { AuthTroubleshooter } from "./AuthTroubleshooter";
import { AuthDiagnosticsInline } from "./AuthDiagnosticsInline";

const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
});

interface AuthPageProps {
  onAuthSuccess: () => void;
}

export const AuthPage = ({ onAuthSuccess }: AuthPageProps) => {
  const { t } = useTranslation();
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
        // B4: Log error with correlation ID (sensitive data auto-sanitized by ProductionLogger)
        logger.error("Sign-in error", { 
          correlationId, 
          status: error.status, 
          errorName: error.name,
          errorMessage: error.message 
        });
        
        // Enhanced error messages for mobile data issues
        let userMessage = error.message;
        if (error.message.includes("Invalid login credentials") || error.status === 400) {
          setError("Email or password is incorrect.");
        } else if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
          setError("Network error. If on mobile data: 1) Toggle airplane mode on/off, 2) Restart browser, or 3) Use diagnostics below.");
          logger.error("CORS/Network failure detected", { 
            correlationId, 
            hint: "Check Supabase Auth URL configuration" 
          });
        } else if (error.status === 401 || error.status === 403) {
          setError("Email or password is incorrect.");
        } else if (error.message.includes("timeout") || error.status === 504) {
          setError("Service unreachable. Try again shortly.");
        } else if (error.message.includes("Email not confirmed")) {
          setError("Please verify your email address before signing in. Check your inbox for a confirmation link.");
        } else {
          // B4: Show correlation ID to user for support reference
          setError(`Sign-in failed. Reference: ${correlationId.slice(0, 8)}`);
          logger.error("Unexpected sign-in error", { correlationId, error });
        }
        return;
      }

      logger.info("Sign-in successful", { correlationId, userEmail: data?.user?.email });

      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      onAuthSuccess();
    } catch (error) {
      logger.error("Unexpected sign-in exception", { correlationId, error });
      
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof TypeError && error.message.includes("fetch")) {
        setError("Network error. If on mobile data: 1) Toggle airplane mode on/off, 2) Restart browser, or 3) Use diagnostics below.");
        logger.error("Network/CORS error - likely Supabase URL config issue", { 
          correlationId, 
          currentUrl: window.location.origin,
          hint: "Supabase Dashboard > Auth > URL Configuration must include current domain in Redirect URLs"
        });
      } else {
        setError(`Sign-in failed. Reference: ${correlationId.slice(0, 8)}`);
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
        // B4: Log error with correlation ID
        logger.error("Sign-up error", { 
          correlationId, 
          status: error.status, 
          errorName: error.name,
          errorMessage: error.message 
        });
        
        // Enhanced error messages for mobile data issues
        if (error.message.includes("User already registered")) {
          setError("An account with this email already exists. Please sign in instead.");
        } else if (error.message.includes("Failed to fetch") || error.name === "TypeError") {
          setError("Network error. If on mobile data: 1) Toggle airplane mode on/off, 2) Restart browser, or 3) Use diagnostics below.");
          logger.error("CORS/Network failure detected", { 
            correlationId, 
            hint: "Check Supabase Auth URL configuration" 
          });
        } else if (error.status === 422) {
          setError("Invalid email or password format.");
        } else if (error.message.includes("timeout") || error.status === 504) {
          setError("Service unreachable. Try again shortly.");
        } else {
          setError(`Sign-up failed. Reference: ${correlationId.slice(0, 8)}`);
          logger.error("Unexpected sign-up error", { correlationId, error });
        }
        return;
      }

      logger.info("Sign-up successful", { correlationId, userEmail: data?.user?.email });

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
      
      setActiveTab("signin");
    } catch (error) {
      logger.error("Unexpected sign-up exception", { correlationId, error });
      
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof TypeError && error.message.includes("fetch")) {
        setError("Connection failed. Try: 1) Disable VPN/Data Saver, 2) Use WiFi, or 3) Run diagnostics below.");
        logger.error("Network/CORS error", { 
          correlationId, 
          hint: "Check preflight OPTIONS response" 
        });
      } else {
        setError(`Sign-up failed. Reference: ${correlationId.slice(0, 8)}`);
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

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: authRedirectTo("/auth"),
      });

      if (error) {
        setError(error.message);
        return;
      }

      toast({
        title: "Password reset sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (error) {
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