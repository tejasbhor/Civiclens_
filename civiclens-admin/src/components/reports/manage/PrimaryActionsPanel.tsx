"use client";

import React, { useState } from 'react';
import { Report, ReportStatus } from '@/types';
import { 
  ClassifyReportForm, 
  AssignDepartmentForm, 
  AssignOfficerForm,
  AddUpdateForm 
} from './InlineActionForms';
import {
  RequestReworkForm,
  FlagIncorrectAssignmentForm
} from './AdditionalActionForms';
import { CheckCircle, PlayCircle, RefreshCw, AlertTriangle, Pause, XCircle } from 'lucide-react';

interface PrimaryActionsPanelProps {
  report: Report;
  onUpdate: () => void;
  onSimpleAction: (action: string) => void;
}

export function PrimaryActionsPanel({ report, onUpdate, onSimpleAction }: PrimaryActionsPanelProps) {
  const [expandedForm, setExpandedForm] = useState<string | null>(null);

  const toggleForm = (formName: string) => {
    setExpandedForm(expandedForm === formName ? null : formName);
  };

  const handleFormSuccess = () => {
    setExpandedForm(null);
    onUpdate();
  };

  const handleFormCancel = () => {
    setExpandedForm(null);
  };

  const renderActions = () => {
    switch (report.status) {
      case ReportStatus.RECEIVED:
        return (
          <div className="space-y-2">
            <button
              onClick={() => toggleForm('classify')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left font-medium"
            >
              Classify Report
            </button>
            {expandedForm === 'classify' && (
              <ClassifyReportForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}

            <button
              onClick={() => toggleForm('assign-department')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left font-medium"
            >
              Assign to Department
            </button>
            {expandedForm === 'assign-department' && (
              <AssignDepartmentForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.CLASSIFIED:
        return (
          <div className="space-y-2">
            <button
              onClick={() => toggleForm('assign-department')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left font-medium"
            >
              Assign to Department
            </button>
            {expandedForm === 'assign-department' && (
              <AssignDepartmentForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.ASSIGNED_TO_DEPARTMENT:
        return (
          <div className="space-y-2">
            <button
              onClick={() => toggleForm('assign-officer')}
              className="w-full px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-left font-medium"
            >
              Assign to Officer
            </button>
            {expandedForm === 'assign-officer' && (
              <AssignOfficerForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.ASSIGNED_TO_OFFICER:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('acknowledge')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-left font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Acknowledge
            </button>

            <button
              onClick={() => toggleForm('flag-incorrect')}
              className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-left font-medium flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              Flag Incorrect Assignment
            </button>
            {expandedForm === 'flag-incorrect' && (
              <FlagIncorrectAssignmentForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.ACKNOWLEDGED:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('start-work')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left font-medium flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Start Work
            </button>

            <button
              onClick={() => onSimpleAction('put-on-hold')}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-left font-medium flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Put on Hold
            </button>
          </div>
        );

      case ReportStatus.IN_PROGRESS:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('mark-verification')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-left font-medium"
            >
              Mark for Verification
            </button>

            <button
              onClick={() => toggleForm('add-update')}
              className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-left font-medium"
            >
              Add Work Update
            </button>
            {expandedForm === 'add-update' && (
              <AddUpdateForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}

            <button
              onClick={() => onSimpleAction('put-on-hold')}
              className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-left font-medium flex items-center gap-2"
            >
              <Pause className="w-5 h-5" />
              Put on Hold
            </button>
          </div>
        );

      case ReportStatus.PENDING_VERIFICATION:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('mark-resolved')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-left font-medium flex items-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Mark as Resolved
            </button>

            <button
              onClick={() => toggleForm('request-rework')}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-left font-medium flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Request Rework
            </button>
            {expandedForm === 'request-rework' && (
              <RequestReworkForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.ON_HOLD:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('resume-work')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left font-medium flex items-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Resume Work
            </button>

            <button
              onClick={() => toggleForm('reassign-officer')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-left font-medium flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reassign
            </button>
            {expandedForm === 'reassign-officer' && (
              <AssignOfficerForm report={report} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
            )}
          </div>
        );

      case ReportStatus.RESOLVED:
        return (
          <div className="space-y-2">
            <button
              onClick={() => onSimpleAction('reopen')}
              className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-left font-medium"
            >
              Reopen Report
            </button>

            <button
              onClick={() => onSimpleAction('export-pdf')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-left font-medium"
            >
              Export Report
            </button>
          </div>
        );

      default:
        return (
          <p className="text-sm text-gray-500">No actions available for this status</p>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Actions</h3>
      {renderActions()}
    </div>
  );
}
