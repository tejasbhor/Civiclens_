import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Search, FileText, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { reportsService, Report } from "@/services/reportsService";
import { useToast } from "@/hooks/use-toast";

const Reports = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getMyReports({ limit: 100 });
      setReports(data.reports);
    } catch (error: any) {
      console.error('Failed to load reports:', error);
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
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
        (r.category && r.category.toLowerCase().includes(query))
      );
    }

    setFilteredReports(filtered);
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
    if (['in_progress', 'acknowledged'].includes(s)) return Clock;
    return AlertCircle;
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

  const getTabCounts = () => {
    const active = reports.filter(r => 
      ['received', 'pending_classification', 'classified', 'assigned_to_department',
       'assigned_to_officer', 'acknowledged', 'in_progress'].includes(r.status.toLowerCase())
    ).length;
    const resolved = reports.filter(r => r.status.toLowerCase() === 'resolved').length;
    const closed = reports.filter(r => r.status.toLowerCase() === 'closed').length;
    return { all: reports.length, active, resolved, closed };
  };

  const counts = getTabCounts();

  const ReportCard = ({ report }: { report: Report }) => {
    const StatusIcon = getStatusIcon(report.status);
    const statusColor = getStatusColor(report.status);

    return (
      <Card 
        className="p-6 hover:shadow-md transition-all cursor-pointer"
        onClick={() => navigate(`/citizen/track/${report.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-lg ${statusColor} flex items-center justify-center flex-shrink-0`}>
              <StatusIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="mb-2">{report.report_number}</Badge>
              <h4 className="font-semibold text-foreground mb-1 line-clamp-2">{report.title}</h4>
              {report.category && (
                <p className="text-sm text-muted-foreground mb-1">{toLabel(report.category)}</p>
              )}
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
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/citizen/dashboard')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-foreground">All Reports</h1>
          <p className="text-muted-foreground">View and manage all your submitted reports</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by title, description, or report number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => navigate('/citizen/submit-report')}>
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
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't submitted any reports yet. Start making a difference!
            </p>
            <Button onClick={() => navigate('/citizen/submit-report')}>
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
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
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
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
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
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
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
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default Reports;