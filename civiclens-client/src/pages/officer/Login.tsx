import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { isOfficer, isCitizen } from "@/utils/authHelpers";

const OfficerLogin = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (isOfficer(user.role)) {
        navigate('/officer/dashboard', { replace: true });
      } else if (isCitizen(user.role)) {
        // Citizen trying to access officer portal - redirect to citizen dashboard
        navigate('/citizen/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  const normalizePhoneNumber = useCallback((phone: string): string => {
    // Remove all spaces and dashes
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // Backend pattern: ^\+?[1-9]\d{1,14}$
    // Expected format: +919876543210 (no dashes, no spaces)
    
    // If already starts with +91, remove any remaining dashes/spaces
    if (cleaned.startsWith('+91')) {
      return cleaned;
    }
    
    // If starts with 91 (12 digits total), add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    // If 10 digits, add +91 prefix
    if (/^\d{10}$/.test(cleaned)) {
      return '+91' + cleaned;
    }
    
    // Return cleaned version (will be validated)
    return cleaned;
  }, []);

  const validatePhoneNumber = useCallback((phone: string): { valid: boolean; error?: string } => {
    // Backend pattern: ^\+?[1-9]\d{1,14}$
    const pattern = /^\+?[1-9]\d{1,14}$/;
    
    if (!phone || phone.trim().length === 0) {
      return { valid: false, error: "Phone number is required" };
    }
    
    const normalized = normalizePhoneNumber(phone);
    
    if (!pattern.test(normalized)) {
      return { 
        valid: false, 
        error: "Please enter a valid phone number (10 digits or with +91 country code)" 
      };
    }
    
    return { valid: true };
  }, [normalizePhoneNumber]);

  const validatePassword = useCallback((password: string): { valid: boolean; error?: string } => {
    if (!password || password.trim().length === 0) {
      return { valid: false, error: "Password is required" };
    }
    
    if (password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters" };
    }
    
    return { valid: true };
  }, []);

  // Real-time validation
  useEffect(() => {
    if (phone.length > 0) {
      const validation = validatePhoneNumber(phone);
      setPhoneError(validation.valid ? null : validation.error || null);
    } else {
      setPhoneError(null);
    }
  }, [phone, validatePhoneNumber]);

  useEffect(() => {
    if (password.length > 0) {
      const validation = validatePassword(password);
      setPasswordError(validation.valid ? null : validation.error || null);
    } else {
      setPasswordError(null);
    }
  }, [password, validatePassword]);

  const handleLogin = async () => {
    // Clear previous errors
    setPhoneError(null);
    setPasswordError(null);

    // Validate inputs
    const phoneValidation = validatePhoneNumber(phone);
    const passwordValidation = validatePassword(password);

    if (!phoneValidation.valid || !passwordValidation.valid) {
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || null);
      }
      if (!passwordValidation.valid) {
        setPasswordError(passwordValidation.error || null);
      }
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form before submitting.",
        variant: "destructive"
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone);

    try {
      setLoading(true);
      
      // Call authService.login to get tokens
      const response = await authService.login(normalizedPhone, password);
      
      // Pass tokens to AuthContext login - this will fetch user data
      await login(response.access_token, response.refresh_token);
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_me');
      }
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: "Welcome to the Officer Portal",
      });
      
      // The useEffect hook will handle redirect when user state is updated
      // No need to navigate here - let the useEffect handle it
    } catch (error: any) {
      let errorMessage = "Invalid credentials. Please verify your phone number and password and try again.";
      
      if (error.response?.status === 401) {
        errorMessage = error.response?.data?.detail || "Invalid phone number or password. Please check your credentials and try again.";
        setPasswordError("Invalid password");
      } else if (error.response?.status === 429) {
        errorMessage = "Too many login attempts. Please wait a few minutes before trying again.";
      } else if (error.response?.status === 423) {
        errorMessage = "Your account has been temporarily locked. Please contact your administrator for assistance.";
      } else if (error.response?.status === 422) {
        errorMessage = "Invalid phone number format. Please enter a valid phone number.";
        setPhoneError("Invalid phone number format");
      } else if (error.message === 'Network Error' || error.isNetworkError) {
        errorMessage = "Unable to connect to the server. Please check your internet connection and try again.";
      }
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Officer Login</h1>
              <p className="text-xs text-muted-foreground">CivicLens Portal</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Officer Portal</h2>
            <p className="text-muted-foreground">Sign in to manage tasks and resolve issues</p>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="mt-2">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    +91
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => {
                      // Only allow digits
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(value);
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    className={`pl-12 ${phoneError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    aria-required="true"
                    aria-invalid={!!phoneError}
                    aria-describedby={phoneError ? "phone-error" : "phone-help"}
                  />
                </div>
                {phoneError ? (
                  <div id="phone-error" className="flex items-center gap-1 mt-1.5 text-xs text-destructive" role="alert">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{phoneError}</span>
                  </div>
                ) : (
                  <p id="phone-help" className="text-xs text-muted-foreground mt-1.5">
                    Enter your 10-digit phone number
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2">
                Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className={`pr-10 ${passwordError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  aria-required="true"
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? "password-error" : undefined}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {passwordError && (
                <div id="password-error" className="flex items-center gap-1 mt-1.5 text-xs text-destructive" role="alert">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="rounded border-input cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                  Remember me
                </span>
              </label>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => {
                  toast({
                    title: "Password Reset",
                    description: "Please contact your administrator to reset your password.",
                  });
                }}
                disabled={loading}
              >
                Forgot Password?
              </Button>
            </div>

            <Button 
              onClick={handleLogin} 
              className="w-full" 
              size="lg" 
              disabled={loading || !!phoneError || !!passwordError || !phone || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            <div className="bg-muted/50 p-4 rounded-lg border border-muted">
              <div className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground mb-1">Secure Portal</p>
                  <p className="text-xs text-muted-foreground">
                    This portal is restricted to authorized government personnel only. 
                    All access attempts are logged and monitored.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <footer className="border-t bg-card/50 py-6 text-center text-sm text-muted-foreground">
        © 2025 CivicLens. All rights reserved.
      </footer>
    </div>
  );
};

export default OfficerLogin;
