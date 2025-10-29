import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";

const OfficerLogin = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!phone || !password) {
      toast({
        title: "Missing Information",
        description: "Please enter both Phone Number and Password",
        variant: "destructive"
      });
      return;
    }

    // Normalize phone number - remove spaces, dashes, and handle country code
    let normalizedPhone = phone.replace(/[\s-]/g, '');
    
    // If starts with +91, keep it as is (backend accepts this)
    // If starts with 91 (without +), add +
    // If 10 digits, add +91
    if (normalizedPhone.startsWith('+91')) {
      // Already has +91, keep as is
    } else if (normalizedPhone.startsWith('91') && normalizedPhone.length === 12) {
      // Has 91 prefix but no +, add it
      normalizedPhone = '+' + normalizedPhone;
    } else if (/^\d{10}$/.test(normalizedPhone)) {
      // Just 10 digits, add +91
      normalizedPhone = '+91-' + normalizedPhone;
    } else {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid phone number (10 digits or with +91)",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔐 Attempting officer login');
      console.log('   Original phone:', phone);
      console.log('   Normalized phone:', normalizedPhone);
      
      // Call authService.login to get tokens
      const response = await authService.login(normalizedPhone, password);
      
      console.log('✅ Login response received:', {
        hasAccessToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        role: response.role
      });
      
      // Pass tokens to AuthContext login
      await login(response.access_token, response.refresh_token);
      
      console.log('✅ Tokens stored, navigating to dashboard');
      
      toast({
        title: "Login Successful!",
        description: "Welcome back, Officer",
      });
      
      navigate('/officer/dashboard');
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let errorMessage = "Invalid credentials. Please try again.";
      
      if (error.response?.status === 401) {
        errorMessage = error.response?.data?.detail || "Invalid phone number or password";
      } else if (error.response?.status === 429) {
        errorMessage = "Too many login attempts. Please try again later.";
      } else if (error.response?.status === 423) {
        errorMessage = "Account is locked. Please contact administrator.";
      } else if (error.message === 'Network Error') {
        errorMessage = "Cannot connect to server. Please check if backend is running.";
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
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210 or +91-9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter 10 digits or with +91 country code
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-input" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Button variant="link" className="p-0 h-auto text-sm">
                Forgot Password?
              </Button>
            </div>

            <Button onClick={handleLogin} className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Shield className="w-4 h-4 inline mr-1" />
              Secure authentication for authorized personnel only
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
