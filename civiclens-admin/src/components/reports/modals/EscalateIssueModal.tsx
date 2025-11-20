"use client";

import React, { useState } from 'react';
import { Report, ReportSeverity } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { escalationsApi, EscalationLevel, EscalationReason } from '@/lib/api/escalations';
import { X, AlertCircle, AlertTriangle } from 'lucide-react';

interface EscalateIssueModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export function EscalateIssueModal({ report, onClose, onSuccess }: EscalateIssueModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escalationLevel, setEscalationLevel] = useState<EscalationLevel>(EscalationLevel.LEVEL_1);
  const [escalationReason, setEscalationReason] = useState<EscalationReason>(EscalationReason.UNRESOLVED);
  const [description, setDescription] = useState('');
  const [urgencyNotes, setUrgencyNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Please provide a description for escalation');
      return;
    }

    try {
      setLoading(true);
      
      // Create escalation record
      await escalationsApi.create({
        report_id: report.id,
        level: escalationLevel,
        reason: escalationReason,
        description: description.trim(),
        urgency_notes: urgencyNotes.trim() || undefined,
        sla_hours: escalationLevel === EscalationLevel.LEVEL_3 ? 12 : 
                   escalationLevel === EscalationLevel.LEVEL_2 ? 24 : 48,
      });
      
      // Also update report severity if escalating to higher levels
      if (escalationLevel === EscalationLevel.LEVEL_3) {
        await reportsApi.updateReport(report.id, {
          severity: ReportSeverity.CRITICAL,
          needs_review: true,
        });
      } else if (escalationLevel === EscalationLevel.LEVEL_2 && report.severity !== ReportSeverity.CRITICAL) {
        await reportsApi.updateReport(report.id, {
          severity: ReportSeverity.HIGH,
          needs_review: true,
        });
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to escalate issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Escalate Issue
            </h2>
            <p className="text-sm text-gray-600 mt-1">{report.report_number || `CL-${report.id}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Escalation:</strong> This will increase the severity of the report and flag it for immediate attention.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Current Severity
            </label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                report.severity === ReportSeverity.CRITICAL ? 'bg-red-100 text-red-700' :
                report.severity === ReportSeverity.HIGH ? 'bg-orange-100 text-orange-700' :
                report.severity === ReportSeverity.MEDIUM ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {report.severity.toUpperCase()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Escalation Level <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setEscalationLevel(EscalationLevel.LEVEL_1)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  escalationLevel === EscalationLevel.LEVEL_1
                    ? 'border-yellow-600 bg-yellow-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium text-yellow-700">⚠️ Level 1</span>
                <p className="text-xs text-gray-600 mt-1">Dept Head</p>
              </button>
              <button
                type="button"
                onClick={() => setEscalationLevel(EscalationLevel.LEVEL_2)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  escalationLevel === EscalationLevel.LEVEL_2
                    ? 'border-orange-600 bg-orange-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium text-orange-700">Level 2</span>
                <p className="text-xs text-gray-600 mt-1">City Manager</p>
              </button>
              <button
                type="button"
                onClick={() => setEscalationLevel(EscalationLevel.LEVEL_3)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  escalationLevel === EscalationLevel.LEVEL_3
                    ? 'border-red-600 bg-red-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm font-medium text-red-700">🚨 Level 3</span>
                <p className="text-xs text-gray-600 mt-1">Mayor</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Escalation Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value as EscalationReason)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value={EscalationReason.UNRESOLVED}>Unresolved</option>
              <option value={EscalationReason.SLA_BREACH}>SLA Breach</option>
              <option value={EscalationReason.QUALITY_ISSUE}>Quality Issue</option>
              <option value={EscalationReason.CITIZEN_COMPLAINT}>Citizen Complaint</option>
              <option value={EscalationReason.VIP_ATTENTION}>VIP Attention</option>
              <option value={EscalationReason.CRITICAL_PRIORITY}>Critical Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Explain why this issue needs to be escalated..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency Notes (Optional)
            </label>
            <textarea
              value={urgencyNotes}
              onChange={(e) => setUrgencyNotes(e.target.value)}
              rows={2}
              placeholder="Additional urgency information..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Escalating...' : 'Escalate Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
