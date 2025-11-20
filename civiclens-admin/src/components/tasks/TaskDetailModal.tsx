'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { 
  User, 
  MapPin, 
  Clock, 
  Phone, 
  Mail,
  FileText,
  Camera,
  Edit,
  UserCheck,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  Task, 
  getTaskStatusColor, 
  getTaskStatusIcon, 
  getPriorityColor, 
  getPriorityLabel,
  formatTaskDuration 
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils/cn';

interface TaskDetailModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onReassign: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  open,
  onClose,
  onEdit,
  onReassign
}) => {
  const statusColor = getTaskStatusColor(task.status);
  const statusIcon = getTaskStatusIcon(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const priorityLabel = getPriorityLabel(task.priority);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTaskProgress = () => {
    switch (task.status) {
      case 'assigned': return 20;
      case 'acknowledged': return 40;
      case 'in_progress': return 70;
      case 'pending_verification': return 90;
      case 'resolved': return 100;
      case 'rejected': return 100;
      default: return 0;
    }
  };

  const isOverdue = () => {
    if (task.status === 'resolved' || task.status === 'rejected') {
      return false;
    }
    
    const assignedDate = new Date(task.assigned_at);
    const now = new Date();
    const diffHours = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
    
    return diffHours > 48;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl">{statusIcon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span>Task #{task.id}</span>
                <Badge className={cn("text-xs", statusColor)}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge className={cn("text-xs", priorityColor)}>
                  {priorityLabel}
                </Badge>
                {isOverdue() && (
                  <Badge className="bg-red-100 text-red-800 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 font-normal mt-1">
                {task.report?.report_number || 'No report number'}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Task Progress</span>
              <span className="font-medium">{getTaskProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  task.status === 'resolved' ? "bg-green-500" :
                  task.status === 'rejected' ? "bg-red-500" :
                  "bg-blue-500"
                )}
                style={{ width: `${getTaskProgress()}%` }}
              />
            </div>
          </div>

          {/* Report Information */}
          {task.report && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Report Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{task.report.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{task.report.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{task.report.address || 'No address'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Reported by:</span>
                      <span className="font-medium">{task.report.user?.full_name || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Reported:</span>
                      <span className="font-medium">{formatDate(task.report.created_at)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">{task.report.category}</span>
                    </div>
                  </div>

                  {/* Report Media */}
                  {task.report.media && task.report.media.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Attachments ({task.report.media.length})
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {task.report.media.map((media) => (
                          <div key={media.id} className="relative group">
                            {media.file_type.startsWith('image/') ? (
                              <img
                                src={`/api/v1/media/${media.file_path}`}
                                alt="Report attachment"
                                className="w-full h-20 object-cover rounded-lg border"
                              />
                            ) : (
                              <div className="w-full h-20 bg-gray-100 rounded-lg border flex items-center justify-center">
                                <FileText className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Officer Information */}
          {task.officer && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  Assigned Officer
                </h3>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{task.officer.full_name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{task.officer.role}</p>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{task.officer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span>{task.officer.email}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Timeline */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Task Assigned</p>
                    <p className="text-xs text-gray-500">{formatDate(task.assigned_at)}</p>
                  </div>
                </div>
                
                {task.acknowledged_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Task Acknowledged</p>
                      <p className="text-xs text-gray-500">{formatDate(task.acknowledged_at)}</p>
                    </div>
                  </div>
                )}
                
                {task.started_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Work Started</p>
                      <p className="text-xs text-gray-500">{formatDate(task.started_at)}</p>
                    </div>
                  </div>
                )}
                
                {task.resolved_at && (
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      task.status === 'resolved' ? "bg-green-500" : "bg-red-500"
                    )}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Task {task.status === 'resolved' ? 'Resolved' : 'Rejected'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(task.resolved_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(task.notes || task.resolution_notes) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                
                <div className="space-y-3">
                  {task.notes && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Task Notes</h4>
                      <p className="text-sm text-blue-800">{task.notes}</p>
                    </div>
                  )}
                  
                  {task.resolution_notes && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="text-sm font-medium text-green-900 mb-1">Resolution Notes</h4>
                      <p className="text-sm text-green-800">{task.resolution_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button onClick={onEdit} className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Edit Task
            </Button>
            
            <Button variant="outline" onClick={onReassign} className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Reassign
            </Button>
            
            <Button variant="outline" onClick={onClose} className="ml-auto">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};