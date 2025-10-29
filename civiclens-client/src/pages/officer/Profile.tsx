import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, User, Mail, Phone, Shield, Calendar, Star,
  LogOut, Loader2, AlertCircle, TrendingUp, Award, CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";

const OfficerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('👤 Loading profile data for user:', user!.id);

      // Fetch current user profile
      const profileData = await officerService.getCurrentOfficer();
      console.log('✅ Profile data received:', profileData);
      setProfile(profileData);

      // Fetch officer stats
      const statsData = await officerService.getOfficerStats(user!.id);
      console.log('✅ Stats data received:', statsData);
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ Failed to load profile:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to load profile data';
      setError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    navigate('/officer/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Profile</h3>
          <p className="text-muted-foreground mb-4">{error || 'Unable to load profile data'}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={loadProfileData}>
              <Loader2 className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/officer/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">Officer Information</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{profile.full_name || 'Officer'}</h2>
              <p className="text-muted-foreground mb-2">{stats.employee_id || 'N/A'}</p>
              <div className="flex items-center gap-2">
                <Badge>{stats.department_name || 'Department'}</Badge>
                <Badge variant="outline">{profile.role?.replace('_', ' ').toUpperCase()}</Badge>
                {profile.phone_verified && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.email || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.role?.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Joined {formatDate(profile.created_at)}</span>
            </div>
          </div>
        </Card>

        {/* Performance Stats */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Performance Statistics</h3>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-1">{stats.total_reports || 0}</div>
              <div className="text-sm text-muted-foreground">Total Handled</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-1">{stats.resolved_reports || 0}</div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-foreground mb-1">{stats.active_reports || 0}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg. Resolution Time</span>
              <span className="font-semibold">
                {stats.avg_resolution_time_days > 0 
                  ? `${stats.avg_resolution_time_days.toFixed(1)} days`
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Workload Capacity</span>
              <span className="font-semibold capitalize">{stats.capacity_level}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Workload Score</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      stats.capacity_level === 'overloaded' ? 'bg-red-500' :
                      stats.capacity_level === 'high' ? 'bg-amber-500' :
                      stats.capacity_level === 'moderate' ? 'bg-blue-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stats.workload_score * 100, 100)}%` }}
                  />
                </div>
                <span className="font-semibold text-xs">{(stats.workload_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Information */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Account Status</span>
              </div>
              <Badge variant={profile.is_active ? "default" : "destructive"}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Phone Verification</span>
              </div>
              <Badge variant={profile.phone_verified ? "default" : "outline"}>
                {profile.phone_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Email Verification</span>
              </div>
              <Badge variant={profile.email_verified ? "default" : "outline"}>
                {profile.email_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Reputation Score</span>
              </div>
              <span className="font-semibold">{profile.reputation_score || 0} points</span>
            </div>
            {profile.last_login && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Last Login</span>
                </div>
                <span className="text-sm font-medium">{formatDate(profile.last_login)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <User className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Shield className="w-4 h-4 mr-2" />
            Change Password
          </Button>
          <Button 
            variant="destructive" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OfficerProfile;
