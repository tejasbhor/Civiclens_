import React, { useState } from 'react';
import { Report } from '@/types';
import { 
  Zap, 
  Phone, 
  Mail, 
  MapPin,
  Share2,
  Star,
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Building2
} from 'lucide-react';

interface QuickActionsProps {
  report: Report;
  onUpdate: () => void;
}

export function QuickActions({ report, onUpdate }: QuickActionsProps) {
  const [bookmarked, setBookmarked] = useState(false);

  const handleContactCitizen = () => {
    if (report.user?.phone) {
      window.open(`tel:${report.user.phone}`, '_self');
    } else if (report.user?.email) {
      window.open(`mailto:${report.user.email}`, '_self');
    }
  };

  const handleViewOnMap = () => {
    const url = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
    window.open(url, '_blank');
  };

  const handleShareReport = async () => {
    try {
      const url = `${window.location.origin}/dashboard/reports/manage/${report.id}`;
      await navigator.clipboard.writeText(url);
      
      // Show toast notification
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      toast.textContent = 'Report link copied to clipboard';
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const toggleBookmark = () => {
    setBookmarked(!bookmarked);
    // TODO: Implement bookmark API call
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'on_hold': return 'text-yellow-600 bg-yellow-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Contact Citizen */}
          {report.user && (report.user.phone || report.user.email) && (
            <button
              onClick={handleContactCitizen}
              className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {report.user.phone ? (
                <Phone className="w-5 h-5 text-green-600" />
              ) : (
                <Mail className="w-5 h-5 text-blue-600" />
              )}
              <div>
                <div className="font-medium text-gray-900">Contact Citizen</div>
                <div className="text-sm text-gray-600">
                  {report.user.phone || report.user.email}
                </div>
              </div>
            </button>
          )}

          {/* View on Map */}
          <button
            onClick={handleViewOnMap}
            className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MapPin className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-medium text-gray-900">View on Map</div>
              <div className="text-sm text-gray-600">
                {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
              </div>
            </div>
          </button>

          {/* Share Report */}
          <button
            onClick={handleShareReport}
            className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-5 h-5 text-purple-600" />
            <div>
              <div className="font-medium text-gray-900">Share Report</div>
              <div className="text-sm text-gray-600">Copy link to clipboard</div>
            </div>
          </button>

          {/* Bookmark */}
          <button
            onClick={toggleBookmark}
            className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Star className={`w-5 h-5 ${bookmarked ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
            <div>
              <div className="font-medium text-gray-900">
                {bookmarked ? 'Remove Bookmark' : 'Bookmark Report'}
              </div>
              <div className="text-sm text-gray-600">
                {bookmarked ? 'Remove from favorites' : 'Add to favorites'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Report Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Report Stats</h3>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor((new Date().getTime() - new Date(report.created_at).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-gray-500">Days Old</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {report.media?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Media Files</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                {report.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(report.severity)}`}>
                {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
              </span>
            </div>

            {report.department && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Department:</span>
                <span className="text-sm font-medium text-gray-900">
                  {report.department.short || report.department.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Related Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Related</h3>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-center py-6 text-gray-500">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="font-medium">No related reports</p>
            <p className="text-sm text-gray-400 mt-1">
              Similar reports in this area will appear here
            </p>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">System Information</span>
        </div>
        <div className="space-y-2 text-xs text-gray-600">
          <div>Report ID: {report.id}</div>
          <div>Created: {new Date(report.created_at).toLocaleString()}</div>
          {report.updated_at && (
            <div>Updated: {new Date(report.updated_at).toLocaleString()}</div>
          )}
          <div>Public: {report.is_public ? 'Yes' : 'No'}</div>
          {report.is_sensitive && <div>⚠️ Sensitive Content</div>}
          {report.is_featured && <div>⭐ Featured Report</div>}
        </div>
      </div>
    </div>
  );
}