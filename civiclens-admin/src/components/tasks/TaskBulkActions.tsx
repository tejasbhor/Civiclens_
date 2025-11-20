'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/Badge';
import { 
  CheckSquare, 
  X,
  AlertTriangle,
  Users,
  Edit
} from 'lucide-react';
import { 
  TaskStatus, 
  TaskUpdate,
  tasksApi,
  getTaskStatusColor
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface TaskBulkActionsProps {
  taskIds: number[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const TaskBulkActions: React.FC<TaskBulkActionsProps> = ({
  taskIds,
  open,
  onClose,
  onComplete
}) => {
  const [action, setAction] = useState<'status' | 'priority' | ''>('');
  const [newStatus, setNewStatus] = useState<TaskStatus | ''>('');
  const [newPriority, setNewPriority] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleBulkUpdate = async () => {
    if (!action) {
      toast.error('Please select an action');
      return;
    }

    if (action === 'status' && !newStatus) {
      toast.error('Please select a status');
      return;
    }

    if (action === 'priority' && !newPriority) {
      toast.error('Please select a priority');
      return;
    }

    setProcessing(true);
    try {
      const updates: TaskUpdate = {};
      
      if (action === 'status') {
        updates.status = newStatus as TaskStatus;
      } else if (action === 'priority') {
        updates.priority = newPriority as number;
      }

      if (notes.trim()) {
        updates.notes = notes.trim();
      }

      const result = await tasksApi.bulkUpdateTasks(taskIds, updates);
      
      toast.success(`Successfully updated ${result.updated_count} task${result.updated_count !== 1 ? 's' : ''}`);
      onComplete();
    } catch (error: any) {
      console.error('Bulk update failed:', error);
      toast.error(error.response?.data?.detail || 'Failed to update tasks');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setAction('');
    setNewStatus('');
    setNewPriority('');
    setNotes('');
    onClose();
  };

  const getStatusOptions = () => [
    { value: TaskStatus.ASSIGNED, label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
    { value: TaskStatus.ACKNOWLEDGED, label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-800' },
    { value: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { value: TaskStatus.PENDING_VERIFICATION, label: 'Pending Verification', color: 'bg-purple-100 text-purple-800' },
    { value: TaskStatus.RESOLVED, label: 'Resolved', color: 'bg-green-100 text-green-800' },
    { value: TaskStatus.REJECTED, label: 'Rejected', color: 'bg-red-100 text-red-800' },
    { value: TaskStatus.ON_HOLD, label: 'On Hold', color: 'bg-gray-100 text-gray-800' }
  ];

  const getPriorityOptions = () => [
    { value: 1, label: 'Very Low (1)', color: 'bg-green-100 text-green-800' },
    { value: 2, label: 'Low (2)', color: 'bg-green-100 text-green-800' },
    { value: 3, label: 'Low-Medium (3)', color: 'bg-green-100 text-green-800' },
    { value: 4, label: 'Medium (4)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 5, label: 'Medium (5)', color: 'bg-yellow-100 text-yellow-800' },
    { value: 6, label: 'High (6)', color: 'bg-orange-100 text-orange-800' },
    { value: 7, label: 'High (7)', color: 'bg-orange-100 text-orange-800' },
    { value: 8, label: 'Critical (8)', color: 'bg-red-100 text-red-800' },
    { value: 9, label: 'Critical (9)', color: 'bg-red-100 text-red-800' },
    { value: 10, label: 'Emergency (10)', color: 'bg-red-100 text-red-800' }
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Bulk Update Tasks
            <Badge className="bg-blue-100 text-blue-800">
              {taskIds.length} task{taskIds.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Bulk Action Warning</p>
                <p className="text-yellow-700">
                  This action will update <strong>{taskIds.length}</strong> task{taskIds.length !== 1 ? 's' : ''} simultaneously. 
                  All affected officers will be notified of the changes.
                </p>
              </div>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-2">
            <Label>Select Action</Label>
            <SimpleSelect 
              value={action} 
              onChange={(e) => setAction(e.target.value as 'status' | 'priority' | '')}
              placeholder="Choose what to update"
            >
              <option value="">Choose what to update</option>
              <option value="status">Update Status</option>
              <option value="priority">Update Priority</option>
            </SimpleSelect>
          </div>

          {/* Status Selection */}
          {action === 'status' && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <SimpleSelect 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                placeholder="Select new status"
              >
                <option value="">Select new status</option>
                {getStatusOptions().map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </SimpleSelect>
              
              {newStatus && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Changing status to <strong>{newStatus.replace('_', ' ')}</strong> will:
                  </p>
                  <ul className="text-sm text-blue-700 mt-1 ml-4 list-disc">
                    <li>Update the task timeline for all selected tasks</li>
                    <li>Send notifications to assigned officers</li>
                    <li>Update report status if applicable</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Priority Selection */}
          {action === 'priority' && (
            <div className="space-y-2">
              <Label>New Priority</Label>
              <SimpleSelect 
                value={newPriority?.toString()} 
                onChange={(e) => setNewPriority(parseInt(e.target.value))}
                placeholder="Select new priority"
              >
                <option value="">Select new priority</option>
                {getPriorityOptions().map((priority) => (
                  <option key={priority.value} value={priority.value.toString()}>
                    {priority.label}
                  </option>
                ))}
              </SimpleSelect>
              
              {newPriority && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Priority Change:</strong> Setting priority to <strong>{newPriority}</strong> will:
                  </p>
                  <ul className="text-sm text-orange-700 mt-1 ml-4 list-disc">
                    <li>Reorder tasks in officer queues</li>
                    <li>Trigger priority-based notifications</li>
                    <li>Update task assignment algorithms</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this bulk update..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              These notes will be added to all selected tasks
            </p>
          </div>

          {/* Task Count Summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">
                  {taskIds.length} Task{taskIds.length !== 1 ? 's' : ''} Selected
                </p>
                <p className="text-sm text-gray-600">
                  All selected tasks will be updated with the same changes
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={handleBulkUpdate} 
              disabled={!action || processing || (action === 'status' && !newStatus) || (action === 'priority' && !newPriority)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {processing ? 'Updating...' : `Update ${taskIds.length} Task${taskIds.length !== 1 ? 's' : ''}`}
            </Button>
            
            <Button variant="outline" onClick={handleClose} className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};