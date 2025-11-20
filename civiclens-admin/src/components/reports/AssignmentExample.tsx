"use client";

import React, { useState } from 'react';
import { Building2, Users, Zap } from 'lucide-react';
import { Report } from '@/types';
import { AssignDepartmentModal } from './AssignDepartmentModal';
import { AssignOfficerModal } from './AssignOfficerModal';

interface AssignmentExampleProps {
  report: Report;
  onReportUpdate: (updatedReport: Report) => void;
}

export function AssignmentExample({ report, onReportUpdate }: AssignmentExampleProps) {
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showOfficerModal, setShowOfficerModal] = useState(false);

  const handleDepartmentAssigned = (updatedReport: Report) => {
    onReportUpdate(updatedReport);
    // Show success notification
    console.log('Department assigned successfully');
  };

  const handleOfficerAssigned = (updatedReport: Report) => {
    onReportUpdate(updatedReport);
    // Show success notification
    console.log('Officer assigned successfully');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Assignment Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assign Department Button */}
        <button
          onClick={() => setShowDepartmentModal(true)}
          className="flex items-center gap-3 p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {report.department ? 'Reassign Department' : 'Assign Department'}
            </div>
            <div className="text-sm text-gray-500">
              {report.department 
                ? `Currently: ${report.department.name}`
                : 'Route to appropriate department'
              }
            </div>
          </div>
        </button>

        {/* Assign Officer Button */}
        <button
          onClick={() => setShowOfficerModal(true)}
          disabled={!report.department_id}
          className="flex items-center gap-3 p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="p-2 bg-green-100 rounded-lg">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {report.task?.officer ? 'Reassign Officer' : 'Assign Officer'}
            </div>
            <div className="text-sm text-gray-500">
              {report.task?.officer
                ? `Currently: ${report.task.officer.full_name}`
                : report.department_id 
                  ? 'Delegate to field officer'
                  : 'Assign department first'
              }
            </div>
          </div>
        </button>
      </div>

      {/* Assignment Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Current Assignment Status</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Department:</span>
            <span className="font-medium text-gray-900">
              {report.department?.name || 'Not assigned'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Officer:</span>
            <span className="font-medium text-gray-900">
              {report.task?.officer?.full_name || 'Not assigned'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-medium text-gray-900">
              {report.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssignDepartmentModal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        report={report}
        onSuccess={handleDepartmentAssigned}
      />

      <AssignOfficerModal
        isOpen={showOfficerModal}
        onClose={() => setShowOfficerModal(false)}
        report={report}
        onSuccess={handleOfficerAssigned}
      />
    </div>
  );
}