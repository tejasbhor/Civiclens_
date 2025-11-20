"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { usersApi, OfficerStats } from '@/lib/api/users';
import { departmentsApi } from '@/lib/api/departments';
import { User, Department } from '@/types';
import { AddOfficerModal } from '@/components/officers/AddOfficerModal';
import { 
  Users, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Award, 
  Shield, 
  Star, 
  Search, 
  RefreshCw, 
  Settings, 
  BarChart3, 
  Target, 
  Zap,
  Droplets,
  Trash2,
  TreePine,
  UserPlus
} from 'lucide-react';

export default function OfficersPage() {
  const [officers, setOfficers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [officerStats, setOfficerStats] = useState<OfficerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Get user role from localStorage
    const role = localStorage.getItem('user_role');
    setUserRole(role);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [officersResponse, departmentsResponse, statsResponse] = await Promise.all([
        usersApi.listUsers({ per_page: 100 }),
        departmentsApi.list(),
        usersApi.getOfficerStats()
      ]);
      
      // Filter for officers and staff only
      const officerRoles = ['nodal_officer', 'admin', 'auditor'];
      const filteredOfficers = (officersResponse?.data || []).filter(user => 
        officerRoles.includes(user.role)
      );
      
      setOfficers(filteredOfficers);
      setDepartments(departmentsResponse || []);
      setOfficerStats(statsResponse || []);
    } catch (err: any) {
      setError('Failed to load officers data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'admin':
        return { 
          label: 'Admin', 
          color: 'text-red-600 bg-red-50 border-red-200', 
          icon: Settings,
          priority: 1
        };
      case 'auditor':
        return { 
          label: 'Auditor', 
          color: 'text-purple-600 bg-purple-50 border-purple-200', 
          icon: Shield,
          priority: 2
        };
      case 'nodal_officer':
        return { 
          label: 'Nodal Officer', 
          color: 'text-green-600 bg-green-50 border-green-200', 
          icon: Target,
          priority: 3
        };
      default:
        return { 
          label: 'Officer', 
          color: 'text-gray-600 bg-gray-50 border-gray-200', 
          icon: Users,
          priority: 4
        };
    }
  };

  const getReputationLevel = (reputation: number) => {
    if (reputation >= 1000) return { label: 'Expert', color: 'text-purple-600 bg-purple-50', icon: Award };
    if (reputation >= 500) return { label: 'Advanced', color: 'text-blue-600 bg-blue-50', icon: Star };
    if (reputation >= 100) return { label: 'Intermediate', color: 'text-green-600 bg-green-50', icon: TrendingUp };
    return { label: 'Beginner', color: 'text-gray-600 bg-gray-50', icon: Users };
  };

  const getDepartmentName = (officer: User) => {
    // First try to get department name from officer stats (includes department_name)
    const stats = officerStats.find(s => s.user_id === officer.id);
    if (stats?.department_name) {
      return stats.department_name;
    }
    
    // Fallback to looking up in departments array
    if (!officer.department_id) return 'Unassigned';
    const dept = departments.find(d => d.id === officer.department_id);
    return dept?.name || 'Unknown Department';
  };

  const getDepartmentIcon = (departmentName: string) => {
    if (departmentName.includes('Public Works')) return Building2;
    if (departmentName.includes('Water')) return Droplets;
    if (departmentName.includes('Sanitation')) return Trash2;
    if (departmentName.includes('Electrical')) return Zap;
    if (departmentName.includes('Horticulture')) return TreePine;
    return Building2;
  };

  const formatResolutionTime = (days: number | null | undefined): string => {
    if (!days || days === 0) return '0 days';
    
    if (days < 1) {
      return '< 1 day';
    }
    
    const roundedDays = Math.round(days);
    return `${roundedDays} day${roundedDays !== 1 ? 's' : ''}`;
  };

  const getOfficerStats = (officer: User) => {
    const stats = officerStats.find(s => s.user_id === officer.id);
    if (stats) {
      return {
        totalReports: stats.total_reports,
        resolvedReports: stats.resolved_reports,
        avgResolutionTime: stats.avg_resolution_time_days || 0,
        avgResolutionTimeFormatted: formatResolutionTime(stats.avg_resolution_time_days),
        activeReports: stats.active_reports
      };
    }
    
    // Fallback to zero stats if no data available
    return {
      totalReports: 0,
      resolvedReports: 0,
      avgResolutionTime: 0,
      avgResolutionTimeFormatted: '0 days',
      activeReports: 0
    };
  };

  // Filter officers based on search and filters
  const filteredOfficers = useMemo(() => {
    return officers.filter(officer => {
      const matchesSearch = !searchTerm || 
        officer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        officer.phone?.includes(searchTerm) ||
        getDepartmentName(officer).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = selectedDepartment === 'all' || 
        officer.department_id?.toString() === selectedDepartment;
      
      const matchesRole = selectedRole === 'all' || officer.role === selectedRole;
      
      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [officers, searchTerm, selectedDepartment, selectedRole, departments]);

  // Sort officers by role priority and reputation
  const sortedOfficers = useMemo(() => {
    return filteredOfficers.sort((a, b) => {
      const aRole = getRoleConfig(a.role);
      const bRole = getRoleConfig(b.role);
      
      if (aRole.priority !== bRole.priority) {
        return aRole.priority - bRole.priority;
      }
      
      return (b.reputation_score || 0) - (a.reputation_score || 0);
    });
  }, [filteredOfficers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading officers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-status-rejected mx-auto mb-4" />
          <p className="text-status-rejected font-medium mb-4">{error}</p>
          <button 
            onClick={loadData}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-600 rounded-lg shadow-sm">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Officers</h1>
            <p className="text-sm text-gray-600">Government Officials & Staff</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Add Officer Button - Only for Admin/Super Admin */}
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              Add Officer
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary-600">{officers.length}</div>
            <div className="text-sm text-gray-500">Total Officers</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Filters */}
        <div className="card">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search officers by name, email, phone, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input min-w-[160px]"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id.toString()}>{dept.name}</option>
                ))}
              </select>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input min-w-[120px]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="auditor">Auditor</option>
                <option value="nodal_officer">Nodal Officer</option>
              </select>
            </div>
          </div>
        </div>

        {/* Officers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedOfficers.map((officer) => {
            const roleConfig = getRoleConfig(officer.role);
            const reputationLevel = getReputationLevel(officer.reputation_score || 0);
            const stats = getOfficerStats(officer);
            const RoleIcon = roleConfig.icon;
            const ReputationIcon = reputationLevel.icon;
            const departmentName = getDepartmentName(officer);
            const DepartmentIcon = getDepartmentIcon(departmentName);
            
            return (
              <div key={officer.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        {(officer.full_name || officer.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">{officer.full_name || officer.email}</h3>
                        <p className="text-xs text-gray-500">{departmentName}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`badge text-xs ${roleConfig.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    {officer.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="truncate">{officer.email}</span>
                      </div>
                    )}
                    {officer.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{officer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <DepartmentIcon className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{departmentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>Joined {new Date(officer.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <ReputationIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 font-medium">Reputation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{officer.reputation_score || 0}</span>
                      <span className={`badge text-xs ${reputationLevel.color}`}>
                        {reputationLevel.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary-600">{stats.totalReports}</div>
                      <div className="text-xs text-gray-500 font-medium">Total Reports</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-status-resolved">{stats.resolvedReports}</div>
                      <div className="text-xs text-gray-500 font-medium">Resolved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-status-progress">{stats.activeReports}</div>
                      <div className="text-xs text-gray-500 font-medium">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{stats.avgResolutionTimeFormatted}</div>
                      <div className="text-xs text-gray-500 font-medium">Avg Time</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${officer.is_active ? 'bg-status-resolved' : 'bg-status-rejected'}`}></div>
                      <span className="text-xs text-gray-600 font-medium">{officer.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <button className="text-primary-600 hover:text-primary-700 text-xs font-medium transition-colors">
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Officers Table */}
        <div className="card p-0">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Officers Overview</h2>
              </div>
              <div className="text-sm text-gray-500">
                Showing {filteredOfficers.length} of {officers.length} officers
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Officer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reputation</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reports</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedOfficers.slice(0, 10).map((officer) => {
                  const roleConfig = getRoleConfig(officer.role);
                  const reputationLevel = getReputationLevel(officer.reputation_score || 0);
                  const stats = getOfficerStats(officer);
                  const RoleIcon = roleConfig.icon;
                  const departmentName = getDepartmentName(officer);
                  const DepartmentIcon = getDepartmentIcon(departmentName);
                  
                  return (
                    <tr key={officer.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                            {(officer.full_name || officer.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 truncate max-w-48">{officer.full_name || officer.email}</p>
                            <p className="text-sm text-gray-500">{officer.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${roleConfig.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <DepartmentIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{departmentName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{officer.reputation_score || 0}</span>
                          <span className={`badge ${reputationLevel.color}`}>
                            {reputationLevel.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900">{stats.totalReports}</div>
                          <div className="text-sm text-gray-500">{stats.activeReports} active</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${
                          officer.is_active 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${officer.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {officer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Officer Modal */}
      {showAddModal && (
        <AddOfficerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadData();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}