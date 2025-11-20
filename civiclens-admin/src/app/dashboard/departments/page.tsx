"use client";

import React, { useEffect, useState } from 'react';
import { departmentsApi, DepartmentStats } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { Department, User } from '@/types';
import { 
  Building2, 
  Users, 
  Phone, 
  Mail, 
  Clock, 
  AlertTriangle, 
  BarChart3, 
  RefreshCw, 
  Search,
  Zap,
  Droplets,
  Trash2,
  TreePine
} from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading departments data...');
      
      const [departmentsResponse, statsResponse, officersResponse] = await Promise.all([
        departmentsApi.list(),
        departmentsApi.getStats(),
        usersApi.getOfficers() // Use getOfficers to get only officers
      ]);
      
      console.log('📡 Departments:', departmentsResponse);
      console.log('📊 Stats:', statsResponse);
      console.log('👮 Officers:', officersResponse);
      
      setDepartments(departmentsResponse || []);
      setDepartmentStats(statsResponse || []);
      setOfficers(officersResponse || []);
    } catch (err: any) {
      setError('Failed to load departments data');
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

  const getDepartmentConfig = (name: string) => {
    const configs = {
      'Public Works Department': {
        short: 'PWD',
        icon: Building2,
        color: 'blue',
        description: 'Roads, bridges, footpaths, drainage, and civil infrastructure',
        categories: ['roads', 'bridges', 'footpaths', 'drainage'],
        priority: 'high',
        workingHours: '09:00 AM - 06:00 PM',
        emergencyContact: '+91-651-2345678',
        email: 'pwd@Navi Mumbai.gov.in'
      },
      'Water Supply Department': {
        short: 'WSD',
        icon: Droplets,
        color: 'cyan',
        description: 'Water supply, distribution, quality control, and maintenance',
        categories: ['water_supply', 'water_quality', 'pipeline'],
        priority: 'critical',
        workingHours: '24x7 Emergency Service',
        emergencyContact: '+91-651-2345679',
        email: 'water@Navi Mumbai.gov.in'
      },
      'Sanitation Department': {
        short: 'SD',
        icon: Trash2,
        color: 'green',
        description: 'Waste management, cleanliness, and sanitation services',
        categories: ['waste_management', 'cleanliness', 'sanitation'],
        priority: 'high',
        workingHours: '06:00 AM - 10:00 PM',
        emergencyContact: '+91-651-2345680',
        email: 'sanitation@Navi Mumbai.gov.in'
      },
      'Electrical Department': {
        short: 'ED',
        icon: Zap,
        color: 'yellow',
        description: 'Street lighting, electrical infrastructure, and power supply',
        categories: ['street_lights', 'electrical', 'power_supply'],
        priority: 'medium',
        workingHours: '09:00 AM - 06:00 PM',
        emergencyContact: '+91-651-2345681',
        email: 'electrical@Navi Mumbai.gov.in'
      },
      'Horticulture Department': {
        short: 'HD',
        icon: TreePine,
        color: 'emerald',
        description: 'Parks, gardens, tree maintenance, and green spaces',
        categories: ['parks', 'gardens', 'trees', 'green_spaces'],
        priority: 'low',
        workingHours: '07:00 AM - 05:00 PM',
        emergencyContact: '+91-651-2345682',
        email: 'horticulture@Navi Mumbai.gov.in'
      }
    };
    
    return configs[name as keyof typeof configs] || {
      short: name.split(' ').map(w => w[0]).join(''),
      icon: Building2,
      color: 'gray',
      description: 'Government department',
      categories: [],
      priority: 'medium',
      workingHours: '09:00 AM - 06:00 PM',
      emergencyContact: 'N/A',
      email: 'N/A'
    };
  };

  const getDepartmentStats = (departmentId: number) => {
    const stats = departmentStats.find(s => s.department_id === departmentId);
    if (stats) {
      return {
        totalOfficers: stats.total_officers,
        activeOfficers: stats.active_officers,
        totalReports: stats.total_reports,
        pendingReports: stats.pending_reports,
        resolvedReports: stats.resolved_reports,
        avgResolutionTime: stats.avg_resolution_time_days || 0,
        resolutionRate: stats.resolution_rate
      };
    }
    
    // Fallback to empty stats if no data available
    return {
      totalOfficers: 0,
      activeOfficers: 0,
      totalReports: 0,
      pendingReports: 0,
      resolvedReports: 0,
      avgResolutionTime: 0,
      resolutionRate: 0
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-priority-critical bg-red-50 border-red-200';
      case 'high': return 'text-priority-high bg-orange-50 border-orange-200';
      case 'medium': return 'text-priority-medium bg-yellow-50 border-yellow-200';
      case 'low': return 'text-priority-low bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50 border-blue-200',
      cyan: 'from-cyan-500 to-cyan-600 text-cyan-600 bg-cyan-50 border-cyan-200',
      green: 'from-green-500 to-green-600 text-green-600 bg-green-50 border-green-200',
      yellow: 'from-yellow-500 to-yellow-600 text-yellow-600 bg-yellow-50 border-yellow-200',
      emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50 border-emerald-200',
      gray: 'from-gray-500 to-gray-600 text-gray-600 bg-gray-50 border-gray-200'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.gray;
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(dept => 
    !searchTerm || 
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading departments...</p>
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
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
            <p className="text-sm text-gray-600">Government Department Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-primary-600">{departments.length}</div>
            <div className="text-sm text-gray-500">Total Departments</div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDepartments.map((department) => {
            const config = getDepartmentConfig(department.name);
            const stats = getDepartmentStats(department.id);
            const colorClasses = getColorClasses(config.color);
            const IconComponent = config.icon;
            
            return (
              <div key={department.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900">{department.name}</h3>
                        <p className="text-xs text-gray-500">{config.short}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className={`badge text-xs ${getPriorityColor(config.priority)}`}>
                        {config.priority.charAt(0).toUpperCase() + config.priority.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">{config.description}</p>

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{config.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span>{config.emergencyContact}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="truncate">{config.workingHours}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary-600">{stats.totalOfficers}</div>
                      <div className="text-xs text-gray-500 font-medium">Officers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-status-resolved">{stats.totalReports}</div>
                      <div className="text-xs text-gray-500 font-medium">Reports</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-status-progress">{stats.pendingReports}</div>
                      <div className="text-xs text-gray-500 font-medium">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{stats.resolutionRate}%</div>
                      <div className="text-xs text-gray-500 font-medium">Resolved</div>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium">Resolution Rate</span>
                      <span className="font-semibold">{stats.resolutionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-status-resolved to-green-400 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${stats.resolutionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Performance Table */}
        <div className="card p-0">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Department Performance</h2>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Officers</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reports</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Resolution Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Avg Time</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDepartments.map((department) => {
                  const config = getDepartmentConfig(department.name);
                  const stats = getDepartmentStats(department.id);
                  const IconComponent = config.icon;
                  
                  return (
                    <tr key={department.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{department.name}</p>
                            <p className="text-sm text-gray-500">{config.short}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold text-gray-900">{stats.totalOfficers}</span>
                          <span className="text-sm text-gray-500">({stats.activeOfficers} active)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900">{stats.totalReports}</div>
                          <div className="text-sm text-gray-500">{stats.pendingReports} pending</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-gradient-to-r from-status-resolved to-green-400 h-2.5 rounded-full transition-all duration-300"
                              style={{ width: `${stats.resolutionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-900 min-w-[3rem]">{stats.resolutionRate}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{Math.round(stats.avgResolutionTime) || 0} days</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${getPriorityColor(config.priority)}`}>
                          {config.priority.charAt(0).toUpperCase() + config.priority.slice(1)}
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
    </div>
  );
}