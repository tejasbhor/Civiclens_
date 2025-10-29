import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCircle2, Clock, AlertCircle, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: "update" | "resolved" | "assigned" | "message";
  title: string;
  message: string;
  time: string;
  read: boolean;
  reportId?: string;
}

const CitizenNotifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "update",
      title: "Report Update",
      message: "Your report #CL-2025-RNC-00016 status changed to In Progress",
      time: "1 hour ago",
      read: false,
      reportId: "CL-2025-RNC-00016"
    },
    {
      id: "2",
      type: "message",
      title: "Officer Message",
      message: "Officer Priya Singh added a note: 'Started work, clearing water logging'",
      time: "2 hours ago",
      read: false,
      reportId: "CL-2025-RNC-00016"
    },
    {
      id: "3",
      type: "resolved",
      title: "Report Resolved",
      message: "Your report #CL-2025-RNC-00015 has been marked as resolved. Please rate the service.",
      time: "1 day ago",
      read: true,
      reportId: "CL-2025-RNC-00015"
    },
    {
      id: "4",
      type: "assigned",
      title: "Report Assigned",
      message: "Your report #CL-2025-RNC-00016 has been assigned to Priya Singh from Public Works Department",
      time: "2 days ago",
      read: true,
      reportId: "CL-2025-RNC-00016"
    }
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "resolved":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "update":
        return <Clock className="w-5 h-5 text-amber-500" />;
      case "assigned":
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
      case "message":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(notif => 
      notif.id === id ? { ...notif, read: true } : notif
    ));
  };

  const handleDelete = (id: string) => {
    setNotifications(notifications.filter(notif => notif.id !== id));
    toast({
      title: "Notification Deleted",
      description: "The notification has been removed.",
    });
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    toast({
      title: "All Marked as Read",
      description: "All notifications have been marked as read.",
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/citizen/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">Notifications</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              Mark All Read
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {notifications.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Notifications</h3>
            <p className="text-muted-foreground">You're all caught up! Check back later for updates.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`p-4 transition-all hover:shadow-md ${!notification.read ? 'bg-accent/5 border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-foreground">{notification.title}</h4>
                      {!notification.read && (
                        <Badge variant="default" className="ml-2">New</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{notification.time}</span>
                      <div className="flex gap-2">
                        {notification.reportId && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/citizen/track/${notification.reportId}`)}
                          >
                            View Report
                          </Button>
                        )}
                        {!notification.read && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenNotifications;
