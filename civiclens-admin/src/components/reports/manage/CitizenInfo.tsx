import React, { useState } from 'react';
import { Report } from '@/types';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  MessageSquare,
  ExternalLink,
  Shield,
  Star,
  TrendingUp,
  Activity
} from 'lucide-react';

interface CitizenInfoProps {
  report: Report;
}

export function CitizenInfo({ report }: CitizenInfoProps) {
  const [showContactModal, setShowContactModal] = useState(false);

  if (!report.user) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold mb-1">Anonymous Report</p>
          <p className="text-sm text-gray-500">No citizen information available</p>
        </div>
      </div>
    );
  }

  const { user } = report;
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getReputationLevel = (score?: number) => {
    if (!score) return { level: 'New', color: 'text-gray-600', bg: 'bg-gray-100' };
    if (score >= 1000) return { level: 'Champion', color: 'text-purple-600', bg: 'bg-purple-100' };
    if (score >= 500) return { level: 'Expert', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 100) return { level: 'Active', color: 'text-green-600', bg: 'bg-green-100' };
    return { level: 'Beginner', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

  const reputation = getReputationLevel(user.reputation_score);

  const handleContactCitizen = () => {
    setShowContactModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Citizen Profile</h3>
            </div>
            <button
              onClick={handleContactCitizen}
              className="btn btn-primary text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Contact
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Profile */}
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center ring-4 ring-blue-50">
                <User className="w-7 h-7 text-white" />
              </div>
              {user.is_active && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full" title="Active" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-base">
                {user.full_name || 'Anonymous Citizen'}
              </h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${reputation.color} ${reputation.bg} border border-current border-opacity-20`}>
                  {reputation.level}
                </div>
                {user.reputation_score && user.reputation_score > 0 && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    <Star className="w-3 h-3 fill-current" />
                    {user.reputation_score}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            {user.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.phone}</p>
                  <p className="text-xs text-gray-500">Primary contact</p>
                </div>
              </div>
            )}
            
            {user.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                  <p className="text-xs text-gray-500">Email address</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="pt-3 border-t border-gray-200 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Member since:</span>
              <span className="text-gray-900">{formatDate(user.created_at)}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Account status:</span>
              <div className="flex items-center gap-2">
                {user.is_active ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-600 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-red-600 font-medium">Inactive</span>
                  </>
                )}
              </div>
            </div>

            {user.role && user.role !== 'citizen' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Role:</span>
                <div className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" />
                  <span className="text-blue-600 font-medium capitalize">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {user.reputation_score && user.reputation_score > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Citizen Activity</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-gray-900">{user.reputation_score}</div>
                  <div className="text-gray-500">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-gray-900">
                    {Math.floor(user.reputation_score / 5)}
                  </div>
                  <div className="text-gray-500">Est. Reports</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={handleContactCitizen}
                className="btn btn-primary flex-1 text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Contact Citizen
              </button>
              <button
                onClick={() => window.open(`/dashboard/citizens/${user.id}`, '_blank')}
                className="btn btn-secondary"
                title="View full profile"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal - Placeholder */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Citizen</h3>
            <p className="text-gray-600 mb-4">
              Contact options for {user.full_name || 'this citizen'}:
            </p>
            <div className="space-y-3">
              {user.phone && (
                <a
                  href={`tel:${user.phone}`}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Phone className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">Call</div>
                    <div className="text-sm text-gray-600">{user.phone}</div>
                  </div>
                </a>
              )}
              {user.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Email</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </a>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}