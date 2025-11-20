"use client";

import React, { useState, useEffect } from 'react';
import { Report } from '@/types';
import { appealsApi } from '@/lib/api/appeals';
import { escalationsApi } from '@/lib/api/escalations';
import { Scale, ArrowUpCircle, ChevronDown, ChevronUp, Plus, X, Loader2 } from 'lucide-react';

interface Appeal {
  id: number;
  report_id: number;
  appeal_type: string;
  status: string;
  reason: string;
  created_at: string;
}

interface Escalation {
  id: number;
  report_id: number;
  level: string;
  reason: string;
  status: string;
  is_overdue: boolean;
  created_at: string;
}

interface AppealsEscalationsSectionProps {
  report: Report;
  onUpdate: () => void;
}

export function AppealsEscalationsSection({ report, onUpdate }: AppealsEscalationsSectionProps) {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAppeal, setShowCreateAppeal] = useState(false);
  const [showCreateEscalation, setShowCreateEscalation] = useState(false);

  useEffect(() => {
    loadData();
  }, [report.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all appeals and filter by report_id on frontend
      // Backend doesn't support report_id filter yet
      const allAppeals = await appealsApi.list({ limit: 100 });
      const reportAppeals = allAppeals.filter((a: Appeal) => a.report_id === report.id);
      setAppeals(reportAppeals);

      // Fetch all escalations and filter by report_id on frontend
      // Backend doesn't support report_id filter yet
      const allEscalations = await escalationsApi.list({ limit: 100 });
      const reportEscalations = allEscalations.filter((e: Escalation) => e.report_id === report.id);
      setEscalations(reportEscalations);
    } catch (err) {
      console.error('Failed to load appeals/escalations', err);
      // Set empty arrays on error to prevent UI issues
      setAppeals([]);
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  };

  const getAppealStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEscalationLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'supervisor': return 'bg-yellow-100 text-yellow-800';
      case 'manager': return 'bg-orange-100 text-orange-800';
      case 'director': return 'bg-red-100 text-red-800';
      case 'executive': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Appeals & Escalations</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Appeals Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-gray-900">Appeals ({appeals.length})</h4>
            </div>
            <button
              onClick={() => setShowCreateAppeal(!showCreateAppeal)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
          
          {appeals.length > 0 ? (
            <div className="space-y-2">
              {appeals.map((appeal) => (
                <div key={appeal.id} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Appeal #{appeal.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAppealStatusColor(appeal.status)}`}>
                      {appeal.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{appeal.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(appeal.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No appeals</p>
          )}
        </div>

        {/* Escalations Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-red-600" />
              <h4 className="font-medium text-gray-900">Escalations ({escalations.length})</h4>
            </div>
            <button
              onClick={() => setShowCreateEscalation(!showCreateEscalation)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
          
          {escalations.length > 0 ? (
            <div className="space-y-2">
              {escalations.map((escalation) => (
                <div key={escalation.id} className="border border-gray-200 rounded p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">Escalation #{escalation.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getEscalationLevelColor(escalation.level)}`}>
                      {escalation.level}
                    </span>
                  </div>
                  {escalation.is_overdue && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      Overdue
                    </span>
                  )}
                  <p className="text-xs text-gray-600">{escalation.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(escalation.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No escalations</p>
          )}
        </div>
      </div>
    </div>
  );
}
