'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { SimpleSelect } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Plus,
  ClipboardList,
  Loader2 as LoaderIcon,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  User,
  Building2
} from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { TaskEditModal } from '@/components/tasks/TaskEditModal';
import { TaskReassignModal } from '@/components/tasks/TaskReassignModal';
import { TaskBulkActions } from '@/components/tasks/TaskBulkActions';
import { 
  Task, 
  TaskStatus, 
  TaskFilters,
  tasksApi,
  PaginatedTasks,
  TaskStats
} from '@/lib/api/tasks';
import { cn } from '@/lib/utils/cn';
import { getStatusBadgeClasses, getSeverityBadgeClasses, toLabel } from '@/lib/utils/status-colors';
import { toast } from 'sonner';

export default function TasksPage() {
  // State management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [perPage] = useState(20);
  
  // Filters
  const [filters, setFilters] = useState<TaskFilters>({
    sort_by: 'assigned_at',
    sort_order: 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  
  // Bulk actions
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  // Load data
  useEffect(() => {
    loadTasks();
    loadStats();
  }, [currentPage, filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchFilters = { ...filters };
      if (searchQuery.trim()) {
        searchFilters.search = searchQuery.trim();
      }
      
      const response = await tasksApi.getTasks(currentPage, perPage, searchFilters);
      
      setTasks(response.data);
      setTotalPages(response.total_pages);
      setTotalTasks(response.total);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.response?.data?.detail || 'Failed to load tasks');
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await tasksApi.getTaskStats();
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load task stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTasks(), loadStats()]);
    setRefreshing(false);
    toast.success('Tasks refreshed');
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadTasks();
  };

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleTaskView = (task: Task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleTaskEdit = (task: Task) => {
    setSelectedTask(task);
    setShowEditModal(true);
  };

  const handleTaskReassign = (task: Task) => {
    setSelectedTask(task);
    setShowReassignModal(true);
  };

  const handleTaskUpdate = async (taskId: number, updates: any) => {
    try {
      await tasksApi.updateTask(taskId, updates);
      await loadTasks();
      toast.success('Task updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update task');
    }
  };

  const handleTaskReassignment = async (taskId: number, newOfficerId: number) => {
    try {
      await tasksApi.reassignTask(taskId, newOfficerId);
      await loadTasks();
      toast.success('Task reassigned successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to reassign task');
    }
  };

  const handleBulkAction = (action: string, taskIds: number[]) => {
    setSelectedTaskIds(new Set(taskIds));
    setShowBulkActions(true);
  };

  const getStatusStats = () => {
    if (!stats) return [];
    
    return [
      {
        label: 'Assigned',
        count: stats.status_distribution.assigned || 0,
        color: 'bg-blue-500',
        icon: ClipboardList
      },
      {
        label: 'In Progress',
        count: stats.status_distribution.in_progress || 0,
        color: 'bg-yellow-500',
        icon: LoaderIcon
      },
      {
        label: 'Resolved',
        count: stats.status_distribution.resolved || 0,
        color: 'bg-green-500',
        icon: CheckCircle2
      },
      {
        label: 'Overdue',
        count: tasks.filter(task => {
          const assignedDate = new Date(task.assigned_at);
          const now = new Date();
          const diffHours = (now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60);
          return diffHours > 48 && task.status === TaskStatus.ASSIGNED;
        }).length,
        color: 'bg-red-500',
        icon: AlertCircle
      }
    ];
  };

  if (loading && !refreshing) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
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
            <ClipboardList className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-sm text-gray-600">Monitor and manage officer tasks</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh
          </button>
          
          <button
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <div className="flex items-center gap-2 pl-3 border-l border-gray-300">
            <div className="text-2xl font-bold text-primary-600">{totalTasks}</div>
            <div className="text-sm text-gray-500">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {getStatusStats().map((stat, index) => {
          const colorMap: Record<string, { text: string; hover: string; bg: string }> = {
            'bg-blue-500': { text: 'text-blue-600', hover: 'hover:border-blue-300 group-hover:text-blue-700', bg: 'bg-blue-100 group-hover:bg-blue-200' },
            'bg-yellow-500': { text: 'text-amber-600', hover: 'hover:border-amber-300 group-hover:text-amber-700', bg: 'bg-amber-100 group-hover:bg-amber-200' },
            'bg-green-500': { text: 'text-green-600', hover: 'hover:border-green-300 group-hover:text-green-700', bg: 'bg-green-100 group-hover:bg-green-200' },
            'bg-red-500': { text: 'text-red-600', hover: 'hover:border-red-300 group-hover:text-red-700', bg: 'bg-red-100 group-hover:bg-red-200' },
          };
          const colors = colorMap[stat.color] || { text: 'text-gray-600', hover: 'hover:border-gray-300', bg: 'bg-gray-100' };
          
          // Map stat labels to filter values
          const statusFilterMap: Record<string, TaskStatus | undefined> = {
            'Assigned': TaskStatus.ASSIGNED,
            'In Progress': TaskStatus.IN_PROGRESS,
            'Resolved': TaskStatus.RESOLVED,
            'Overdue': undefined, // Special case - would need custom logic
          };
          
          const handleStatClick = () => {
            const statusValue = statusFilterMap[stat.label];
            if (statusValue) {
              // Clear all filters and set only the clicked status
              setFilters({ status: statusValue as any, sort_by: 'assigned_at', sort_order: 'desc' });
              setSearchQuery('');
              setCurrentPage(1);
            }
          };
          
          return (
            <button
              key={index}
              onClick={handleStatClick}
              className={`p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md ${colors.hover} transition-all text-left cursor-pointer group`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={`text-xs font-medium text-gray-500 uppercase tracking-wide ${colors.hover.split(' ')[1]}`}>{stat.label}</div>
                  <div className={`text-2xl font-bold ${colors.text} mt-2`}>{stat.count.toLocaleString()}</div>
                </div>
                <div className={`p-3 ${colors.bg} rounded-lg transition-colors`}>
                  <stat.icon className={`w-6 h-6 ${colors.text}`} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks, reports, or officers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <SimpleSelect
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-[140px]"
                placeholder="Status"
              >
                <option value="">All Status</option>
                <option value={TaskStatus.ASSIGNED}>Assigned</option>
                <option value={TaskStatus.ACKNOWLEDGED}>Acknowledged</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.PENDING_VERIFICATION}>Pending</option>
                <option value={TaskStatus.RESOLVED}>Resolved</option>
                <option value={TaskStatus.REJECTED}>Rejected</option>
              </SimpleSelect>

              <SimpleSelect
                value={filters.priority?.toString() || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-[120px]"
                placeholder="Priority"
              >
                <option value="">All Priority</option>
                <option value="8">Critical</option>
                <option value="6">High</option>
                <option value="4">Medium</option>
                <option value="2">Low</option>
              </SimpleSelect>

              <SimpleSelect
                value={`${filters.sort_by}-${filters.sort_order}`}
                onChange={(e) => {
                  const [sort_by, sort_order] = e.target.value.split('-');
                  handleFilterChange('sort_by', sort_by);
                  handleFilterChange('sort_order', sort_order);
                }}
                className="w-[140px]"
                placeholder="Sort by"
              >
                <option value="assigned_at-desc">Newest First</option>
                <option value="assigned_at-asc">Oldest First</option>
                <option value="priority-desc">High Priority</option>
                <option value="priority-asc">Low Priority</option>
              </SimpleSelect>

              <Button
                variant="outline"
                onClick={handleSearch}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Apply
              </Button>
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
                <h4 className="font-medium text-red-800">Error Loading Tasks</h4>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTasks}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Grid */}
      {tasks.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || Object.keys(filters).some(key => filters[key as keyof TaskFilters])
                ? 'No tasks match your current filters.'
                : 'No tasks have been assigned yet.'}
            </p>
            {(searchQuery || Object.keys(filters).some(key => filters[key as keyof TaskFilters])) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilters({ sort_by: 'assigned_at', sort_order: 'desc' });
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tasks Grid/List */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {tasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge text-xs font-mono bg-gray-100 text-gray-700 border-gray-200">
                            {task.report_number}
                          </span>
                          <span className={`badge text-xs ${getStatusBadgeClasses(task.status)}`}>
                            {toLabel(task.status)}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-1">{task.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    {/* Location & Officer */}
                    <div className="space-y-2">
                      {task.address && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{task.address}</span>
                        </div>
                      )}
                      {task.officer && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{task.officer.full_name || task.officer.email}</span>
                        </div>
                      )}
                      {task.department && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{task.department.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>Assigned {new Date(task.assigned_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Priority/Severity */}
                    {task.severity && (
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-600 font-medium">Priority</span>
                        <span className={`badge text-xs ${getSeverityBadgeClasses(task.severity)}`}>
                          {toLabel(task.severity)}
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleTaskView(task)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleTaskEdit(task)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Task Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="badge text-xs font-mono bg-gray-100 text-gray-700 border-gray-200">
                          {task.report_number}
                        </span>
                        <span className={`badge text-xs ${getStatusBadgeClasses(task.status)}`}>
                          {toLabel(task.status)}
                        </span>
                        {task.severity && (
                          <span className={`badge text-xs ${getSeverityBadgeClasses(task.severity)}`}>
                            {toLabel(task.severity)}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">{task.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        {task.officer && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[150px]">{task.officer.full_name || task.officer.email}</span>
                          </div>
                        )}
                        {task.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="truncate max-w-[200px]">{task.address}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{new Date(task.assigned_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTaskView(task)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleTaskEdit(task)}
                        className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-all"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, totalTasks)} of {totalTasks} tasks
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      {selectedTask && (
        <>
          <TaskDetailModal
            task={selectedTask}
            open={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedTask(null);
            }}
            onEdit={() => {
              setShowDetailModal(false);
              setShowEditModal(true);
            }}
            onReassign={() => {
              setShowDetailModal(false);
              setShowReassignModal(true);
            }}
          />

          <TaskEditModal
            task={selectedTask}
            open={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTask(null);
            }}
            onSave={(updates) => {
              handleTaskUpdate(selectedTask.id, updates);
              setShowEditModal(false);
              setSelectedTask(null);
            }}
          />

          <TaskReassignModal
            task={selectedTask}
            open={showReassignModal}
            onClose={() => {
              setShowReassignModal(false);
              setSelectedTask(null);
            }}
            onReassign={(newOfficerId) => {
              handleTaskReassignment(selectedTask.id, newOfficerId);
              setShowReassignModal(false);
              setSelectedTask(null);
            }}
          />
        </>
      )}

      {/* Bulk Actions Modal */}
      <TaskBulkActions
        taskIds={Array.from(selectedTaskIds)}
        open={showBulkActions}
        onClose={() => {
          setShowBulkActions(false);
          setSelectedTaskIds(new Set());
        }}
        onComplete={() => {
          loadTasks();
          setShowBulkActions(false);
          setSelectedTaskIds(new Set());
        }}
      />
    </div>
  );
}