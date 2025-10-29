import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { officerService } from "@/services/officerService";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Navigation,
  Image as ImageIcon,
  FileText,
  Star
} from "lucide-react";

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTaskDetails();
    }
  }, [id]);

  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      console.log('📋 Loading task details for report ID:', id);

      // Fetch task details
      const taskData = await officerService.getTaskDetails(parseInt(id!));
      console.log('✅ Task data received:', taskData);
      setTask(taskData);

      // Fetch task history
      const historyData = await officerService.getTaskHistory(parseInt(id!));
      console.log('✅ History data received:', historyData);
      setHistory(historyData.history || []);
    } catch (error: any) {
      console.error('❌ Failed to load task details:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to load task details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      setActionLoading(true);
      await officerService.acknowledgeTask(parseInt(id!));
      toast({
        title: "Success",
        description: "Task acknowledged successfully"
      });
      await loadTaskDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to acknowledge task",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    try {
      setActionLoading(true);
      await officerService.startWork(parseInt(id!));
      toast({
        title: "Success",
        description: "Work started successfully"
      });
      await loadTaskDetails();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to start work",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForVerification = () => {
    // Navigate to CompleteWork page
    navigate(`/officer/task/${id}/complete`);
  };

  const handleAddUpdate = () => {
    toast({
      title: "Add Update",
      description: "Update functionality coming soon"
    });
  };

  const handlePutOnHold = () => {
    toast({
      title: "Put On Hold",
      description: "On hold functionality coming soon"
    });
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'resolved') return 'bg-green-500';
    if (s === 'closed') return 'bg-gray-500';
    if (s === 'rejected') return 'bg-red-500';
    if (['in_progress', 'acknowledged'].includes(s)) return 'bg-blue-500';
    if (s === 'assigned_to_officer') return 'bg-amber-500';
    if (s === 'pending_verification') return 'bg-purple-500';
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
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Task Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The task you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate('/officer/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const canAcknowledge = task.status === 'assigned_to_officer' && task.task?.assigned_to === user?.id;
  const canStartWork = task.status === 'acknowledged' && task.task?.assigned_to === user?.id;
  const canComplete = task.status === 'in_progress' && task.task?.assigned_to === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/officer/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">Task Details</h1>
              <p className="text-sm text-muted-foreground">{task.report_number}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(task.status)}>
                      {toLabel(task.status)}
                    </Badge>
                    {task.severity && (
                      <Badge variant="outline" className={getSeverityColor(task.severity)}>
                        {toLabel(task.severity)} Priority
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">{task.title}</h2>
                  <p className="text-muted-foreground">{task.description}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Reported:</span>
                  <span className="font-medium">{formatDate(task.created_at)}</span>
                </div>
                {task.task?.assigned_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="font-medium">{getTimeAgo(task.task.assigned_at)}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Location */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Address</p>
                  <p className="font-medium">{task.address || 'Not provided'}</p>
                </div>
                {task.landmark && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Landmark</p>
                    <p className="font-medium">{task.landmark}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">GPS Coordinates</p>
                  <p className="font-mono text-sm">{task.latitude?.toFixed(6)}, {task.longitude?.toFixed(6)}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => {
                  window.open(`https://www.google.com/maps?q=${task.latitude},${task.longitude}`, '_blank');
                }}>
                  <Navigation className="w-4 h-4 mr-2" />
                  Get Directions
                </Button>
              </div>
            </Card>

            {/* Photos */}
            {task.media && task.media.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Citizen Photos ({task.media.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {task.media.map((media: any, index: number) => (
                    <div
                      key={media.id}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(`http://localhost:8000${media.file_url}`, '_blank')}
                    >
                      <img
                        src={`http://localhost:8000${media.file_url}`}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Status History */}
            {history.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Status History
                </h3>
                <div className="space-y-4">
                  {history.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-primary' : 'bg-muted'
                        }`}>
                          <CheckCircle2 className={`w-4 h-4 ${
                            index === 0 ? 'text-primary-foreground' : 'text-muted-foreground'
                          }`} />
                        </div>
                        {index < history.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getStatusColor(item.new_status)}>
                            {toLabel(item.new_status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(item.changed_at)}
                          </span>
                        </div>
                        {item.changed_by_user && (
                          <p className="text-sm text-muted-foreground">
                            by {item.changed_by_user.full_name}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-sm mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
              <div className="space-y-3">
                {canAcknowledge && (
                  <Button 
                    className="w-full" 
                    onClick={handleAcknowledge}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Acknowledge Task
                  </Button>
                )}
                {canStartWork && (
                  <Button 
                    className="w-full" 
                    onClick={handleStartWork}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4 mr-2" />
                    )}
                    Start Work
                  </Button>
                )}
                {canComplete && (
                  <>
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={handleAddUpdate}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Add Update
                    </Button>
                    <Button 
                      className="w-full" 
                      onClick={handleSubmitForVerification}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Submit for Verification
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full" 
                      onClick={handlePutOnHold}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Put On Hold
                    </Button>
                  </>
                )}
                {!canAcknowledge && !canStartWork && !canComplete && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No actions available for this task
                  </p>
                )}
              </div>
            </Card>

            {/* Citizen Information */}
            {task.user && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Citizen Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{task.user.full_name}</p>
                  </div>
                  {task.user.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contact</p>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Phone className="w-4 h-4 mr-2" />
                        {task.user.phone}
                      </Button>
                    </div>
                  )}
                  {task.user.reputation_points && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Reputation</p>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{task.user.reputation_points} points</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Department */}
            {task.department && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Department</h3>
                <p className="font-medium">{task.department.name}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
