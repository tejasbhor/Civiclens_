import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, MapPin, Phone, LogOut, Edit, Loader2, AlertCircle, Shield, Bell, CheckCircle2, XCircle, RefreshCw, Award, Star, TrendingUp, Activity, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { userService } from "@/services/userService";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { CitizenHeader } from "@/components/layout/CitizenHeader";
import { logger } from "@/lib/logger";

const CitizenProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout: authLogout, refreshUser, loading: authLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userStats, setUserStats] = useState<{
    total_reports?: number;
    resolved_reports?: number;
    in_progress_reports?: number;
    active_reports?: number;
    avg_resolution_time_days?: number;
    reputation_score?: number;
  } | null>(null);
  const [preferences, setPreferences] = useState({
    theme: 'auto' as 'light' | 'dark' | 'auto',
    density: 'comfortable' as 'comfortable' | 'compact'
  });
  const [verificationStatus, setVerificationStatus] = useState<{
    email: { value: string | null; verified: boolean; last_sent_at: string | null };
    phone: { value: string | null; verified: boolean; last_sent_at: string | null };
  } | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [phoneOTP, setPhoneOTP] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    primary_address: "",
    bio: "",
    push_notifications: true,
    sms_notifications: true,
    email_notifications: true
  });

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    
    try {
    // Set form data from user
    setFormData({
      full_name: user.full_name || "",
      email: user.email || "",
      primary_address: "",
      bio: "",
      push_notifications: true,
      sms_notifications: true,
      email_notifications: true
    });

      // Load user stats, preferences, and verification status in parallel
      const [statsData, prefsData, verificationData] = await Promise.allSettled([
        userService.getMyStats().catch(() => null),
        userService.getPreferences().catch(() => null),
        userService.getVerificationStatus().catch(() => null)
      ]);

      if (statsData.status === 'fulfilled' && statsData.value) {
        setUserStats(statsData.value);
      }

      if (prefsData.status === 'fulfilled' && prefsData.value) {
        setPreferences(prefsData.value);
      }

      if (verificationData.status === 'fulfilled' && verificationData.value) {
        setVerificationStatus(verificationData.value);
      }
    } catch (error) {
      logger.error('Failed to load profile data:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    } else if (user) {
      loadProfileData();
    }
  }, [authLoading, user, navigate, loadProfileData]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Prepare update data (only send non-empty fields)
      const updateData: any = {};
      if (formData.full_name && formData.full_name !== user?.full_name) {
        updateData.full_name = formData.full_name;
      }
      if (formData.email && formData.email !== user?.email) {
        updateData.email = formData.email;
      }
      if (formData.primary_address) {
        updateData.primary_address = formData.primary_address;
      }
      if (formData.bio) {
        updateData.bio = formData.bio;
      }
      
      // Update profile and preferences in parallel
      await Promise.all([
        userService.updateProfile(updateData),
        userService.updatePreferences(preferences)
      ]);
      
      await refreshUser();
      await loadProfileData();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      logger.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmailVerification = async () => {
    try {
      setVerifyingEmail(true);
      const result = await userService.sendEmailVerification();
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
      if (result.debug_token) {
        setEmailToken(result.debug_token);
      }
      await loadProfileData();
    } catch (error: any) {
      logger.error('Failed to send email verification:', error);
      toast({
        title: "Failed to Send Email",
        description: error.response?.data?.detail || "Failed to send verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailToken) {
      toast({
        title: "Token Required",
        description: "Please enter the verification token from your email.",
        variant: "destructive"
      });
      return;
    }
    try {
      setVerifyingEmail(true);
      await userService.verifyEmail(emailToken);
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully.",
      });
      setEmailToken("");
      await loadProfileData();
    } catch (error: any) {
      logger.error('Failed to verify email:', error);
      toast({
        title: "Verification Failed",
        description: error.response?.data?.detail || "Invalid or expired token. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleSendPhoneVerification = async () => {
    try {
      setVerifyingPhone(true);
      const result = await userService.sendPhoneVerification();
      toast({
        title: "Verification OTP Sent",
        description: "Please check your phone for the OTP.",
      });
      if (result.debug_otp) {
        setPhoneOTP(result.debug_otp);
      }
      await loadProfileData();
    } catch (error: any) {
      logger.error('Failed to send phone verification:', error);
      toast({
        title: "Failed to Send OTP",
        description: error.response?.data?.detail || "Failed to send verification OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneOTP) {
      toast({
        title: "OTP Required",
        description: "Please enter the OTP sent to your phone.",
        variant: "destructive"
      });
      return;
    }
    try {
      setVerifyingPhone(true);
      await userService.verifyPhone(phoneOTP);
      toast({
        title: "Phone Verified",
        description: "Your phone number has been verified successfully.",
      });
      setPhoneOTP("");
      await loadProfileData();
    } catch (error: any) {
      logger.error('Failed to verify phone:', error);
      toast({
        title: "Verification Failed",
        description: error.response?.data?.detail || "Invalid or expired OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authLogout();
      navigate("/citizen/login");
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      navigate("/citizen/login");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <CitizenHeader />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/citizen/dashboard')}
            className="mb-4"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground">Manage your account details, preferences, and verification</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{user.full_name || 'Citizen'}</h2>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {user.phone}
                  </p>
              {user.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </p>
              )}
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" disabled={loading}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Account Type Badge */}
          <div className="mb-4">
                <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                  <Shield className="w-3 h-3 mr-1" />
              {user.profile_completion === 'complete' ? 'Complete Account' : 
               user.profile_completion === 'basic' ? 'Basic Account' : 'Minimal Account'}
                </Badge>
          </div>

              {/* Stats Grid */}
              {userStats && (
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                      <FileText className="w-5 h-5" />
                      {userStats.total_reports || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Reports</div>
              </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-5 h-5" />
                      {userStats.resolved_reports || 0}
              </div>
                    <div className="text-sm text-muted-foreground mt-1">Resolved</div>
              </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <Award className="w-5 h-5" />
                      {userStats.reputation_score || user?.reputation_score || 0}
            </div>
                    <div className="text-sm text-muted-foreground mt-1">Reputation</div>
              </div>
            </div>
          )}
        </Card>

        {/* Profile Details */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Profile Information</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="flex items-center gap-2 mt-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2 mt-2">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <Input
                  id="phone"
                  value={user.phone}
                  disabled
                  className="flex-1 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Phone number cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="email">Email (Optional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  placeholder="your.email@example.com"
                  className="flex-1"
                />
              </div>
              {!user.email && (
                <p className="text-xs text-blue-600 mt-1">Add email to unlock more features</p>
              )}
            </div>

            <div>
              <Label htmlFor="address">Primary Address (Optional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <Input
                  id="address"
                  value={formData.primary_address}
                  onChange={(e) => setFormData({ ...formData, primary_address: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Your primary address"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio (Optional)</Label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background disabled:opacity-50"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSave} className="flex-1" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button onClick={() => {
                  setIsEditing(false);
                  loadProfileData();
                }} variant="outline" className="flex-1" disabled={saving}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Verification Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Account Verification
          </h3>
          
          <div className="space-y-4">
            {/* Phone Verification */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <Label className="text-base font-medium">Phone Number</Label>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                </div>
                {verificationStatus?.phone.verified ? (
                  <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
              </div>
              {!verificationStatus?.phone.verified && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter OTP"
                      value={phoneOTP}
                      onChange={(e) => setPhoneOTP(e.target.value)}
                      className="flex-1"
                      maxLength={6}
                    />
                    <Button 
                      onClick={handleVerifyPhone} 
                      disabled={verifyingPhone || !phoneOTP}
                      size="sm"
                    >
                      {verifyingPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSendPhoneVerification}
                    disabled={verifyingPhone}
                    className="w-full"
                  >
                    {verifyingPhone ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Send Verification OTP
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Email Verification */}
            {formData.email && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Email Address</Label>
                      <p className="text-sm text-muted-foreground">{formData.email}</p>
                    </div>
                  </div>
                  {verificationStatus?.email.verified ? (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </div>
                {!verificationStatus?.email.verified && (
                  <div className="space-y-2 mt-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter verification token"
                        value={emailToken}
                        onChange={(e) => setEmailToken(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleVerifyEmail} 
                        disabled={verifyingEmail || !emailToken}
                        size="sm"
                      >
                        {verifyingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSendEmailVerification}
                      disabled={verifyingEmail}
                      className="w-full"
                    >
                      {verifyingEmail ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Verification Email
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preferences Card */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Preferences
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <select
                    id="theme"
                    value={preferences.theme}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as 'light' | 'dark' | 'auto' })}
                    disabled={!isEditing}
                    className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background disabled:opacity-50"
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="density">Density</Label>
                  <select
                    id="density"
                    value={preferences.density}
                    onChange={(e) => setPreferences({ ...preferences, density: e.target.value as 'comfortable' | 'compact' })}
                    disabled={!isEditing}
                    className="w-full mt-2 px-3 py-2 rounded-md border border-input bg-background disabled:opacity-50"
                  >
                    <option value="comfortable">Comfortable</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Notification Preferences */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
              <Switch
                id="push"
                checked={formData.push_notifications}
                onCheckedChange={(checked) => setFormData({ ...formData, push_notifications: checked })}
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive SMS updates</p>
              </div>
              <Switch
                id="sms"
                checked={formData.sms_notifications}
                onCheckedChange={(checked) => setFormData({ ...formData, sms_notifications: checked })}
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notif">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                      {user.email ? 'Receive email updates' : 'Add email to enable'}
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={formData.email_notifications}
                onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                disabled={!isEditing || !user.email}
              />
            </div>
          </div>
        </Card>

            {/* Additional Stats */}
            {userStats && userStats.avg_resolution_time_days !== undefined && (
              <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {userStats.avg_resolution_time_days.toFixed(1)} days
                    </span>
                  </div>
                  {userStats.in_progress_reports !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        In Progress
                      </span>
                      <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {userStats.in_progress_reports}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}

        {/* Logout */}
        <Card className="p-6">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenProfile;
