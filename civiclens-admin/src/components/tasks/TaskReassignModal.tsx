'use client';

import React, { useState, useEffect } from 'react';
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
import { Card, CardContent } from '@/components/ui/Card';
import { 
  UserCheck, 
  X,
  Search,
  User as UserIcon,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  CheckCircle2
} from 'lucide-react';
import { Task } from '@/lib/api/tasks';
import { usersApi } from '@/lib/api/users';
import { departmentsApi } from '@/lib/api/departments';
import { User, Department } from '@/types';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

interface TaskReassignModalProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  onReassign: (newOfficerId: number) => void;
}

export const TaskReassignModal: React.FC<TaskReassignModalProps> = ({
  task,
  open,
  onClose,
  onReassign
}) => {
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState<User | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [reassignReason, setReassignReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [officersData, departmentsData] = await Promise.all([
        usersApi.getOfficers(),
        departmentsApi.getDepartments()
      ]);
      
      setOfficers(officersData);
      setDepartments(departmentsData);
      
      // Pre-select current department if available
      if (task.report?.department?.id) {
        setSelectedDepartment(task.report.department.id.toString());
      }
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.response?.data?.detail || 'Failed to load officers and departments');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOfficers = () => {
    let filtered = officers.filter(officer => officer.id !== task.assigned_to);
    
    // Filter by department
    if (selectedDepartment) {
      filtered = filtered.filter(officer => 
        officer.department_id?.toString() === selectedDepartment
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(officer =>
        officer.full_name?.toLowerCase().includes(query) ||
        officer.phone?.includes(query) ||
        officer.email?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const getOfficerWorkload = (officerId: number) => {
    // This would typically come from the API
    // For now, return a mock workload
    return Math.floor(Math.random() * 15) + 1;
  };

  const getWorkloadColor = (workload: number) => {
    if (workload <= 5) return 'text-green-600';
    if (workload <= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getWorkloadLabel = (workload: number) => {
    if (workload <= 5) return 'Light';
    if (workload <= 10) return 'Moderate';
    return 'Heavy';
  };

  const handleReassign = async () => {
    if (!selectedOfficer) {
      toast.error('Please select an officer to reassign the task');
      return;
    }

    if (!reassignReason.trim()) {
      toast.error('Please provide a reason for reassignment');
      return;
    }

    setReassigning(true);
    try {
      await onReassign(selectedOfficer.id);
      toast.success(`Task reassigned to ${selectedOfficer.full_name}`);
      onClose();
    } catch (error) {
      console.error('Failed to reassign task:', error);
      toast.error('Failed to reassign task');
    } finally {
      setReassigning(false);
    }
  };

  const handleClose = () => {
    setSelectedOfficer(null);
    setSelectedDepartment('');
    setSearchQuery('');
    setReassignReason('');
    onClose();
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading officers...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Reassign Task #{task.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignment */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-2">Current Assignment</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {task.officer?.full_name || 'Unassigned'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {task.officer?.phone || 'No phone'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <h4 className="font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    className="ml-auto"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <SimpleSelect
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                placeholder="All departments"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </option>
                ))}
              </SimpleSelect>
            </div>

            <div className="space-y-2">
              <Label>Search Officers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Officers List */}
          <div className="space-y-2">
            <Label>Select New Officer</Label>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
              {getFilteredOfficers().length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No officers found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                getFilteredOfficers().map((officer) => {
                  const workload = getOfficerWorkload(officer.id);
                  const isSelected = selectedOfficer?.id === officer.id;
                  
                  return (
                    <Card
                      key={officer.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                      )}
                      onClick={() => setSelectedOfficer(officer)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{officer.full_name}</h4>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{officer.phone || 'N/A'}</span>
                              </div>
                              {officer.email && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span>{officer.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        
                        <div className="text-right">
                          <Badge className={cn(
                            "text-xs",
                            workload <= 5 ? "bg-green-100 text-green-800" :
                            workload <= 10 ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          )}>
                            {workload} tasks
                          </Badge>
                          <p className={cn(
                            "text-xs font-medium mt-1",
                            getWorkloadColor(workload)
                          )}>
                            {getWorkloadLabel(workload)} load
                          </p>
                        </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button 
              onClick={handleReassign} 
              disabled={!selectedOfficer || !reassignReason.trim() || reassigning}
              className="flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {reassigning ? 'Reassigning...' : 'Reassign Task'}
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