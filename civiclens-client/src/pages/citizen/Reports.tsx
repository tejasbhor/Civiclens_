import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Search, FileText, Plus, RefreshCw, Users, Target, MapPin, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService, Report } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";
import { CitizenHeader } from "@/components/layout/CitizenHeader";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { logger } from "@/lib/logger";

const Reports = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isOffline } = useAuth();
  const { isBackendReachable } = useConnectionStatus();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/citizen/login');
    }
  }, [authLoading, user, navigate]);

  // Load reports
  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  // Filter reports when search or tab changes
  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, activeTab]);

  // Helper to extract error message
  const extractErrorMessage = useCallback((err: any): string => {
    if (Array.isArray(err.response?.data?.detail)) {
      const firstError = err.response.data.detail[0];
      if (typeof firstError === 'object' && firstError.msg) {
        return firstError.msg || 'Validation error occurred';
      }
      return err.response.data.detail[0]?.msg || 'Validation error occurred';
    }
    
    if (err.response?.data?.detail && typeof err.response.data.detail === 'object') {
      if (err.response.data.detail.msg) return err.response.data.detail.msg;
      if (err.response.data.detail.message) return err.response.data.detail.message;
      return 'An error occurred while loading reports. Please try again.';
    }
    
    if (typeof err.response?.data?.detail === 'string') {
      return err.response.data.detail;
    }
    
    if (!err.response && (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    }
    
    return err.message || 'Unable to load reports. Please try again.';
  }, []);

  const loadReports = useCallback(async (showToast = false) => {
    try {
      setError(null);
      setLoading(true);
      const data = await reportsService.getMyReports({ limit: 100 });
      setReports(data.reports);
      if (showToast) {
        toast({
          title: "Reports Updated",
          description: "Your reports have been refreshed successfully.",
        });
      }
    } catch (error: any) {
      logger.error('Failed to load reports:', error);
      const errorMessage = extractErrorMessage(error);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, extractErrorMessage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports(true);
  }, [loadReports]);

  const filterReports = useCallback(() => {
    let filtered = [...reports];

    // Filter by tab
    if (activeTab === "active") {
      filtered = filtered.filter(r => 
        ['received', 'pending_classification', 'classified', 'assigned_to_department',
         'assigned_to_officer', 'acknowledged', 'in_progress'].includes(r.status.toLowerCase())
      );
    } else if (activeTab === "resolved") {
      filtered = filtered.filter(r => r.status.toLowerCase() === 'resolved');
    } else if (activeTab === "closed") {
      filtered = filtered.filter(r => r.status.toLowerCase() === 'closed');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.report_number.toLowerCase().includes(query) ||
        (r.category && r.category.toLowerCase().includes(query)) ||
        (r.department?.name && r.department.name.toLowerCase().includes(query)) ||
        (r.task?.officer?.full_name && r.task.officer.full_name.toLowerCase().includes(query))
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, activeTab]);

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
    if (['in_progress', 'acknowledged'].includes(s)) return Clock;
    return AlertCircle;
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

  const getTabCounts = useMemo(() => {
    const active = reports.filter(r => 
      ['received', 'pending_classification', 'classified', 'assigned_to_department',
       'assigned_to_officer', 'acknowledged', 'in_progress'].includes(r.status.toLowerCase())
    ).length;
    const resolved = reports.filter(r => r.status.toLowerCase() === 'resolved').length;
    const closed = reports.filter(r => r.status.toLowerCase() === 'closed').length;
    return { all: reports.length, active, resolved, closed };
  }, [reports]);

  const counts = getTabCounts;

  const ReportCard = ({ report }: { report: Report }) => {
    const StatusIcon = getStatusIcon(report.status);
    const statusColor = getStatusColor(report.status);

    return (
      <Card 
        className="p-6 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group"
        onClick={() => navigate(`/citizen/track/${report.id}`)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/citizen/track/${report.id}`);
          }
        }}
        aria-label={`View report ${report.report_number}`}
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
                <Badge variant="outline" className="text-xs font-mono shrink-0">{report.report_number}</Badge>
                {report.severity && (
                  <Badge variant="secondary" className="text-xs capitalize shrink-0">
                    {report.severity}
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {report.title}
              </h4>
              {report.category && (
                <p className="text-sm text-muted-foreground mb-2">{toLabel(report.category)}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {report.task?.officer && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 shrink-0" />
                    <span className="truncate">{report.task.officer.full_name || 'Officer Assigned'}</span>
                  </div>
              )}
                {report.department && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 shrink-0" />
                    <span className="truncate">{report.department.name}</span>
                  </div>
                )}
                {report.landmark && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[200px]">{report.landmark}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 shrink-0" />
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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <CitizenHeader />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">All Reports</h1>
          <p className="text-muted-foreground">View and manage all your submitted reports</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh reports"
              className="shrink-0"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Offline indicator */}
          {isOffline && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You are currently offline. Some features may be limited.</span>
            </div>
          )}
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by title, description, report number, department, or officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search reports"
            />
          </div>
          <Button 
            onClick={() => navigate('/citizen/submit-report')}
            aria-label="Submit a new report"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your reports...</p>
            </div>
          </div>
        ) : error && !loading ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Reports</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => loadReports(true)} disabled={refreshing}>
              {refreshing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any reports yet. Start making a difference!
            </p>
            <Button onClick={() => navigate('/citizen/submit-report')} aria-label="Submit your first report">
              <Plus className="w-4 h-4 mr-2" />
              Submit Your First Report
            </Button>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({counts.resolved})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({counts.closed})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {filteredReports.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No reports match your search' : 'No reports found'}
                  </p>
                </Card>
              ) : (
                <div role="list" aria-label="All reports">
                  {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="active" className="space-y-4">
              {filteredReports.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No active reports match your search' : 'No active reports'}
                  </p>
                </Card>
              ) : (
                <div role="list" aria-label="Active reports">
                  {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-4">
              {filteredReports.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No resolved reports match your search' : 'No resolved reports'}
                  </p>
                </Card>
              ) : (
                <div role="list" aria-label="Resolved reports">
                  {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="closed" className="space-y-4">
              {filteredReports.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No closed reports match your search' : 'No closed reports'}
                  </p>
                </Card>
              ) : (
                <div role="list" aria-label="Closed reports">
                  {filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Reports;