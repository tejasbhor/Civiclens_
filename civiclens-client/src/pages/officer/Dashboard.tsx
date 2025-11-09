import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle2, Clock, AlertCircle, TrendingUp, MapPin, ArrowRight, Loader2, 
  RefreshCw, Activity, Award, Target, FileText, Users, BarChart3, Zap,
  Shield, Calendar, Timer, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { officerService, OfficerStats } from "@/services/officerService";
import { useToast } from "@/hooks/use-toast";
import { OfficerHeader } from "@/components/layout/OfficerHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";
import { Report } from "@/services/reportsService";

interface DashboardStats {
  totalTasks: number;
  activeTasks: number;
  completedToday: number;
  criticalTasks: number;
  resolvedThisMonth: number;
  avgResolutionTime: number;
}

const OfficerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isOffline } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  const { toast } = useToast();

  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [tasks, setTasks] = useState<Report[]>([]);
  const [allTasks, setAllTasks] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const getStatusColor = useCallback((status: string): string => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-green-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    if (s === 'assigned_to_officer') return 'bg-amber-500';
    if (s === 'on_hold') return 'bg-gray-500';
    return 'bg-slate-500';
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return CheckCircle2;
    if (s === 'rejected') return AlertCircle;
    if (s === 'on_hold') return Clock;
    return Activity;
  }, []);

  const getSeverityColor = useCallback((severity: string): string => {
    const s = severity?.toLowerCase();
    if (s === 'critical') return 'text-red-600 bg-red-50 border-red-200';
    if (s === 'high') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (s === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
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
    return str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  }, []);

  // Map backend capacity_level to frontend values
  const getCapacityLevelDisplay = useCallback((level: string | undefined): string => {
    if (!level) return 'unknown';
    const l = level.toLowerCase();
    // Backend returns: "low", "medium", "high"
    // Frontend expects: "available", "moderate", "high", "overloaded"
    if (l === 'low') return 'available';
    if (l === 'medium') return 'moderate';
    if (l === 'high') return 'high';
    return l; // Return as-is if already mapped or unknown
  }, []);

  const capacityLevel = getCapacityLevelDisplay(stats?.capacity_level);

  // Calculate dashboard stats - use API stats as primary source, calculate from tasks as fallback
  const dashboardStats = useMemo((): DashboardStats => {
    // Use API stats if available (more accurate and officer-specific)
    const activeTasksFromAPI = stats?.active_reports || 0;
    const resolvedFromAPI = stats?.resolved_reports || 0; // This is ALL resolved, not just this month
    const avgResolutionFromAPI = stats?.avg_resolution_time_days || 0;
    
    // Calculate from tasks for real-time counts (officer-specific since allTasks is filtered)
    // Match backend active statuses: ASSIGNED_TO_OFFICER, ACKNOWLEDGED, IN_PROGRESS, PENDING_VERIFICATION
    const activeStatuses = [
      'assigned_to_officer', 
      'acknowledged', 
      'in_progress', 
      'on_hold',
      'pending_verification' // Include this as backend considers it active
    ];
    const activeTasksFromData = allTasks.filter(t => 
      t.task && activeStatuses.includes(t.status?.toLowerCase() || '')
    ).length;
    
    // Calculate completed today from officer's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = allTasks.filter(t => {
      // Check if task is resolved/closed
      const isResolved = t.status?.toLowerCase() === 'resolved' || t.status?.toLowerCase() === 'closed';
      if (!isResolved) return false;
      
      // Use task resolved_at if available, otherwise use report updated_at
      const resolvedDate = t.task?.resolved_at 
        ? new Date(t.task.resolved_at)
        : t.updated_at 
        ? new Date(t.updated_at)
        : null;
      
      return resolvedDate && resolvedDate >= today;
    }).length;

    // Calculate critical tasks from officer's active tasks
    const criticalTasks = allTasks.filter(t => 
      t.severity?.toLowerCase() === 'critical' && 
      activeStatuses.includes(t.status?.toLowerCase() || '')
    ).length;

    // Calculate resolved this month from officer's tasks
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const resolvedThisMonth = allTasks.filter(t => {
      const isResolved = t.status?.toLowerCase() === 'resolved' || t.status?.toLowerCase() === 'closed';
      if (!isResolved) return false;
      
      const resolvedDate = t.task?.resolved_at 
        ? new Date(t.task.resolved_at)
        : t.updated_at 
        ? new Date(t.updated_at)
        : null;
      
      return resolvedDate && resolvedDate >= thisMonthStart;
    }).length;

    return {
      totalTasks: allTasks.length, // Total tasks assigned to this officer
      // Use API stats if available, otherwise use calculated (both are officer-specific)
      activeTasks: activeTasksFromAPI > 0 ? activeTasksFromAPI : activeTasksFromData,
      completedToday, // Officer-specific: tasks completed today by this officer
      criticalTasks, // Officer-specific: critical tasks assigned to this officer
      resolvedThisMonth: resolvedThisMonth || resolvedFromAPI, // Officer-specific: resolved this month
      avgResolutionTime: avgResolutionFromAPI, // Officer-specific: from API
    };
  }, [allTasks, stats]);

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

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      logger.debug(`Loading dashboard data for officer ${user.id}`);

      // Fetch officer stats and tasks in parallel
      const [statsData, tasksData] = await Promise.allSettled([
        officerService.getOfficerStats(user.id),
        officerService.getMyTasks({ limit: 100 })
      ]);

      // Handle stats
      if (statsData.status === 'fulfilled') {
        logger.debug('Officer stats loaded:', statsData.value);
        setStats(statsData.value);
      } else {
        logger.error('Failed to load officer stats:', statsData.reason);
        const errorMsg = extractErrorMessage(statsData.reason);
        setError(errorMsg);
        toast({
          title: "Failed to Load Statistics",
          description: errorMsg,
          variant: "destructive"
        });
      }

      // Handle tasks/reports
      if (tasksData.status === 'fulfilled') {
        const allTasks = Array.isArray(tasksData.value) ? tasksData.value : [];
        
        logger.debug(`Loaded ${allTasks.length} tasks for officer ${user.id}`);
        
        // Filter for reports assigned to current officer
        const myTasks = allTasks.filter((report: Report) => {
          const hasTask = report.task && report.task.assigned_to;
          const isAssignedToMe = report.task?.assigned_to === user.id;
          return hasTask && isAssignedToMe;
        });
        
        logger.debug(`Filtered to ${myTasks.length} tasks assigned to officer ${user.id}`);
        
        setAllTasks(myTasks);
        // Show most recent 5 tasks, sorted by created_at descending
        const sortedTasks = [...myTasks].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        setTasks(sortedTasks.slice(0, 5));
      } else {
        logger.error('Failed to load tasks:', tasksData.reason);
        const errorMsg = extractErrorMessage(tasksData.reason);
        if (!error) {
          setError(errorMsg);
        }
        toast({
          title: "Failed to Load Tasks",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      logger.error('Dashboard load error:', err);
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      toast({
        title: "Unable to Load Dashboard",
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
      loadDashboardData();
    }
  }, [user, authLoading, loadDashboardData]);

  // Redirect if not authenticated or not an officer
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login', { replace: true });
    } else if (!authLoading && user && user.role === 'citizen') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the officer portal.",
        variant: "destructive"
      });
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate, toast]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data updated successfully."
    });
  }, [loadDashboardData, toast]);

  // Loading state
  if (authLoading || (loading && !stats && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <OfficerHeader onRefresh={handleRefresh} refreshing={refreshing} />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-destructive" />
            <h3 className="text-xl font-semibold mb-2">Unable to Load Dashboard</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
          <Button onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/officer/tasks')}>
                View Tasks
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
      {isOffline || !isBackendReachable ? (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="container mx-auto flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span>You're currently offline. Some features may be limited.</span>
          </div>
        </div>
      ) : null}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <Card className="p-6 mb-8 bg-gradient-to-br from-secondary/20 via-secondary/10 to-accent/10 border-secondary/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-1">
                  Welcome back, {stats?.full_name || user?.full_name || 'Officer'} 
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {stats?.department_name && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {stats.department_name}
                    </span>
                  )}
                  {stats?.employee_id && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      ID: {stats.employee_id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/officer/tasks')}
              size="lg"
              className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90"
            >
              <Target className="w-4 h-4 mr-2" />
              View All Tasks
            </Button>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {stats?.active_reports ?? dashboardStats.activeTasks}
            </div>
            <div className="text-sm text-muted-foreground">Active Tasks</div>
            <div className="mt-3 text-xs text-muted-foreground">
              {stats?.in_progress_reports || 0} in progress • {dashboardStats.totalTasks} total assigned
        </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Today
              </Badge>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {dashboardStats.completedToday}
            </div>
            <div className="text-sm text-muted-foreground">Completed Today</div>
            <div className="mt-3 text-xs text-muted-foreground">
              {dashboardStats.resolvedThisMonth} resolved this month
        </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Urgent
              </Badge>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {dashboardStats.criticalTasks}
            </div>
            <div className="text-sm text-muted-foreground">Critical Issues</div>
            <div className="mt-3 text-xs text-muted-foreground">
              Requires immediate attention
                </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Avg Time
              </Badge>
            </div>
            <div className="text-3xl font-bold text-foreground mb-1">
              {stats?.avg_resolution_time_days && stats.avg_resolution_time_days > 0
                ? `${stats.avg_resolution_time_days.toFixed(1)}`
                : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Avg Resolution Time</div>
            <div className="mt-3 text-xs text-muted-foreground">
              {stats?.avg_resolution_time_days && stats.avg_resolution_time_days > 0 
                ? 'days' 
                : 'No data available'}
            </div>
            </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Tasks */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Recent Tasks</h3>
                  <p className="text-sm text-muted-foreground">
                    Your assigned tasks and their current status
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/officer/tasks')}
                >
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

              {loading && tasks.length === 0 ? (
                <div className="py-12 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
                </div>
            ) : tasks.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h4 className="font-semibold text-foreground mb-2">No Active Tasks</h4>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                    You do not have any assigned tasks at this time. New tasks will appear here when assigned to you.
                </p>
                  <Button variant="outline" onClick={() => navigate('/officer/tasks')}>
                    Check All Tasks
                  </Button>
                </div>
            ) : (
                <div className="space-y-4" role="list" aria-label="Recent tasks">
                  {tasks.map((task) => {
                    const StatusIcon = getStatusIcon(task.status || '');
                    const taskStatus = task.status?.toLowerCase() || '';
                    const canAcknowledge = taskStatus === 'assigned_to_officer';
                    const canStartWork = taskStatus === 'acknowledged';
                    const canComplete = taskStatus === 'in_progress';

                    return (
                  <Card 
                    key={task.id} 
                        className="p-5 hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary/50"
                    onClick={() => navigate(`/officer/task/${task.id}`)}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`Task ${task.report_number}: ${task.title}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            navigate(`/officer/task/${task.id}`);
                          }
                        }}
                  >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-xs">
                                {task.report_number}
                              </Badge>
                              <Badge className={getStatusColor(task.status || '')}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {toLabel(task.status || '')}
                              </Badge>
                              {task.severity && (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium ${getSeverityColor(task.severity)}`}
                                >
                                  {toLabel(task.severity)}
                          </Badge>
                              )}
                            </div>
                            <h4 className="font-semibold text-foreground mb-2 line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              {task.address && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate max-w-[200px]">{task.address}</span>
                                </div>
                              )}
                              {task.department?.name && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{task.department.name}</span>
                        </div>
                              )}
                              {task.created_at && (
                          <div className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{formatDate(task.created_at)}</span>
                          </div>
                              )}
                            </div>
                      </div>
                    </div>
                    
                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/officer/task/${task.id}`);
                        }}
                      >
                            <FileText className="w-4 h-4 mr-1" />
                            View Details
                      </Button>
                          {canAcknowledge && (
                        <Button 
                          size="sm" 
                              className="flex-1 bg-secondary hover:bg-secondary/90"
                          onClick={(e) => {
                            e.stopPropagation();
                                navigate(`/officer/task/${task.id}/acknowledge`);
                          }}
                        >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                          {canStartWork && (
                        <Button 
                          size="sm" 
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                                navigate(`/officer/task/${task.id}/start`);
                          }}
                        >
                              <Zap className="w-4 h-4 mr-1" />
                          Start Work
                        </Button>
                      )}
                          {canComplete && (
                        <Button 
                          size="sm" 
                              className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={(e) => {
                            e.stopPropagation();
                                navigate(`/officer/task/${task.id}/complete`);
                          }}
                        >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </Card>
                    );
                  })}
              </div>
            )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Performance Metrics Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Performance Metrics</h3>
              </div>
              
              <div className="space-y-6">
                {/* Workload Capacity */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Workload Capacity</span>
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
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Score: {(stats?.workload_score || 0).toFixed(2)}
                  </p>
                </div>

                {/* Metrics List */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Avg. Resolution</span>
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
                      <span className="text-sm text-muted-foreground">Active Tasks</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {stats?.active_reports || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Resolved</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {stats?.resolved_reports || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Total Reports</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">
                      {stats?.total_reports || 0}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Workload Status Card */}
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

            {/* Quick Actions Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">Quick Actions</h4>
              </div>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/officer/tasks')}
                >
                  <Target className="w-4 h-4 mr-2" />
                  View All Tasks
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate('/officer/profile')}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Map view will be available in a future update.",
                    });
                  }}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  View Map
                </Button>
              </div>
            </Card>

            {/* Department Info Card */}
            {stats?.department_name && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Department</h4>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {stats.department_name}
                </p>
                {stats.employee_id && (
                  <p className="text-xs text-muted-foreground">
                    Employee ID: {stats.employee_id}
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
