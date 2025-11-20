"use client";

import React from 'react';
import { Report } from '@/types';

interface ReportInfoSectionProps {
  report: Report;
  showFullDetails?: boolean;
  className?: string;
}

const toLabel = (s?: string | null) => (s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-');

export function ReportInfoSection({ report, showFullDetails = true, className = '' }: ReportInfoSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Basic Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Report Details</h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-1">{report.title}</h4>
            {report.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{report.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          Location
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Address</p>
            <p className="text-sm text-gray-900">{report.address || 'Not provided'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Latitude</p>
              <p className="text-sm text-gray-900 font-mono">{report.latitude?.toFixed(6)}°</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Longitude</p>
              <p className="text-sm text-gray-900 font-mono">{report.longitude?.toFixed(6)}°</p>
            </div>
          </div>
        </div>
      </div>

      {showFullDetails && (
        <>
          {/* Classification Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Classification
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Category</p>
                <p className="text-sm text-gray-900">{toLabel(report.category)}</p>
              </div>
              {report.sub_category && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sub-Category</p>
                  <p className="text-sm text-gray-900">{toLabel(report.sub_category)}</p>
                </div>
              )}
              {report.classification_notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Processing Notes</p>
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
                    {report.classification_notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Assignment Information */}
          {(report.department || report.task) && (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Assignment
              </h3>
              <div className="space-y-3">
                {report.department && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Department</p>
                    <p className="text-sm text-gray-900">{report.department.name}</p>
                  </div>
                )}
                {report.task?.officer && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Assigned Officer</p>
                    <p className="text-sm text-gray-900">{report.task.officer.full_name}</p>
                    <p className="text-xs text-gray-500">{report.task.officer.email}</p>
                  </div>
                )}
                {report.task?.priority && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Priority</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all" 
                          style={{ width: `${(report.task.priority / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{report.task.priority}/10</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Report ID</p>
                <p className="text-sm text-gray-900 font-mono">#{report.id}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Report Number</p>
                <p className="text-sm text-gray-900 font-mono">{report.report_number || `CL-${report.id}`}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</p>
                <p className="text-sm text-gray-900">
                  {new Date(report.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {report.updated_at && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {new Date(report.updated_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
