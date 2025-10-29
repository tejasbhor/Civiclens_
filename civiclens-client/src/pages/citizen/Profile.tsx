import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Mail, MapPin, Phone, LogOut, Edit, Loader2, AlertCircle, Shield, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { Switch } from "@/components/ui/switch";

const CitizenProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout: authLogout, refreshUser, loading: authLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    reputation_score: 0,
    total_reports: 0,
    reports_resolved: 0,
    total_validations: 0,
    helpful_validations: 0
  });
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    primary_address: "",
    bio: "",
    push_notifications: true,
    sms_notifications: true,
    email_notifications: true
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    } else if (user) {
      loadProfileData();
    }
  }, [authLoading, user, navigate]);

  const loadProfileData = () => {
    if (!user) return;
    
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

    // Set stats from user
    setStats({
      reputation_score: user.reputation_score || 0,
      total_reports: user.total_reports || 0,
      reports_resolved: 0,
      total_validations: 0,
      helpful_validations: 0
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
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
      
      // Add notification preferences
      updateData.push_notifications = formData.push_notifications;
      updateData.sms_notifications = formData.sms_notifications;
      updateData.email_notifications = formData.email_notifications;

      await authService.updateProfile(updateData);
      await refreshUser();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Update Failed",
        description: error.response?.data?.detail || "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/citizen/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">My Profile</h1>
            <p className="text-xs text-muted-foreground">Manage your account details</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{user.full_name || 'Citizen'}</h2>
              <p className="text-muted-foreground">{user.phone}</p>
              {user.email && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
              <Shield className="w-4 h-4" />
              {user.profile_completion === 'complete' ? 'Complete Account' : 
               user.profile_completion === 'basic' ? 'Basic Account' : 'Minimal Account'}
            </div>
          </div>

          {/* Stats */}
          {user.profile_completion === 'complete' ? (
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.total_reports}</div>
                <div className="text-sm text-muted-foreground">Reports</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.reports_resolved}</div>
                <div className="text-sm text-muted-foreground">Resolved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{stats.reputation_score}</div>
                <div className="text-sm text-muted-foreground">Reputation</div>
              </div>
            </div>
          ) : (
            <div className="pt-6 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>Upgrade to Complete Account</strong>
                </p>
                <p className="text-sm text-blue-700">
                  Add your name and email to unlock reputation points and track your community impact!
                </p>
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
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? (
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
                }} variant="outline" className="flex-1" disabled={loading}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Notification Preferences */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
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
                <p className="text-sm text-muted-foreground">Receive SMS updates on your phone</p>
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
                  {user.email ? 'Receive updates via email' : 'Add email to enable'}
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

        {/* Logout */}
        <Card className="p-6">
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default CitizenProfile;
