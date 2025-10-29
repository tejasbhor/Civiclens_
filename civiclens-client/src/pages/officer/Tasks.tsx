import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Bell, User, MapPin, Filter, ArrowUpDown,
  Clock, CheckCircle2, AlertCircle, Loader2
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

const Tasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date");
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await officerService.getMyTasks({ limit: 100 });
      
      // Filter for current officer's tasks
      const myTasks = response.filter((report: any) => {
        return report.task && report.task.assigned_to === user!.id;
      });
      
      console.log('📋 Tasks Page:');
      console.log('   Total reports:', response.length);
      console.log('   My tasks:', myTasks.length);
      
      setTasks(myTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove the hardcoded tasks array - now using real data from state
  const mockTasks = [
    {
      id: "CL-2025-RNC-00016",
      title: "Water logging on the road",
      location: "Sector 4, Main Road",
      severity: "Critical",
      status: "In Progress",
      assignedAt: "Oct 25, 03:20 PM",
      dueDate: "Oct 27",
      priority: "High",
      statusColor: "bg-amber-500",
      priorityColor: "text-red-500"
    },
    {
      id: "CL-2025-RNC-00017",
      title: "Street light not working",
      location: "Park Avenue, Sector 2",
      severity: "Medium",
      status: "Assigned",
      assignedAt: "Oct 26, 10:15 AM",
      dueDate: "Oct 28",
      priority: "Medium",
      statusColor: "bg-blue-500",
      priorityColor: "text-amber-500"
    },
    {
      id: "CL-2025-RNC-00018",
      title: "Broken footpath",
      location: "Ward 15, Near School",
      severity: "Medium",
      status: "New",
      assignedAt: "Oct 26, 02:30 PM",
      dueDate: "Oct 29",
      priority: "Medium",
      statusColor: "bg-blue-500",
      priorityColor: "text-amber-500"
    },
    {
      id: "CL-2025-RNC-00019",
      title: "Garbage pile up",
      location: "Market Road, Sector 7",
      severity: "High",
      status: "Acknowledged",
      assignedAt: "Oct 26, 09:00 AM",
      dueDate: "Oct 27",
      priority: "High",
      statusColor: "bg-purple-500",
      priorityColor: "text-red-500"
    },
    {
      id: "CL-2025-RNC-00020",
      title: "Pothole on main road",
      location: "Highway 33, Near Junction",
      severity: "Low",
      status: "In Progress",
      assignedAt: "Oct 25, 11:00 AM",
      dueDate: "Oct 30",
      priority: "Low",
      statusColor: "bg-amber-500",
      priorityColor: "text-green-500"
    }
  ];

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
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

  const toLabel = (str: string) => {
    return str?.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    
    if (filter !== "all") {
      filtered = filtered.filter(task => 
        task.status?.toLowerCase().replace(" ", "_") === filter
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "created_at") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "severity") {
        const severityOrder: any = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity?.toLowerCase()] || 999) - (severityOrder[b.severity?.toLowerCase()] || 999);
      }
      if (sortBy === "priority") {
        const priorityOrder = { "High": 1, "Medium": 2, "Low": 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      return 0;
    });

    return filtered;
  };

  const groupTasksByStatus = () => {
    const filtered = getFilteredTasks();
    const groups: { [key: string]: typeof tasks } = {
      new: [],
      assigned: [],
      acknowledged: [],
      in_progress: []
    };

    filtered.forEach(task => {
      const status = task.status.toLowerCase().replace(" ", "_");
      if (groups[status]) {
        groups[status].push(task);
      }
    });

    return groups;
  };

  const groupedTasks = groupTasksByStatus();
  const hasNewTasks = groupedTasks.new.length > 0 || groupedTasks.assigned.length > 0;

  const renderTaskCard = (task: any) => (
    <Card 
      key={task.id} 
      className="p-6 hover:shadow-md transition-all cursor-pointer"
      onClick={() => navigate(`/officer/task/${task.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="font-mono">{task.report_number}</Badge>
            <Badge className={getStatusColor(task.status)}>{toLabel(task.status)}</Badge>
          </div>
          <h3 className="font-semibold text-foreground mb-2">{task.title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {task.address || task.landmark || `${task.latitude?.toFixed(4)}, ${task.longitude?.toFixed(4)}`}
            </div>
            {task.severity && (
              <div className={`font-medium ${getSeverityColor(task.severity)}`}>
                {toLabel(task.severity)} Priority
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Created: {formatDate(task.created_at)}</span>
          </div>
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
          View Details
        </Button>
        {task.status === "assigned_to_officer" && (
          <Button 
            size="sm" 
            className="flex-1 bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/officer/task/${task.id}/acknowledge`);
            }}
          >
            Acknowledge
          </Button>
        )}
        {task.status === "acknowledged" && (
          <Button 
            size="sm" 
            className="flex-1 bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/officer/task/${task.id}/start`);
            }}
          >
            Start Work
          </Button>
        )}
        {task.status === "in_progress" && (
          <Button 
            size="sm" 
            className="flex-1 bg-secondary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/officer/task/${task.id}/complete`);
            }}
          >
            Update Progress
          </Button>
        )}
      </div>
    </Card>
  );

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return <AlertCircle className="w-4 h-4" />;
      case 'in progress':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">My Tasks</h1>
              <p className="text-xs text-muted-foreground">{getFilteredTasks().length} tasks</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/officer/profile')}>
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tasks List by Section */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">Loading your tasks...</p>
          </Card>
        ) : tasks.length === 0 ? (
          <Card className="p-12 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Tasks Assigned</h3>
            <p className="text-muted-foreground">
              You don't have any tasks assigned at the moment.
            </p>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* New & Assigned Tasks Section */}
            {hasNewTasks && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Newly Assigned Tasks</h2>
                  <p className="text-sm text-muted-foreground">
                    {groupedTasks.new.length + groupedTasks.assigned.length} tasks require your attention
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {groupedTasks.new.map(renderTaskCard)}
                {groupedTasks.assigned.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Acknowledged Tasks Section */}
          {groupedTasks.acknowledged.length > 0 && (
            <>
              {hasNewTasks && <Separator className="my-8" />}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Acknowledged Tasks</h2>
                    <p className="text-sm text-muted-foreground">
                      {groupedTasks.acknowledged.length} tasks ready to start
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {groupedTasks.acknowledged.map(renderTaskCard)}
                </div>
              </div>
            </>
          )}

          {/* In Progress Tasks Section */}
          {groupedTasks.in_progress.length > 0 && (
            <>
              {(hasNewTasks || groupedTasks.acknowledged.length > 0) && <Separator className="my-8" />}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">In Progress</h2>
                    <p className="text-sm text-muted-foreground">
                      {groupedTasks.in_progress.length} tasks in progress
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {groupedTasks.in_progress.map(renderTaskCard)}
                </div>
              </div>
            </>
          )}

            {/* Empty State */}
            {!hasNewTasks && groupedTasks.acknowledged.length === 0 && groupedTasks.in_progress.length === 0 && (
              <Card className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Found</h3>
                <p className="text-muted-foreground">
                  {filter !== "all" 
                    ? "Try changing your filter to see more tasks" 
                    : "You don't have any tasks assigned at the moment"}
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
