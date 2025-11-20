'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { SimpleSelect } from '@/components/ui/select';
import { Badge } from '@/components/ui/Badge';
import { 
  Save, 
  X,
  AlertTriangle
} from 'lucide-react';
import { 
  Task, 
  TaskStatus, 
  TaskUpdate,
  getTaskStatusColor,
  getPriorityColor,
  getPriorityLabel
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface TaskEditModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onSave: (updates: TaskUpdate) => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  open,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<TaskUpdate>({
    status: task.status,
    priority: task.priority,
    notes: task.notes || '',
    resolution_notes: task.resolution_notes || ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof TaskUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate status transitions
    const currentStatus = task.status;
    const newStatus = formData.status;

    if (newStatus && newStatus !== currentStatus) {
      const validTransitions: Record<string, string[]> = {
        'assigned': ['acknowledged', 'rejected', 'on_hold'],
        'acknowledged': ['in_progress', 'rejected', 'on_hold'],
        'in_progress': ['pending_verification', 'resolved', 'rejected', 'on_hold'],
        'pending_verification': ['resolved', 'rejected', 'in_progress'],
        'on_hold': ['assigned', 'acknowledged', 'in_progress'],
        'resolved': [], // Final state
        'rejected': [] // Final state
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        newErrors.status = `Cannot change status from ${currentStatus} to ${newStatus}`;
      }
    }

    // Validate priority
    if (formData.priority !== undefined && (formData.priority < 1 || formData.priority > 10)) {
      newErrors.priority = 'Priority must be between 1 and 10';
    }

    // Validate resolution notes for resolved/rejected status
    if ((formData.status === 'resolved' || formData.status === 'rejected') && 
        !formData.resolution_notes?.trim()) {
      newErrors.resolution_notes = 'Resolution notes are required when resolving or rejecting a task';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      // Only send changed fields
      const updates: TaskUpdate = {};
      
      if (formData.status !== task.status) {
        updates.status = formData.status;
      }
      
      if (formData.priority !== task.priority) {
        updates.priority = formData.priority;
      }
      
      if (formData.notes !== (task.notes || '')) {
        updates.notes = formData.notes;
      }
      
      if (formData.resolution_notes !== (task.resolution_notes || '')) {
        updates.resolution_notes = formData.resolution_notes;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        onClose();
        return;
      }

      await onSave(updates);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task changes');
    } finally {
      setSaving(false);
    }
  };

  const getStatusOptions = () => {
    const currentStatus = task.status;
    const allStatuses = [
      { value: TaskStatus.ASSIGNED, label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
      { value: TaskStatus.ACKNOWLEDGED, label: 'Acknowledged', color: 'bg-indigo-100 text-indigo-800' },
      { value: TaskStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
      { value: TaskStatus.PENDING_VERIFICATION, label: 'Pending Verification', color: 'bg-purple-100 text-purple-800' },
      { value: TaskStatus.RESOLVED, label: 'Resolved', color: 'bg-green-100 text-green-800' },
      { value: TaskStatus.REJECTED, label: 'Rejected', color: 'bg-red-100 text-red-800' },
      { value: TaskStatus.ON_HOLD, label: 'On Hold', color: 'bg-gray-100 text-gray-800' }
    ];

    // Define valid transitions
    const validTransitions: Record<string, string[]> = {
      'assigned': ['acknowledged', 'rejected', 'on_hold'],
      'acknowledged': ['in_progress', 'rejected', 'on_hold'],
      'in_progress': ['pending_verification', 'resolved', 'rejected', 'on_hold'],
      'pending_verification': ['resolved', 'rejected', 'in_progress'],
      'on_hold': ['assigned', 'acknowledged', 'in_progress'],
      'resolved': ['resolved'], // Can only stay resolved
      'rejected': ['rejected'] // Can only stay rejected
    };

    const allowedStatuses = [currentStatus, ...(validTransitions[currentStatus] || [])];
    
    return allStatuses.filter(status => allowedStatuses.includes(status.value));
  };

  const getPriorityOptions = () => [
    { value: 1, label: 'Very Low', color: 'bg-green-100 text-green-800' },
    { value: 2, label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 3, label: 'Low-Medium', color: 'bg-green-100 text-green-800' },
    { value: 4, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 5, label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 6, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 7, label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 8, label: 'Critical', color: 'bg-red-100 text-red-800' },
    { value: 9, label: 'Critical', color: 'bg-red-100 text-red-800' },
    { value: 10, label: 'Emergency', color: 'bg-red-100 text-red-800' }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Task #{task.id}
            <Badge className={cn("text-xs", getTaskStatusColor(task.status))}>
              Current: {task.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Task Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Task Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Report:</span> {task.report?.report_number || 'N/A'}</p>
              <p><span className="font-medium">Title:</span> {task.report?.title || 'No title'}</p>
              <p><span className="font-medium">Officer:</span> {task.officer?.full_name || 'Unassigned'}</p>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SimpleSelect
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
              placeholder="Select status"
            >
              {getStatusOptions().map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </SimpleSelect>
            {errors.status && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.status}
              </p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <SimpleSelect
              value={formData.priority?.toString()}
              onChange={(e) => handleInputChange('priority', parseInt(e.target.value))}
              placeholder="Select priority"
            >
              {getPriorityOptions().map((priority) => (
                <option key={priority.value} value={priority.value.toString()}>
                  {priority.label} ({priority.value})
                </option>
              ))}
            </SimpleSelect>
            {errors.priority && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.priority}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Task Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this task..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              Internal notes visible to administrators and officers
            </p>
          </div>

          {/* Resolution Notes */}
          <div className="space-y-2">
            <Label htmlFor="resolution_notes">Resolution Notes</Label>
            <Textarea
              id="resolution_notes"
              placeholder="Add resolution details (required for resolved/rejected tasks)..."
              value={formData.resolution_notes}
              onChange={(e) => handleInputChange('resolution_notes', e.target.value)}
              rows={3}
            />
            {errors.resolution_notes && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errors.resolution_notes}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Details about how the task was resolved (visible to citizens)
            </p>
          </div>

          {/* Status Change Warning */}
          {formData.status !== task.status && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800">Status Change Warning</p>
                  <p className="text-yellow-700">
                    Changing status from <strong>{task.status}</strong> to <strong>{formData.status}</strong> 
                    will notify the assigned officer and update the report timeline.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            
            <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};