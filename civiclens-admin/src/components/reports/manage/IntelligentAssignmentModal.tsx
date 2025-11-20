import React, { useState, useEffect, useMemo } from 'react';
import { Report, Department, User } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { reportsApi, OfficerWorkload, AutoAssignOfficerRequest } from '@/lib/api/reports';
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
  Star,
  TrendingUp,
  Clock,
  Activity,
  Sparkles,
  Brain,
  BarChart3
} from 'lucide-react';

interface IntelligentAssignmentModalProps {
  report: Report;
  onUpdate: () => void;
  onClose: () => void;
  type: 'department' | 'officer';
}

export function IntelligentAssignmentModal({ report, onUpdate, onClose, type }: IntelligentAssignmentModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [officerStats, setOfficerStats] = useState<OfficerWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  
  // Auto-assignment settings
  const [autoAssignMode, setAutoAssignMode] = useState<'manual' | 'auto-least-busy' | 'auto-balanced'>('manual');
  const [showWorkloadInfo, setShowWorkloadInfo] = useState(true);

  useEffect(() => {
    loadData();
  }, [type]);

  // Auto-select officer when auto-assignment mode changes
  useEffect(() => {
    if (type === 'officer' && autoAssignMode !== 'manual' && sortedOfficersByWorkload.length > 0) {
      setSelectedOfficer(sortedOfficersByWorkload[0].user_id);
    } else if (autoAssignMode === 'manual') {
      setSelectedOfficer(null);
    }
  }, [autoAssignMode, sortedOfficersByWorkload, type]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'department') {
        const depts = await departmentsApi.list();
        setDepartments(depts);
      } else {
        // Load departments, officers, and workload statistics
        const [depts, officersResponse, statsResponse] = await Promise.all([
          departmentsApi.list(),
          usersApi.listUsers({ per_page: 100, role: 'nodal_officer' }),
          reportsApi.getAllOfficersWorkload()
        ]);
        setDepartments(depts);
        setOfficers(officersResponse?.data || []);
        setOfficerStats(statsResponse?.officers || []);
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

  const getDepartmentName = (departmentId: number | null | undefined) => {
    if (!departmentId) return 'Unassigned';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Unknown Department';
  };

  const getOfficerWorkload = (officerId: number): OfficerWorkload | null => {
    return officerStats.find(stat => stat.user_id === officerId) || null;
  };

  // Filter officers by department (only show officers from the report's assigned department)
  const filteredOfficers = useMemo(() => {
    if (!report.department_id) return [];
    
    return officers.filter(officer => {
      const matchesSearch = !searchTerm || 
        officer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.phone?.includes(searchTerm);
      
      const matchesDepartment = officer.department_id === report.department_id;
      const isActive = officer.is_active;
      
      return matchesSearch && matchesDepartment && isActive;
    });
  }, [officers, report.department_id, searchTerm]);

  // Sort officers by workload for intelligent assignment
  const sortedOfficersByWorkload = useMemo(() => {
    return [...filteredOfficers].sort((a, b) => {
      const aWorkload = getOfficerWorkload(a.id);
      const bWorkload = getOfficerWorkload(b.id);
      
      if (autoAssignMode === 'auto-least-busy') {
        // Sort by least busy (lowest active reports)
        const aActive = aWorkload?.active_reports || 0;
        const bActive = bWorkload?.active_reports || 0;
        return aActive - bActive;
      } else if (autoAssignMode === 'auto-balanced') {
        // Sort by balanced workload (considers both active reports and resolution time)
        const aScore = aWorkload?.workload_score || 0;
        const bScore = bWorkload?.workload_score || 0;
        return aScore - bScore;
      }
      
      // Manual mode - sort by name
      return (a.full_name || '').localeCompare(b.full_name || '');
    });
  }, [filteredOfficers, autoAssignMode, officerStats]);

  const handleAssignDepartment = async () => {
    if (!selectedDepartment || !report.id) return;

    setSubmitting(true);
    setError(null);

    try {
      await reportsApi.assignDepartment(report.id, {
        department_id: selectedDepartment,
        notes: notes || undefined
      });
      
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!selectedOfficer || !report.id) return;

    setSubmitting(true);
    setError(null);

    try {
      if (autoAssignMode === 'manual') {
        // Manual assignment
        await reportsApi.assignOfficer(report.id, {
          officer_user_id: selectedOfficer,
          notes: notes || undefined
        });
      } else {
        // Auto-assignment with intelligent strategy
        const strategy = autoAssignMode === 'auto-least-busy' ? 'least_busy' : 'balanced';
        await reportsApi.autoAssignOfficer(report.id, {
          strategy,
          notes: notes || undefined
        });
      }
      
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to assign officer');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    !searchTerm || 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading {type === 'department' ? 'departments' : 'officers'}...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {type === 'department' ? (
                <Building2 className="w-5 h-5 text-blue-600" />
              ) : (
                <Brain className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {type === 'department' ? 'Assign Department' : 'Intelligent Officer Assignment'}
              </h3>
              <p className="text-sm text-gray-500">
                Report #{report.id} - {report.title}
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
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Department Assignment Check for Officer Assignment */}
          {type === 'officer' && !report.department_id && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-yellow-800 font-medium">Department Assignment Required</p>
                  <p className="text-yellow-700 text-sm">
                    Please assign a department to this report before assigning an officer.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Assignment Strategy Selection (Officer Only) */}
          {type === 'officer' && report.department_id && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <label className="block text-sm font-medium text-blue-800 mb-3">
                <Sparkles className="w-4 h-4 inline mr-1" />
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
                  <span className="text-sm">Manual Selection - Choose specific officer</span>
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
                  <span className="text-sm">Auto-Assign to Least Busy Officer</span>
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
                  <span className="text-sm">Auto-Assign with Balanced Workload</span>
                </label>
              </div>
            </div>
          )}

          {/* Auto-Assignment Preview */}
          {type === 'officer' && autoAssignMode !== 'manual' && sortedOfficersByWorkload.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {autoAssignMode === 'auto-least-busy' ? 'Least Busy Officer Selected' : 'Balanced Assignment Selected'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {(sortedOfficersByWorkload[0].full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {sortedOfficersByWorkload[0].full_name}
                  </p>
                  <p className="text-xs text-green-600">
                    {getOfficerWorkload(sortedOfficersByWorkload[0].id)?.active_reports || 0} active reports, 
                    {' '}{Math.round(getOfficerWorkload(sortedOfficersByWorkload[0].id)?.avg_resolution_time_days || 0)} days avg resolution
                  </p>
                </div>
              </div>
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
                            {(department as any).contact_email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span>{(department as any).contact_email}</span>
                              </div>
                            )}
                            {(department as any).contact_phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{(department as any).contact_phone}</span>
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
                  Select Officer ({filteredOfficers.length} available in {getDepartmentName(report.department_id)})
                </h4>
                <button
                  onClick={() => setShowWorkloadInfo(!showWorkloadInfo)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showWorkloadInfo ? 'Hide' : 'Show'} Workload Info
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(autoAssignMode === 'manual' ? filteredOfficers : sortedOfficersByWorkload).map((officer, index) => {
                  const roleConfig = getRoleConfig(officer.role);
                  const RoleIcon = roleConfig.icon;
                  const departmentName = getDepartmentName(officer.department_id);
                  const DepartmentIcon = getDepartmentIcon(departmentName);
                  const isSelected = selectedOfficer === officer.id;
                  const workload = getOfficerWorkload(officer.id);
                  const isRecommended = autoAssignMode !== 'manual' && index === 0;
                  
                  return (
                    <div
                      key={officer.id}
                      onClick={() => setSelectedOfficer(officer.id)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isRecommended
                          ? 'border-green-500 bg-green-50'
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
                          
                          {/* Workload Information */}
                          {showWorkloadInfo && workload && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-center">
                                  <div className={`font-bold ${
                                    workload.active_reports <= 5 ? 'text-green-600' :
                                    workload.active_reports <= 10 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {workload.active_reports}
                                  </div>
                                  <div className="text-gray-500">Active</div>
                                </div>
                                <div className="text-center">
                                  <div className={`font-bold ${
                                    workload.avg_resolution_time_days <= 3 ? 'text-green-600' :
                                    workload.avg_resolution_time_days <= 7 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {Math.round(workload.avg_resolution_time_days || 0)}d
                                  </div>
                                  <div className="text-gray-500">Avg Time</div>
                                </div>
                              </div>
                              {isRecommended && (
                                <div className="mt-2 text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                    <Star className="w-3 h-3 mr-1" />
                                    Recommended
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 mt-2">
                            <div className={`w-2 h-2 rounded-full ${officer.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-xs text-gray-500">
                              {officer.is_active ? 'Active' : 'Inactive'}
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
                      ? `No active officers found in ${getDepartmentName(report.department_id)}`
                      : 'Assign a department first to see available officers'
                    }
                  </p>
                  {report.department_id && (
                    <p className="text-gray-400 text-xs mt-2">
                      Officers can be assigned to departments from the Officers management page
                    </p>
                  )}
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
              (type === 'department' && !selectedDepartment) ||
              (type === 'officer' && (!report.department_id || (autoAssignMode === 'manual' && !selectedOfficer)))
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {autoAssignMode !== 'manual' && type === 'officer' && <Brain className="w-4 h-4" />}
            {submitting ? 'Assigning...' : 
              autoAssignMode !== 'manual' && type === 'officer' ? 'Auto-Assign Officer' :
              `Assign ${type === 'department' ? 'Department' : 'Officer'}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}