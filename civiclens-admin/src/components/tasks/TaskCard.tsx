'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle, 
  Eye,
  Edit,
  UserCheck
} from 'lucide-react';
import { 
  Task, 
  TaskStatus, 
  getTaskStatusColor, 
  getTaskStatusIcon, 
  getPriorityColor, 
  getPriorityLabel,
  formatTaskDuration 
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils/cn';

interface TaskCardProps {
  task: Task;
  onView: (task: Task) => void;
  onEdit: (task: Task) => void;
  onReassign: (task: Task) => void;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onView,
  onEdit,
  onReassign,
  className
}) => {
  const statusColor = getTaskStatusColor(task.status);
  const statusIcon = getTaskStatusIcon(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const priorityLabel = getPriorityLabel(task.priority);

  const isOverdue = () => {
    if (task.status === TaskStatus.RESOLVED || task.status === TaskStatus.REJECTED) {
      return false;
    }
    
    const assignedDate = new Date(task.assigned_at);
    const now = new Date();
    const diffHours = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
    
    // Consider overdue if assigned for more than 48 hours without progress
    return diffHours > 48 && task.status === TaskStatus.ASSIGNED;
  };

  const getTaskAge = () => {
    return formatTaskDuration(task.assigned_at);
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-all duration-200 border-l-4",
      task.priority >= 8 ? "border-l-red-500" : 
      task.priority >= 6 ? "border-l-orange-500" : 
      task.priority >= 4 ? "border-l-yellow-500" : "border-l-green-500",
      isOverdue() && "bg-red-50 border-red-200",
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusIcon}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {task.report?.report_number || `Task #${task.id}`}
              </h3>
              <p className="text-xs text-gray-500">
                {task.report?.title || 'No title'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge className={cn("text-xs px-2 py-1", statusColor)}>
              {task.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge className={cn("text-xs px-2 py-1", priorityColor)}>
              {priorityLabel}
            </Badge>
          </div>
        </div>

        {/* Report Details */}
        {task.report && (
          <div className="mb-3">
            <p className="text-sm text-gray-700 line-clamp-2 mb-2">
              {task.report.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[120px]">
                  {task.report.address || 'No address'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{task.report.user?.full_name || 'Unknown'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Officer Info */}
        {task.officer && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {task.officer.full_name}
                </p>
                <p className="text-xs text-gray-500">
                  {task.officer.phone}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Timing Info */}
        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Assigned {getTaskAge()} ago</span>
          </div>
          
          {isOverdue() && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-medium">Overdue</span>
            </div>
          )}
        </div>

        {/* Progress Indicators */}
        <div className="mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Progress:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  task.status === TaskStatus.ASSIGNED ? "bg-blue-500 w-1/6" :
                  task.status === TaskStatus.ACKNOWLEDGED ? "bg-indigo-500 w-2/6" :
                  task.status === TaskStatus.IN_PROGRESS ? "bg-yellow-500 w-4/6" :
                  task.status === TaskStatus.PENDING_VERIFICATION ? "bg-purple-500 w-5/6" :
                  task.status === TaskStatus.RESOLVED ? "bg-green-500 w-full" :
                  task.status === TaskStatus.REJECTED ? "bg-red-500 w-full" :
                  "bg-gray-500 w-1/6"
                )}
              />
            </div>
          </div>
        </div>

        {/* Notes Preview */}
        {task.notes && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 line-clamp-2">
              <span className="font-medium">Note:</span> {task.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(task)}
            className="flex-1 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            View
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(task)}
            className="flex-1 text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReassign(task)}
            className="flex-1 text-xs"
          >
            <UserCheck className="w-3 h-3 mr-1" />
            Reassign
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};