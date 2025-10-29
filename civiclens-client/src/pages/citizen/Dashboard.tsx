import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Plus, Bell, User, FileText, Clock, CheckCircle2, XCircle, Star, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService, Report } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";

const CitizenDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData();
    }
  }, [authLoading, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading dashboard data...');

      // Fetch recent reports (limit to 5 for dashboard)
      const reportsData = await reportsService.getMyReports({ limit: 5 });
      console.log('Reports data:', reportsData);
      
      setReports(reportsData.reports);

      // Calculate stats from reports
      const total = reportsData.total;
      const active = reportsData.reports.filter(r => 
        ['received', 'pending_classification', 'classified', 'assigned_to_department', 
         'assigned_to_officer', 'acknowledged', 'in_progress'].includes(r.status.toLowerCase())
      ).length;
      const resolved = reportsData.reports.filter(r => r.status.toLowerCase() === 'resolved').length;
      const closed = reportsData.reports.filter(r => r.status.toLowerCase() === 'closed').length;

      setStats({ total, active, resolved, closed });
      console.log('Dashboard loaded successfully');
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to load dashboard data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return 'bg-green-500';
    if (s === 'closed') return 'bg-gray-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return CheckCircle2;
    if (s === 'closed' || s === 'rejected') return XCircle;
    return Clock;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 max-w-md w-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadDashboardData}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">CivicLens</h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/citizen/notifications')}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/citizen/profile')}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.full_name || 'Citizen'}! 👋
          </h2>
          <p className="text-muted-foreground">Let's make your community better together</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <Button 
            onClick={() => navigate('/citizen/submit-report')}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Plus className="w-5 h-5 mr-2" />
            Submit New Report
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Reports Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Your Reports</h3>
              <Button variant="link" onClick={() => navigate('/citizen/reports')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <Card className="p-6 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-foreground">Current Reports</h4>
                <div className="text-2xl font-bold text-primary">{stats.total}</div>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-sm">Active: <strong>{stats.active}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Resolved: <strong>{stats.resolved}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Closed: <strong>{stats.closed}</strong></span>
                </div>
              </div>
            </Card>

            {reports.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start making a difference by submitting your first report
                </p>
                <Button onClick={() => navigate('/citizen/submit-report')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Submit Report
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const StatusIcon = getStatusIcon(report.status);
                  const statusColor = getStatusColor(report.status);
                  
                  return (
                    <Card key={report.id} className="p-6 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => navigate(`/citizen/track/${report.id}`)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg ${statusColor} flex items-center justify-center`}>
                            <StatusIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <Badge variant="outline" className="mb-2">{report.report_number}</Badge>
                            <h4 className="font-semibold text-foreground mb-1">{report.title}</h4>
                            {report.officer_id && (
                              <p className="text-sm text-muted-foreground">Assigned to Officer</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Updated: {formatDate(report.updated_at)}
                            </p>
                          </div>
                        </div>
                        <Badge className={statusColor}>{toLabel(report.status)}</Badge>
                      </div>
                      <div className="flex gap-2">
                        {report.status.toLowerCase() === "resolved" ? (
                          <>
                            <Button size="sm" variant="outline" className="flex-1">Rate Service</Button>
                            <Button size="sm" variant="outline" className="flex-1">View Details</Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full">
                            Track Report <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reputation & Stats */}
          <div className="space-y-6">
            {user?.profile_completion === 'complete' && user?.reputation_score !== undefined ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Reputation</h3>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary mb-2">{user.reputation_score || 0}</div>
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star 
                        key={i} 
                        className={`w-5 h-5 ${i <= Math.floor((user.reputation_score || 0) / 100) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Reputation Points</p>
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Reports</span>
                    <span className="font-semibold">{user.total_reports || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolved</span>
                    <span className="font-semibold">{stats.resolved}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-semibold">{stats.active}</span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <h3 className="text-lg font-semibold text-foreground mb-2">Upgrade Your Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complete your profile to unlock reputation points and track your community impact!
                </p>
                <Button onClick={() => navigate('/citizen/profile')} className="w-full">
                  Complete Profile
                </Button>
              </Card>
            )}

            <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
              <h4 className="font-semibold text-foreground mb-2">Community Impact</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {stats.resolved > 0 
                  ? `Your reports have helped resolve ${stats.resolved} issue${stats.resolved !== 1 ? 's' : ''} in your community. Keep making a difference!`
                  : 'Start reporting issues to make a positive impact in your community!'}
              </p>
              <div className="flex items-center gap-2 text-sm text-primary font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {stats.total > 0 ? 'Thank you for being an active citizen' : 'Submit your first report today'}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
