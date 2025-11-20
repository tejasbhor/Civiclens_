import React, { useState, useEffect, useMemo } from 'react';
import { Report, Department, User } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi, OfficerStats } from '@/lib/api/users';
import { reportsApi } from '@/lib/api/reports';
import { 
  Building2, 
  User as UserIcon, 
  X, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Users,
  Phone,
  Mail,
  Target,
  Settings,
  Shield,
  Zap,
  Droplets,
  Trash2,
  TreePine,
  MapPin,
  Calendar,
  Star,
  Award,
  TrendingUp
} from 'lucide-react';

interface AssignmentModalProps {
  isOpen: boolean;
  type: 'department' | 'officer';
  report: Report | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignmentModal({ isOpen, type, report, onClose, onSuccess }: AssignmentModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<number>(5);
  const [autoAssignMode, setAutoAssignMode] = useState<'manual' | 'auto-balanced' | 'auto-least-busy'>('manual');
  const [officerStats, setOfficerStats] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset state when modal opens
      setSelectedDepartment(null);
      setSelectedOfficer(null);
      setNotes('');
      setPriority(5);
      setSearchTerm('');
      setError(null);
    }
  }, [isOpen, type]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'department') {
        const depts = await departmentsApi.list();
        setDepartments(depts);
      } else {
        // For officer assignment, load departments, officers, and their statistics
        const [depts, officersResponse, statsResponse] = await Promise.all([
          departmentsApi.list(),
          usersApi.listUsers({ per_page: 100, role: 'nodal_officer' }),
          usersApi.getOfficerStats()
        ]);
        setDepartments(depts);
        setOfficers(officersResponse?.data || []);
        setOfficerStats(statsResponse || []);
      }
    } catch (err: any) {
      setError('Failed to load data');
      console.error('Error loading assignment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentIcon = (departmentName: string) => {
    if (departmentName.includes('Public Works')) return Building2;
    if (departmentName.includes('Water')) return Droplets;
    if (departmentName.includes('Sanitation')) return Trash2;
    if (departmentName.includes('Electrical')) return Zap;
    if (departmentName.includes('Horticulture')) return TreePine;
    return Building2;
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return { 
          label: 'Admin', 
          color: 'text-red-600 bg-red-50 border-red-200', 
          icon: Settings
        };
      case 'auditor':
        return { 
          label: 'Auditor', 
          color: 'text-purple-600 bg-purple-50 border-purple-200', 
          icon: Shield
        };
      case 'nodal_officer':
        return { 
          label: 'Nodal Officer', 
          color: 'text-green-600 bg-green-50 border-green-200', 
          icon: Target
        };
      default:
        return { 
          label: 'Officer', 
          color: 'text-gray-600 bg-gray-50 border-gray-200', 
          icon: Users
        };
    }
  };

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return { label: 'Expert', color: 'text-purple-600 bg-purple-50', icon: Award };
    if (reputation >= 500) return { label: 'Advanced', color: 'text-blue-600 bg-blue-50', icon: Star };
    if (reputation >= 100) return { label: 'Intermediate', color: 'text-green-600 bg-green-50', icon: TrendingUp };
    return { label: 'Beginner', color: 'text-gray-600 bg-gray-50', icon: Users };
  };

  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  // Filter officers based on department assignment and search
  const filteredOfficers = useMemo(() => {
    if (type !== 'officer') return [];
    
    return officers.filter(officer => {
      const matchesSearch = !searchTerm || 
        officer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.phone?.includes(searchTerm);
      
      // If report has department assigned, only show officers from that department
      const matchesDepartment = !report?.department_id || 
        officer.department_id === report.department_id;
      
      return matchesSearch && matchesDepartment && officer.is_active;
    });
  }, [officers, searchTerm, report?.department_id, type]);

  // Get officer workload statistics
  const getOfficerWorkload = (officerId: number) => {
    const stats = officerStats.find(s => s.user_id === officerId);
    return {
      activeReports: stats?.active_reports || 0,
      totalReports: stats?.total_reports || 0,
      avgResolutionTime: stats?.avg_resolution_time_days || 0,
      workloadScore: (stats?.active_reports || 0) + ((stats?.avg_resolution_time_days || 0) * 0.5)
    };
  };

  // Sort officers by workload for auto-assignment
  const sortedOfficersByWorkload = useMemo(() => {
    return [...filteredOfficers].sort((a, b) => {
      const aWorkload = getOfficerWorkload(a.id);
      const bWorkload = getOfficerWorkload(b.id);
      
      if (autoAssignMode === 'auto-least-busy') {
        // Sort by least busy (lowest workload score)
        return aWorkload.workloadScore - bWorkload.workloadScore;
      } else if (autoAssignMode === 'auto-balanced') {
        // Sort by balanced workload (considering both active reports and resolution time)
        const aBalance = aWorkload.activeReports * (aWorkload.avgResolutionTime || 1);
        const bBalance = bWorkload.activeReports * (bWorkload.avgResolutionTime || 1);
        return aBalance - bBalance;
      }
      
      // Manual mode - sort by reputation
      return (b.reputation_score || 0) - (a.reputation_score || 0);
    });
  }, [filteredOfficers, autoAssignMode, officerStats]);

  // Auto-select best officer based on mode
  useEffect(() => {
    if (type === 'officer' && autoAssignMode !== 'manual' && sortedOfficersByWorkload.length > 0) {
      setSelectedOfficer(sortedOfficersByWorkload[0].id);
    } else if (autoAssignMode === 'manual') {
      setSelectedOfficer(null);
    }
  }, [autoAssignMode, sortedOfficersByWorkload, type]);

  const filteredDepartments = useMemo(() => {
    if (type !== 'department') return [];
    
    return departments.filter(dept =>
      !searchTerm || 
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm, type]);

  const handleAssignDepartment = async () => {
    if (!selectedDepartment || !report?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      await reportsApi.assignDepartment(report.id, {
        department_id: selectedDepartment,
        notes: notes || undefined
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!selectedOfficer || !report?.id) return;

    setSubmitting(true);
    setError(null);

    try {
      await reportsApi.assignOfficer(report.id, {
        officer_user_id: selectedOfficer,
        priority: priority,
        notes: notes || undefined
      });
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign officer');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {type === 'department' ? (
                <Building2 className="w-5 h-5 text-blue-600" />
              ) : (
                <UserIcon className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assign {type === 'department' ? 'Department' : 'Officer'}
              </h3>
              <p className="text-sm text-gray-500">
                Report #{report.report_number || `CL-${report.id}`} - {report.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading {type === 'department' ? 'departments' : 'officers'}...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          ) : (
            <>
              {/* Current Assignment Info */}
              {report.department_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Current Assignment</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Department: {getDepartmentName(report.department_id)}
                  </p>
                  {report.task?.officer && (
                    <p className="text-sm text-blue-700">
                      Officer: {report.task.officer.full_name || report.task.officer.email}
                    </p>
                  )}
                </div>
              )}

              {/* Officer Assignment Constraint */}
              {type === 'officer' && !report.department_id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">Department Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    A department must be assigned to this report before assigning an officer.
                  </p>
                </div>
              )}

              {/* Officer Department Filter Info */}
              {type === 'officer' && report.department_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Department Filter Active</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Showing officers from {getDepartmentName(report.department_id)} only.
                  </p>
                </div>
              )}

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={`Search ${type === 'department' ? 'departments' : 'officers'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Department Selection */}
              {type === 'department' && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Select Department</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDepartments.map((department) => {
                      const DepartmentIcon = getDepartmentIcon(department.name);
                      const isSelected = selectedDepartment === department.id;
                      
                      return (
                        <div
                          key={department.id}
                          onClick={() => setSelectedDepartment(department.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              isSelected ? 'bg-blue-100' : 'bg-gray-100'
                            }`}>
                              <DepartmentIcon className={`w-5 h-5 ${
                                isSelected ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900">{department.name}</h5>
                              {department.description && (
                                <p className="text-sm text-gray-600 mt-1">{department.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                {department.contact_email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span>{department.contact_email}</span>
                                  </div>
                                )}
                                {department.contact_phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{department.contact_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Officer Selection */}
              {type === 'officer' && report.department_id && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Select Officer ({filteredOfficers.length} available)
                    </h4>
                    <div className="text-sm text-gray-500">
                      From {getDepartmentName(report.department_id)}
                    </div>
                  </div>
                  
                  {/* Assignment Mode Selection */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-800 mb-3">
                      Assignment Strategy
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="assignMode"
                          value="manual"
                          checked={autoAssignMode === 'manual'}
                          onChange={(e) => setAutoAssignMode(e.target.value as any)}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-blue-800">Manual Selection - Choose specific officer</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="assignMode"
                          value="auto-least-busy"
                          checked={autoAssignMode === 'auto-least-busy'}
                          onChange={(e) => setAutoAssignMode(e.target.value as any)}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-blue-800">Auto-Assign to Least Busy Officer</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="assignMode"
                          value="auto-balanced"
                          checked={autoAssignMode === 'auto-balanced'}
                          onChange={(e) => setAutoAssignMode(e.target.value as any)}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-blue-800">Auto-Assign with Balanced Workload</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Priority Selection */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assignment Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1 - Critical (Immediate attention)</option>
                      <option value={2}>2 - High (Within 24 hours)</option>
                      <option value={3}>3 - Medium-High (Within 2 days)</option>
                      <option value={4}>4 - Medium (Within 3 days)</option>
                      <option value={5}>5 - Normal (Within 1 week)</option>
                      <option value={6}>6 - Low (Within 2 weeks)</option>
                      <option value={7}>7 - Very Low (When available)</option>
                    </select>
                  </div>

                  {/* Auto-Assignment Preview */}
                  {autoAssignMode !== 'manual' && sortedOfficersByWorkload.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {autoAssignMode === 'auto-least-busy' ? 'Least Busy Officer Selected' : 'Balanced Assignment Selected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {(sortedOfficersByWorkload[0].full_name || sortedOfficersByWorkload[0].email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            {sortedOfficersByWorkload[0].full_name || sortedOfficersByWorkload[0].email}
                          </p>
                          <p className="text-xs text-green-600">
                            {getOfficerWorkload(sortedOfficersByWorkload[0].id).activeReports} active reports, 
                            {Math.round(getOfficerWorkload(sortedOfficersByWorkload[0].id).avgResolutionTime || 0)} days avg resolution
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredOfficers.map((officer) => {
                      const roleConfig = getRoleConfig(officer.role);
                      const reputationLevel = getReputationLevel(officer.reputation_score || 0);
                      const RoleIcon = roleConfig.icon;
                      const ReputationIcon = reputationLevel.icon;
                      const departmentName = getDepartmentName(officer.department_id);
                      const DepartmentIcon = getDepartmentIcon(departmentName);
                      const isSelected = selectedOfficer === officer.id;
                      
                      return (
                        <div
                          key={officer.id}
                          onClick={() => setSelectedOfficer(officer.id)}
                          className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {(officer.full_name || officer.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-gray-900">
                                  {officer.full_name || officer.email}
                                </h5>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${roleConfig.color}`}>
                                  <RoleIcon className="w-3 h-3 mr-1" />
                                  {roleConfig.label}
                                </span>
                              </div>
                              
                              <div className="space-y-1 text-sm text-gray-600">
                                {officer.email && (
                                  <div className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">{officer.email}</span>
                                  </div>
                                )}
                                {officer.phone && (
                                  <div className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    <span>{officer.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <DepartmentIcon className="w-3 h-3" />
                                  <span className="truncate">{departmentName}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 mt-2">
                                <ReputationIcon className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {officer.reputation_score || 0} reputation
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${reputationLevel.color}`}>
                                  {reputationLevel.label}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {filteredOfficers.length === 0 && (
                    <div className="text-center py-8">
                      <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No officers available</p>
                      <p className="text-gray-400 text-sm">
                        {report.department_id 
                          ? 'No officers found in the assigned department'
                          : 'Assign a department first to see available officers'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add any notes about this assignment..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={type === 'department' ? handleAssignDepartment : handleAssignOfficer}
            disabled={
              submitting || 
              loading ||
              (type === 'department' && !selectedDepartment) || 
              (type === 'officer' && (!selectedOfficer || !report?.department_id))
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {submitting ? 'Assigning...' : `Assign ${type === 'department' ? 'Department' : 'Officer'}`}
          </button>
        </div>
      </div>
    </div>
  );
}