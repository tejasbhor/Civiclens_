import React, { useState, useEffect } from 'react';
import { Report, Department, User } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
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
  TreePine
} from 'lucide-react';

interface AssignmentModalsProps {
  report: Report;
  onUpdate: () => void;
  onClose: () => void;
  type: 'department' | 'officer';
}

export function AssignmentModals({ report, onUpdate, onClose, type }: AssignmentModalsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [type]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (type === 'department') {
        const depts = await departmentsApi.list();
        setDepartments(depts);
      } else {
        // Load both departments and officers for officer assignment
        const [depts, officersResponse] = await Promise.all([
          departmentsApi.list(),
          usersApi.listUsers({ per_page: 100, role: 'nodal_officer' })
        ]);
        setDepartments(depts);
        setOfficers(officersResponse?.data || []);
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
      await reportsApi.assignOfficer(report.id, {
        officer_user_id: selectedOfficer,
        notes: notes || undefined
      });
      
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

  const filteredOfficers = officers.filter(officer => {
    const matchesSearch = !searchTerm || 
      officer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.phone?.includes(searchTerm);
    
    const matchesDepartment = !selectedDepartment || 
      officer.department_id === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

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

          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
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

            {type === 'officer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Department
                </label>
                <select
                  value={selectedDepartment || ''}
                  onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            )}
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
          {type === 'officer' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Select Officer ({filteredOfficers.length} available)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredOfficers.map((officer) => {
                  const roleConfig = getRoleConfig(officer.role);
                  const RoleIcon = roleConfig.icon;
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
                  <p className="text-gray-500 font-medium">No officers found</p>
                  <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
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
              (type === 'officer' && !selectedOfficer)
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