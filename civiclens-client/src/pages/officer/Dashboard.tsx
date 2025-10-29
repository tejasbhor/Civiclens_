import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Bell, User, CheckCircle2, Clock, AlertCircle, TrendingUp, MapPin, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { officerService, OfficerStats } from "@/services/officerService";
import { useToast } from "@/hooks/use-toast";

const OfficerDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState<OfficerStats | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not authenticated or not an officer
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/officer/login');
    } else if (!authLoading && user && user.role === 'citizen') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the officer portal.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [authLoading, user, navigate, toast]);

  // Load dashboard data
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('📊 Loading Dashboard Data...');
      console.log('   Officer ID:', user!.id);
      console.log('   Officer Name:', user!.full_name);
      console.log('   Officer Role:', user!.role);

      // Fetch officer stats
      console.log('   Fetching officer stats from /users/' + user!.id + '/stats');
      const statsData = await officerService.getOfficerStats(user!.id);
      console.log('   ✅ Stats received:', statsData);
      setStats(statsData);

      // Fetch all reports and filter for tasks assigned to this officer
      console.log('   Fetching reports...');
      const response = await officerService.getMyTasks({ limit: 100 });
      console.log('   ✅ Total reports fetched:', response.length);
      
      if (response.length > 0) {
        console.log('   Sample report structure:', response[0]);
      }
      
      // Filter for reports assigned to current officer
      console.log('   Filtering reports for officer ID:', user!.id);
      const myTasks = response.filter((report: any) => {
        const hasTask = report.task && report.task.assigned_to === user!.id;
        if (report.task) {
          console.log(`   Report ${report.report_number}: task.assigned_to=${report.task.assigned_to}, user.id=${user!.id}, match=${hasTask}`);
        } else {
          console.log(`   Report ${report.report_number}: NO TASK`);
        }
        return hasTask;
      });
      
      console.log('   ✅ My tasks count:', myTasks.length);
      if (myTasks.length > 0) {
        console.log('   My tasks:', myTasks.map(t => ({ id: t.id, number: t.report_number, status: t.status })));
      }
      
      // Take only first 5 for dashboard
      setTasks(myTasks.slice(0, 5));
      
      console.log('✅ Dashboard loaded successfully!');
    } catch (error: any) {
      console.error('❌ Failed to load dashboard data:', error);
      console.error('   Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      toast({
        title: "Error Loading Dashboard",
        description: error.response?.data?.detail || error.message || "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Dashboard data updated successfully."
    });
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return 'bg-green-500';
    if (s === 'closed') return 'bg-gray-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    if (s === 'assigned_to_officer') return 'bg-amber-500';
    return 'bg-slate-500';
  };

  const getSeverityColor = (severity: string) => {
    const s = severity?.toLowerCase();
    if (s === 'critical' || s === 'high') return 'text-red-500';
    if (s === 'medium') return 'text-amber-500';
    return 'text-blue-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const toLabel = (str: string) => {
    return str?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
  };

  const getCriticalCount = () => {
    return tasks.filter(t => t.severity?.toLowerCase() === 'critical' || t.severity?.toLowerCase() === 'high').length;
  };

  const getCompletedToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter(t => {
      if (!t.updated_at) return false;
      const taskDate = new Date(t.updated_at);
      return taskDate >= today && (t.status === 'RESOLVED' || t.status === 'CLOSED');
    }).length;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Dashboard</h3>
          <p className="text-muted-foreground mb-4">
            Unable to load your dashboard data. Please try again.
          </p>
          <Button onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">CivicLens Officer</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {getCriticalCount() > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/officer/profile')}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {stats.full_name} 👋
          </h2>
          <p className="text-muted-foreground">
            {stats.department_name || 'Officer Portal'}
            {stats.employee_id && ` • ID: ${stats.employee_id}`}
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          {[
            { 
              label: "Active Tasks", 
              value: tasks.length.toString(), 
              icon: Clock, 
              color: "bg-amber-500" 
            },
            { 
              label: "Completed Today", 
              value: getCompletedToday().toString(), 
              icon: CheckCircle2, 
              color: "bg-green-500" 
            },
            { 
              label: "Critical Issues", 
              value: getCriticalCount().toString(), 
              icon: AlertCircle, 
              color: "bg-red-500" 
            },
            { 
              label: "This Month", 
              value: stats.resolved_reports.toString(), 
              icon: TrendingUp, 
              color: "bg-blue-500" 
            }
          ].map((stat, idx) => (
            <Card key={idx} className="p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tasks Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">My Tasks</h3>
              <Button variant="link" onClick={() => navigate('/officer/tasks')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {loading ? (
              <Card className="p-8 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                <p className="text-sm text-muted-foreground">Loading tasks...</p>
              </Card>
            ) : tasks.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h4 className="font-semibold text-foreground mb-2">No Active Tasks</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  You don't have any assigned tasks at the moment.
                </p>
                <p className="text-xs text-muted-foreground">
                  Check browser console (F12) for debug info
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <Card 
                    key={task.id} 
                    className="p-6 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(`/officer/task/${task.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{task.report_number}</Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {toLabel(task.status)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2">{task.title}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {task.address || `${task.latitude?.toFixed(4)}, ${task.longitude?.toFixed(4)}`}
                          </div>
                          {task.severity && (
                            <div className={`font-medium ${getSeverityColor(task.severity)}`}>
                              {toLabel(task.severity)} Priority
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Created: {formatDate(task.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-3 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/officer/task/${task.id}`);
                        }}
                      >
                        View Details <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      {task.status === "ASSIGNED_TO_OFFICER" && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/acknowledge/${task.id}`);
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {task.status === "ACKNOWLEDGED" && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/start-work/${task.id}`);
                          }}
                        >
                          Start Work
                        </Button>
                      )}
                      {task.status === "IN_PROGRESS" && (
                        <Button 
                          size="sm" 
                          className="flex-1 bg-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/officer/complete/${task.id}`);
                          }}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Performance & Info */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Workload Capacity</span>
                    <span className="font-semibold">{toLabel(stats.capacity_level)}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${
                        stats.capacity_level === 'available' ? 'from-green-500 to-green-600' :
                        stats.capacity_level === 'moderate' ? 'from-blue-500 to-blue-600' :
                        stats.capacity_level === 'high' ? 'from-amber-500 to-amber-600' :
                        'from-red-500 to-red-600'
                      }`}
                      style={{ 
                        width: `${Math.min(stats.workload_score * 100, 100)}%` 
                      }}
                    ></div>
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
                    <span className="text-muted-foreground">Active Tasks</span>
                    <span className="font-semibold">{stats.active_reports}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Resolved</span>
                    <span className="font-semibold">{stats.resolved_reports} this month</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Reports</span>
                    <span className="font-semibold">{stats.total_reports}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-secondary/10 to-accent/10 border-secondary/20">
              <h4 className="font-semibold text-foreground mb-2">Workload Status</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {stats.capacity_level === 'available' && 'You have capacity for more tasks. Great work!'}
                {stats.capacity_level === 'moderate' && 'You have a moderate workload. Keep up the good work!'}
                {stats.capacity_level === 'high' && 'You have a high workload. Focus on completing current tasks.'}
                {stats.capacity_level === 'overloaded' && 'You are overloaded. Please prioritize critical tasks.'}
              </p>
              <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                <TrendingUp className="w-4 h-4" />
                {stats.capacity_level === 'available' ? 'Ready for Tasks' :
                 stats.capacity_level === 'moderate' ? 'Balanced Workload' :
                 stats.capacity_level === 'high' ? 'High Workload' :
                 'Overloaded'}
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-semibold text-foreground mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  View Map
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Work History
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficerDashboard;
