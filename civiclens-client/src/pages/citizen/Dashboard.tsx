import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, CheckCircle2, XCircle, Star, ArrowRight, Loader2, AlertCircle, RefreshCw, TrendingUp, Award, Activity, BarChart3, Users, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService, Report } from "@/services/reportsService";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";
import { CitizenHeader } from "@/components/layout/CitizenHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";

interface DashboardStats {
  total: number;
  active: number;
  resolved: number;
  closed: number;
}

const ACTIVE_STATUSES = [
  'received',
  'pending_classification',
  'classified',
  'assigned_to_department',
  'assigned_to_officer',
  'acknowledged',
  'in_progress'
];

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isOffline } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    active: 0,
    resolved: 0,
    closed: 0
  });
  const [userStats, setUserStats] = useState<{
    total_reports?: number;
    resolved_reports?: number;
    in_progress_reports?: number;
    active_reports?: number;
    avg_resolution_time_days?: number;
    reputation_score?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized status helpers
  const getStatusColor = useCallback((status: string): string => {
    const s = status.toLowerCase();
    if (s === 'resolved') return 'bg-green-500';
    if (s === 'closed') return 'bg-gray-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    return 'bg-amber-500';
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return CheckCircle2;
    if (s === 'closed' || s === 'rejected') return XCircle;
    return Clock;
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
    const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Invalid date';
    }
  }, []);

  const toLabel = useCallback((str: string): string => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }, []);

  // Calculate stats from all reports
  const calculateStats = useCallback((reportsList: Report[]): DashboardStats => {
    const total = reportsList.length;
    const active = reportsList.filter(r => 
      ACTIVE_STATUSES.includes(r.status.toLowerCase())
    ).length;
    const resolved = reportsList.filter(r => r.status.toLowerCase() === 'resolved').length;
    const closed = reportsList.filter(r => r.status.toLowerCase() === 'closed').length;

    return { total, active, resolved, closed };
  }, []);

  // Helper to extract error message from various error formats
  const extractErrorMessage = useCallback((err: any): string => {
    // Handle Pydantic validation errors (array of errors)
    if (Array.isArray(err.response?.data?.detail)) {
      const firstError = err.response.data.detail[0];
      if (typeof firstError === 'object' && firstError.msg) {
        return firstError.msg || 'Validation error occurred';
      }
      return err.response.data.detail[0]?.msg || 'Validation error occurred';
    }
    
    // Handle single validation error object
    if (err.response?.data?.detail && typeof err.response.data.detail === 'object') {
      if (err.response.data.detail.msg) {
        return err.response.data.detail.msg;
      }
      if (err.response.data.detail.message) {
        return err.response.data.detail.message;
      }
      // If it's an object, stringify it for debugging but show a user-friendly message
      return 'An error occurred while loading data. Please try again.';
    }
    
    // Handle string error messages
    if (typeof err.response?.data?.detail === 'string') {
      return err.response.data.detail;
    }
    
    // Handle network errors
    if (!err.response && (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    // Handle error message
    if (typeof err.message === 'string') {
      return err.message;
    }
    
    // Fallback
    return 'Unable to load dashboard data. Please try again.';
  }, []);

  // Load dashboard data with pagination support
  const loadDashboardData = useCallback(async (showToast = false) => {
    try {
      setError(null);
      
      // Fetch reports and user stats in parallel
      const [allReportsData, userStatsData] = await Promise.allSettled([
        reportsService.getMyReports({ limit: 100 }),
        userService.getMyStats().catch(() => null) // Don't fail if stats fail
      ]);
      
      // Handle reports
      if (allReportsData.status === 'fulfilled') {
        const fetchedReports = allReportsData.value.reports || [];
        setAllReports(fetchedReports);
        
        // Calculate stats from fetched reports
        const calculatedStats = calculateStats(fetchedReports);
        setStats(calculatedStats);
        
        // Show only recent 5 reports for dashboard
        setReports(fetchedReports.slice(0, 5));
      } else {
        throw allReportsData.reason;
      }
      
      // Handle user stats (optional - don't fail if unavailable)
      if (userStatsData.status === 'fulfilled' && userStatsData.value) {
        setUserStats(userStatsData.value);
      }
      
      if (showToast) {
        toast({
          title: "Dashboard Updated",
          description: "Your dashboard has been refreshed successfully.",
        });
      }
    } catch (err: any) {
      logger.error('Failed to load dashboard data:', err);
      
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      
      if (showToast || !loading) {
        toast({
          title: "Unable to Load Dashboard",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateStats, toast, loading, extractErrorMessage]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user, loadDashboardData]);

  // Memoized recent reports
  const recentReports = useMemo(() => reports.slice(0, 5), [reports]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

  // Loading state
  if (authLoading || (loading && !error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <CitizenHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <CitizenHeader />
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="p-8 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Unable to Load Dashboard</h3>
                <p className="text-muted-foreground mb-6">
                  {typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => loadDashboardData(true)} disabled={refreshing}>
                    {refreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      'Try Again'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/citizen/reports')}>
                    View Reports
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <CitizenHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section - Professional Portal Header */}
        <div className="mb-8">
          <Card className="p-6 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      Welcome back, {user?.full_name || 'Citizen'}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Manage your civic issue reports and track their resolution progress
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label="Refresh dashboard"
                  className="shrink-0"
                >
                  <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            
            {/* Offline indicator */}
            {isOffline && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>You are currently offline. Some features may be limited.</span>
              </div>
            )}
          </Card>
        </div>

        {/* Statistics Cards Grid - Professional Portal Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Reports Card */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                Total
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {userStats?.total_reports || stats.total || 0}
              </p>
              <p className="text-sm text-muted-foreground">Reports Submitted</p>
            </div>
          </Card>

          {/* Active Reports Card */}
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                Active
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {userStats?.active_reports || userStats?.in_progress_reports || stats.active || 0}
              </p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </Card>

          {/* Resolved Reports Card */}
          <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                Resolved
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {userStats?.resolved_reports || stats.resolved || 0}
              </p>
              <p className="text-sm text-muted-foreground">Successfully Resolved</p>
            </div>
          </Card>

          {/* Average Resolution Time Card */}
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Badge variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                Avg Time
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {userStats?.avg_resolution_time_days 
                  ? `${userStats.avg_resolution_time_days.toFixed(1)}d`
                  : stats.resolved > 0 
                    ? 'N/A'
                    : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Resolution Time</p>
            </div>
          </Card>
        </div>

        {/* Quick Actions & Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Reports Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Action Card */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">Submit New Report</h3>
                  <p className="text-sm text-muted-foreground">Report a civic issue in your area</p>
                </div>
                <Button 
                  onClick={() => navigate('/citizen/submit-report')}
                  size="lg"
                  className="shrink-0"
                  aria-label="Submit a new civic issue report"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Submit Report
              </Button>
            </div>
            </Card>

            {/* Recent Reports Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Recent Reports</h2>
                  <p className="text-sm text-muted-foreground">Track the status of your submitted reports</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    aria-label="Refresh reports"
                    className="sm:hidden"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/citizen/reports')}
                    className="text-sm"
                    aria-label="View all reports"
                  >
                    View All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Reports List */}
              {recentReports.length === 0 ? (
                <Card className="p-12">
                  <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <FileText className="w-16 h-16 mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">No Reports Yet</h3>
                    <p className="text-muted-foreground mb-6 text-base">
                      You have not submitted any reports yet. Start by submitting your first civic issue report.
                </p>
                    <Button 
                      onClick={() => navigate('/citizen/submit-report')}
                      aria-label="Submit your first report"
                    >
                  <Plus className="w-4 h-4 mr-2" />
                      Submit Your First Report
                </Button>
                  </div>
              </Card>
            ) : (
                <div className="space-y-4" role="list" aria-label="Recent reports">
                  {recentReports.map((report) => {
                  const StatusIcon = getStatusIcon(report.status);
                  const statusColor = getStatusColor(report.status);
                  
                  return (
                      <Card 
                        key={report.id} 
                        className="p-6 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
                        role="listitem"
                        onClick={() => navigate(`/citizen/track/${report.id}`)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div 
                              className={`w-12 h-12 rounded-xl ${statusColor} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform`}
                              aria-hidden="true"
                            >
                              <StatusIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs font-mono">{report.report_number}</Badge>
                                {report.severity && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {report.severity}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {report.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                {report.task?.officer && (
                                  <div className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    <span>{report.task.officer.full_name || 'Officer Assigned'}</span>
                                  </div>
                                )}
                                {report.department && (
                                  <div className="flex items-center gap-1">
                                    <Target className="w-3 h-3" />
                                    <span>{report.department.name}</span>
                          </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Updated {formatDate(report.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            className={`${statusColor} ml-2 shrink-0`} 
                            aria-label={`Status: ${toLabel(report.status)}`}
                          >
                            {toLabel(report.status)}
                          </Badge>
                        </div>
                        <div className="flex gap-2 pt-4 border-t">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/citizen/track/${report.id}`);
                            }}
                            aria-label={`${report.status.toLowerCase() === "resolved" ? 'View details' : 'Track'} report ${report.report_number}`}
                          >
                        {report.status.toLowerCase() === "resolved" ? (
                          <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                View Details
                          </>
                        ) : (
                              <>
                                Track Report <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            )}
                          </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          {/* Sidebar - Reputation & Stats */}
          <div className="space-y-6">
            {/* Reputation Score Card */}
            {user?.profile_completion === 'complete' ? (
              <Card className="p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Reputation Score</h3>
                </div>
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="text-5xl font-bold text-amber-600 dark:text-amber-400 mb-3" aria-label={`Reputation score: ${userStats?.reputation_score ?? user?.reputation_score ?? 0}`}>
                    {userStats?.reputation_score ?? user?.reputation_score ?? 0}
                  </div>
                  <div className="flex justify-center gap-1 mb-2" role="img" aria-label={`${Math.floor(((userStats?.reputation_score ?? user?.reputation_score ?? 0) / 100))} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((i) => {
                      const reputationScore = userStats?.reputation_score ?? user?.reputation_score ?? 0;
                      return (
                      <Star 
                        key={i} 
                          className={`w-5 h-5 transition-all ${i <= Math.floor(reputationScore / 100) ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300'}`}
                          aria-hidden="true"
                      />
                      );
                    })}
                  </div>
                  <p className="text-sm text-muted-foreground">Reputation Points</p>
                </div>
                <div className="space-y-3 pt-4 border-t border-amber-200 dark:border-amber-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Total Reports
                    </span>
                    <span className="font-semibold text-foreground">{userStats?.total_reports ?? user?.total_reports ?? stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{userStats?.resolved_reports ?? stats.resolved}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      In Progress
                    </span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{userStats?.in_progress_reports ?? userStats?.active_reports ?? stats.active}</span>
                  </div>
                  {userStats?.avg_resolution_time_days !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Avg Resolution
                      </span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">{userStats.avg_resolution_time_days.toFixed(1)} days</span>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Complete Your Profile</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete your profile to unlock reputation points and track your community impact.
                </p>
                <Button 
                  onClick={() => navigate('/citizen/profile')} 
                  className="w-full"
                  aria-label="Go to profile to complete your account"
                >
                  Complete Profile
                </Button>
              </Card>
            )}

            {/* Community Impact Card */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground">Community Impact</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {stats.resolved > 0 
                  ? `Your reports have helped resolve ${stats.resolved} issue${stats.resolved !== 1 ? 's' : ''} in your community.`
                  : 'Start reporting issues to make a positive impact in your community.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-primary font-medium pt-3 border-t border-primary/20">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>
                  {stats.total > 0 ? 'Thank you for your contributions' : 'Submit your first report today'}
                </span>
              </div>
            </Card>

            {/* Quick Stats Summary */}
            {stats.total > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground">Quick Stats</h4>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                    </span>
                  </div>
                  {stats.closed > 0 && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Closed</span>
                      <span className="text-lg font-bold text-gray-600 dark:text-gray-400">
                        {stats.closed}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;

