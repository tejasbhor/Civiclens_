import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Filter, ArrowUpDown, Clock, CheckCircle2, 
  AlertCircle, Loader2, RefreshCw, FileText, Users, Calendar,
  AlertTriangle, Zap, Target, Activity, TrendingUp
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";
import { useToast } from "@/hooks/use-toast";
import { OfficerHeader } from "@/components/layout/OfficerHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";
import { Report } from "@/services/reportsService";

const Tasks = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  const { toast } = useToast();
  
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [tasks, setTasks] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper functions
  const getStatusColor = useCallback((status: string): string => {
    const s = status?.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-green-500';
    if (s === 'rejected' || s === 'assignment_rejected') return 'bg-red-500';
    if (s === 'in_progress') return 'bg-blue-500';
    if (s === 'acknowledged') return 'bg-purple-500';
    if (s === 'assigned_to_officer') return 'bg-amber-500';
    if (s === 'on_hold') return 'bg-gray-500';
    if (s === 'pending_verification') return 'bg-indigo-500';
    if (s === 'reopened') return 'bg-orange-500';
    return 'bg-slate-500';
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    const s = status?.toLowerCase();
    if (s === 'resolved' || s === 'closed') return CheckCircle2;
    if (s === 'rejected') return AlertCircle;
    if (s === 'on_hold') return Clock;
    if (s === 'pending_verification') return Clock;
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

  // Load tasks
  const loadTasks = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setLoading(true);

      logger.debug(`Loading tasks for officer ${user.id}`);

      const response = await officerService.getMyTasks({ limit: 100 });
      
      // Filter for current officer's tasks
      const myTasks = response.filter((report: Report) => {
        return report.task && report.task.assigned_to === user.id;
      });
      
      logger.debug(`Loaded ${myTasks.length} tasks for officer ${user.id}`);
      
      setTasks(myTasks);
    } catch (err: any) {
      logger.error('Failed to load tasks:', err);
      const errorMsg = extractErrorMessage(err);
      setError(errorMsg);
      toast({
        title: "Failed to Load Tasks",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, extractErrorMessage, toast]);

  // Initial load
  useEffect(() => {
    if (user && !authLoading) {
      loadTasks();
    }
  }, [user, authLoading, loadTasks]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Tasks updated successfully."
    });
  }, [loadTasks, toast]);

  // Filter and sort tasks
  const getFilteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];
    
    // Apply filter
    if (filter !== "all") {
      filtered = filtered.filter(task => {
        const status = task.status?.toLowerCase() || '';
        return status === filter || status.replace(/_/g, '_') === filter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "created_at") {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Newest first
      } else if (sortBy === "severity") {
        const severityOrder: Record<string, number> = { 
          critical: 0, 
          high: 1, 
          medium: 2, 
          low: 3 
        };
        const aSeverity = severityOrder[a.severity?.toLowerCase() || ''] ?? 999;
        const bSeverity = severityOrder[b.severity?.toLowerCase() || ''] ?? 999;
        return aSeverity - bSeverity;
      } else if (sortBy === "status") {
        const statusOrder: Record<string, number> = {
          'assigned_to_officer': 0,
          'acknowledged': 1,
          'in_progress': 2,
          'pending_verification': 3,
          'resolved': 4,
          'closed': 5
        };
        const aStatus = statusOrder[a.status?.toLowerCase() || ''] ?? 999;
        const bStatus = statusOrder[b.status?.toLowerCase() || ''] ?? 999;
        return aStatus - bStatus;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filter, sortBy]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Report[]> = {
      assigned_to_officer: [],
      acknowledged: [],
      in_progress: [],
      pending_verification: [],
      on_hold: [],
      assignment_rejected: [],
      reopened: [],
      resolved: [],
      closed: [],
      rejected: []
    };

    getFilteredAndSortedTasks.forEach(task => {
      const status = task.status?.toLowerCase() || '';
      if (groups[status]) {
        groups[status].push(task);
      } else {
        // Add to assigned if unknown status
        groups.assigned_to_officer.push(task);
      }
    });

    return groups;
  }, [getFilteredAndSortedTasks]);

  // Calculate stats
  const stats = useMemo(() => {
    const activeStatuses = ['assigned_to_officer', 'acknowledged', 'in_progress', 'pending_verification', 'on_hold'];
    const activeTasks = tasks.filter(t => 
      activeStatuses.includes(t.status?.toLowerCase() || '')
    ).length;
    
    const criticalTasks = tasks.filter(t => 
      t.severity?.toLowerCase() === 'critical' && 
      activeStatuses.includes(t.status?.toLowerCase() || '')
    ).length;

    const resolvedTasks = tasks.filter(t => 
      t.status?.toLowerCase() === 'resolved' || t.status?.toLowerCase() === 'closed'
    ).length;

    return {
      total: tasks.length,
      active: activeTasks,
      critical: criticalTasks,
      resolved: resolvedTasks
    };
  }, [tasks]);

  const renderTaskCard = useCallback((task: Report) => {
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
            <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
              {task.title}
            </h3>
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
  }, [navigate, getStatusColor, getStatusIcon, getSeverityColor, toLabel, formatDate]);

  // Loading state
  if (authLoading || (loading && tasks.length === 0 && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading tasks...</p>
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
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
              <h1 className="text-3xl font-bold text-foreground mb-2">My Tasks</h1>
              <p className="text-muted-foreground">
                Manage and track all your assigned tasks
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <Target className="w-8 h-8 text-muted-foreground" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active</p>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Critical</p>
                  <p className="text-2xl font-bold text-foreground">{stats.critical}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Resolved</p>
                  <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* Filters and Sort */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filter:</span>
            </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tasks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="assigned_to_officer">Assigned</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="assignment_rejected">Assignment Rejected</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

            <div className="flex items-center gap-2 ml-auto">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Sort:</span>
            </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="created_at">Newest First</SelectItem>
                <SelectItem value="severity">Severity</SelectItem>
                <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-6 mb-6 border-destructive">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Error Loading Tasks</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadTasks}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Tasks List */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">Loading your tasks...</p>
          </Card>
        ) : getFilteredAndSortedTasks.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Found</h3>
            <p className="text-muted-foreground mb-4">
              {filter !== "all" 
                ? "No tasks match your current filter. Try changing the filter to see more tasks." 
                : "You don't have any tasks assigned at the moment. New tasks will appear here when assigned to you."}
            </p>
            {filter !== "all" && (
              <Button variant="outline" onClick={() => setFilter("all")}>
                Show All Tasks
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Assigned Tasks Section */}
            {groupedTasks.assigned_to_officer.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Newly Assigned</h2>
                  <p className="text-sm text-muted-foreground">
                      {groupedTasks.assigned_to_officer.length} task{groupedTasks.assigned_to_officer.length !== 1 ? 's' : ''} require your attention
                  </p>
                </div>
              </div>
                <div className="space-y-4" role="list" aria-label="Assigned tasks">
                  {groupedTasks.assigned_to_officer.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Acknowledged Tasks Section */}
          {groupedTasks.acknowledged.length > 0 && (
            <>
                {groupedTasks.assigned_to_officer.length > 0 && <Separator className="my-8" />}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                      <h2 className="text-lg font-semibold text-foreground">Acknowledged</h2>
                    <p className="text-sm text-muted-foreground">
                        {groupedTasks.acknowledged.length} task{groupedTasks.acknowledged.length !== 1 ? 's' : ''} ready to start
                    </p>
                  </div>
                </div>
                  <div className="space-y-4" role="list" aria-label="Acknowledged tasks">
                  {groupedTasks.acknowledged.map(renderTaskCard)}
                </div>
              </div>
            </>
          )}

          {/* In Progress Tasks Section */}
          {groupedTasks.in_progress.length > 0 && (
            <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0) && <Separator className="my-8" />}
              <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">In Progress</h2>
                    <p className="text-sm text-muted-foreground">
                        {groupedTasks.in_progress.length} task{groupedTasks.in_progress.length !== 1 ? 's' : ''} currently being worked on
                    </p>
                  </div>
                </div>
                  <div className="space-y-4" role="list" aria-label="In progress tasks">
                  {groupedTasks.in_progress.map(renderTaskCard)}
                </div>
              </div>
            </>
          )}

            {/* Pending Verification Section */}
            {groupedTasks.pending_verification.length > 0 && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Pending Verification</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.pending_verification.length} task{groupedTasks.pending_verification.length !== 1 ? 's' : ''} awaiting verification
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="Pending verification tasks">
                    {groupedTasks.pending_verification.map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}

            {/* On Hold Section */}
            {groupedTasks.on_hold.length > 0 && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0 || groupedTasks.pending_verification.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">On Hold</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.on_hold.length} task{groupedTasks.on_hold.length !== 1 ? 's' : ''} temporarily paused
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="On hold tasks">
                    {groupedTasks.on_hold.map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}

            {/* Assignment Rejected Section */}
            {groupedTasks.assignment_rejected.length > 0 && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0 || groupedTasks.pending_verification.length > 0 || groupedTasks.on_hold.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Assignment Rejected</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.assignment_rejected.length} task{groupedTasks.assignment_rejected.length !== 1 ? 's' : ''} where assignment was rejected
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="Assignment rejected tasks">
                    {groupedTasks.assignment_rejected.map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}

            {/* Reopened Section */}
            {groupedTasks.reopened.length > 0 && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0 || groupedTasks.pending_verification.length > 0 || groupedTasks.on_hold.length > 0 || groupedTasks.assignment_rejected.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Reopened</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.reopened.length} task{groupedTasks.reopened.length !== 1 ? 's' : ''} reopened after appeal
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="Reopened tasks">
                    {groupedTasks.reopened.map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}

            {/* Rejected Section */}
            {groupedTasks.rejected.length > 0 && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0 || groupedTasks.pending_verification.length > 0 || groupedTasks.on_hold.length > 0 || groupedTasks.assignment_rejected.length > 0 || groupedTasks.reopened.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Rejected</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.rejected.length} task{groupedTasks.rejected.length !== 1 ? 's' : ''} that were rejected
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="Rejected tasks">
                    {groupedTasks.rejected.map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}

            {/* Resolved/Closed Section */}
            {(groupedTasks.resolved.length > 0 || groupedTasks.closed.length > 0) && (
              <>
                {(groupedTasks.assigned_to_officer.length > 0 || groupedTasks.acknowledged.length > 0 || groupedTasks.in_progress.length > 0 || groupedTasks.pending_verification.length > 0 || groupedTasks.on_hold.length > 0 || groupedTasks.assignment_rejected.length > 0 || groupedTasks.reopened.length > 0 || groupedTasks.rejected.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Completed</h2>
                      <p className="text-sm text-muted-foreground">
                        {groupedTasks.resolved.length + groupedTasks.closed.length} task{groupedTasks.resolved.length + groupedTasks.closed.length !== 1 ? 's' : ''} resolved
                </p>
                    </div>
                  </div>
                  <div className="space-y-4" role="list" aria-label="Completed tasks">
                    {[...groupedTasks.resolved, ...groupedTasks.closed].map(renderTaskCard)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
