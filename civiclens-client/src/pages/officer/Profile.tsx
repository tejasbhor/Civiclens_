import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, User, Mail, Phone, Shield, Calendar, Star,
  LogOut, Loader2, AlertCircle, TrendingUp, Award, CheckCircle2,
  RefreshCw, Activity, Timer, FileText, Users, BarChart3, Target,
  AlertTriangle, Edit, KeyRound, Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService, OfficerStats } from "@/services/officerService";
import { OfficerHeader } from "@/components/layout/OfficerHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";

const OfficerProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout, loading: authLoading } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map backend capacity_level to frontend values
  const getCapacityLevelDisplay = useCallback((level: string | undefined): string => {
    if (!level) return 'unknown';
    const l = level.toLowerCase();
    // Backend returns: "low", "medium", "high"
    // Frontend expects: "available", "moderate", "high", "overloaded"
    if (l === 'low') return 'available';
    if (l === 'medium') return 'moderate';
    if (l === 'high') return 'high';
    return l;
  }, []);

  const capacityLevel = getCapacityLevelDisplay(stats?.capacity_level);

  // Extract error message helper
  const extractErrorMessage = useCallback((error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        return detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      }
      if (typeof detail === 'object') {
        return detail.msg || detail.message || JSON.stringify(detail);
    }
      return detail;
    }
    if (error?.message) return error.message;
    if (error?.isNetworkError || error?.code === 'ERR_NETWORK') {
      return 'Network error. Please check your connection.';
    }
    return 'An unexpected error occurred. Please try again.';
  }, []);

  const loadProfileData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      logger.debug(`Loading profile data for officer ${user.id}`);

      // Fetch profile and stats in parallel
      const [profileData, statsData] = await Promise.allSettled([
        officerService.getCurrentOfficer(),
        officerService.getOfficerStats(user.id)
      ]);

      // Handle profile
      if (profileData.status === 'fulfilled') {
        logger.debug('Profile data loaded:', profileData.value);
        setProfile(profileData.value);
      } else {
        logger.error('Failed to load profile:', profileData.reason);
        setError(extractErrorMessage(profileData.reason));
      }

      // Handle stats
      if (statsData.status === 'fulfilled') {
        logger.debug('Stats data loaded:', statsData.value);
        setStats(statsData.value);
      } else {
        logger.error('Failed to load stats:', statsData.reason);
        if (!error) {
          setError(extractErrorMessage(statsData.reason));
        }
      }
    } catch (err: any) {
      logger.error('Profile load error:', err);
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      toast({
        title: "Failed to Load Profile",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, extractErrorMessage, toast, error]);

  // Initial load
  useEffect(() => {
    if (user && !authLoading) {
      loadProfileData();
    }
  }, [user, authLoading, loadProfileData]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Profile data updated successfully."
    });
  }, [loadProfileData, toast]);

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
    navigate('/');
  };

  const formatDate = useCallback((dateString: string): string => {
    try {
    const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const toLabel = useCallback((str: string): string => {
    return str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  }, []);

  // Loading state
  if (authLoading || (loading && !profile && !stats && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !profile && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <OfficerHeader onRefresh={handleRefresh} refreshing={refreshing} />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Failed to Load Profile</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
            <Button onClick={loadProfileData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
            </Button>
            <Button variant="outline" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <OfficerHeader onRefresh={handleRefresh} refreshing={refreshing} />

      {/* Connection Status Banner */}
      {!isBackendReachable && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/officer/dashboard')}
              aria-label="Back to Dashboard"
            >
            <ArrowLeft className="w-5 h-5" />
          </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">My Profile</h1>
              <p className="text-muted-foreground">
                View and manage your officer profile and performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10 border-secondary/30">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {stats?.full_name || profile?.full_name || user?.full_name || 'Officer'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {stats?.employee_id && (
                  <Badge variant="outline" className="font-mono">
                    ID: {stats.employee_id}
                  </Badge>
                )}
                {stats?.department_name && (
                  <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30">
                    <Users className="w-3 h-3 mr-1" />
                    {stats.department_name}
                  </Badge>
                )}
                {profile?.role && (
                  <Badge variant="outline">
                    {toLabel(profile.role)}
                  </Badge>
                )}
                {profile?.phone_verified && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {profile?.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span>{profile.email}</span>
            </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    <span>{profile.phone}</span>
          </div>
                )}
                {profile?.created_at && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(profile.created_at)}</span>
            </div>
                )}
            </div>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Statistics */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Performance Statistics</h3>
              </div>
          
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg border border-blue-200/50">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {stats?.total_reports || 0}
                  </div>
              <div className="text-sm text-muted-foreground">Total Handled</div>
            </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg border border-green-200/50">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {stats?.resolved_reports || 0}
                  </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg border border-amber-200/50">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {stats?.active_reports || 0}
                  </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200/50">
                  <div className="text-3xl font-bold text-foreground mb-1">
                    {stats?.in_progress_reports || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
          </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Avg. Resolution Time</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {stats?.avg_resolution_time_days && stats.avg_resolution_time_days > 0
                  ? `${stats.avg_resolution_time_days.toFixed(1)} days`
                      : 'N/A'}
              </span>
            </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Workload Capacity</span>
                  </div>
                  <Badge 
                    variant="outline"
                    className={
                      capacityLevel === 'available' ? 'bg-green-50 text-green-700 border-green-200' :
                      capacityLevel === 'moderate' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      capacityLevel === 'high' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {toLabel(capacityLevel)}
                  </Badge>
            </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Workload Score</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {(stats?.workload_score || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                      className={`h-full transition-all ${
                        capacityLevel === 'available' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        capacityLevel === 'moderate' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                        capacityLevel === 'high' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                      style={{
                        width: `${Math.min((stats?.workload_score || 0) * 100, 100)}%`
                      }}
                  />
              </div>
            </div>
          </div>
        </Card>

        {/* Account Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <User className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">Account Information</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Account Status</span>
                      <p className="text-xs text-muted-foreground">Your account activation status</p>
                    </div>
                  </div>
                  <Badge variant={profile?.is_active ? "default" : "destructive"}>
                    {profile?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
                
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Phone Verification</span>
                      <p className="text-xs text-muted-foreground">Phone number verification status</p>
                    </div>
              </div>
                  <Badge variant={profile?.phone_verified ? "default" : "outline"}>
                    {profile?.phone_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
                
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Email Verification</span>
                      <p className="text-xs text-muted-foreground">Email address verification status</p>
                    </div>
              </div>
                  <Badge variant={profile?.email_verified ? "default" : "outline"}>
                    {profile?.email_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
                
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Star className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium text-foreground">Reputation Score</span>
                      <p className="text-xs text-muted-foreground">Your overall reputation points</p>
              </div>
            </div>
                <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-foreground">{profile?.reputation_score || 0}</span>
                    <span className="text-xs text-muted-foreground">points</span>
                  </div>
                </div>
                
                {profile?.created_at && (
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium text-foreground">Member Since</span>
                        <p className="text-xs text-muted-foreground">Account creation date</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatDate(profile.created_at)}
                    </span>
                  </div>
                )}
                
                {profile?.last_login && (
                  <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <span className="text-sm font-medium text-foreground">Last Login</span>
                        <p className="text-xs text-muted-foreground">Most recent login time</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatDate(profile.last_login)}
                    </span>
              </div>
            )}
          </div>
        </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">Quick Actions</h4>
              </div>
        <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Profile editing will be available in a future update.",
                    });
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Password change will be available in a future update.",
                    });
                  }}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
            Change Password
          </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/officer/tasks')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View All Tasks
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/officer/dashboard')}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            </Card>

            {/* Workload Status */}
            {stats && (
              <Card className="p-6 bg-gradient-to-br from-secondary/10 via-secondary/5 to-accent/10 border-secondary/20">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  <h4 className="font-semibold text-foreground">Workload Status</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {capacityLevel === 'available' && 
                    'You have capacity for more tasks. Great work maintaining efficiency!'}
                  {capacityLevel === 'moderate' && 
                    'You have a balanced workload. Keep up the excellent work!'}
                  {capacityLevel === 'high' && 
                    'You have a high workload. Focus on completing current tasks before taking on more.'}
                  {capacityLevel === 'overloaded' && 
                    'You are currently overloaded. Please prioritize critical tasks and consider requesting assistance.'}
                  {(capacityLevel === 'unknown' || !stats?.capacity_level) && 
                    'Workload status will appear here once you start receiving tasks.'}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                  <Activity className="w-4 h-4" />
                  <span>
                    {capacityLevel === 'available' ? 'Ready for Tasks' :
                     capacityLevel === 'moderate' ? 'Balanced Workload' :
                     capacityLevel === 'high' ? 'High Workload' :
                     capacityLevel === 'overloaded' ? 'Overloaded' :
                     'No Data'}
                  </span>
                </div>
              </Card>
            )}

            {/* Logout */}
            <Card className="p-6 border-destructive/20">
          <Button 
            variant="destructive" 
                className="w-full"
            onClick={handleLogout}
          >
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

export default OfficerProfile;
