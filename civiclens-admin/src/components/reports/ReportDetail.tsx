"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { Report, ReportStatus } from '@/types';
import { reportsApi, AssignDepartmentRequest, AssignOfficerRequest, StatusUpdateRequest, StatusHistoryResponse } from '@/lib/api/reports';
import { mediaApi, MediaFile } from '@/lib/api/media';
import apiClient from '@/lib/api/client';
import { Badge } from '@/components/ui/Badge';
import { ReportHeader, ReportInfoSection } from '@/components/reports/shared';
import { getMediaUrl } from '@/lib/utils/media';

type Props = {
  reportId: number;
  admin?: boolean; // if true, show admin actions
  onUpdated?: (report: Report) => void;
};

const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.RECEIVED]: [ReportStatus.PENDING_CLASSIFICATION, ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.PENDING_CLASSIFICATION]: [ReportStatus.CLASSIFIED, ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.CLASSIFIED]: [ReportStatus.ASSIGNED_TO_DEPARTMENT],
  [ReportStatus.ASSIGNED_TO_DEPARTMENT]: [ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.ON_HOLD],
  [ReportStatus.ASSIGNED_TO_OFFICER]: [ReportStatus.ACKNOWLEDGED, ReportStatus.ON_HOLD],
  [ReportStatus.ACKNOWLEDGED]: [ReportStatus.IN_PROGRESS, ReportStatus.ON_HOLD],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.PENDING_VERIFICATION, ReportStatus.ON_HOLD],
  [ReportStatus.PENDING_VERIFICATION]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.ON_HOLD],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.CLOSED]: [],
  [ReportStatus.REJECTED]: [],
  [ReportStatus.DUPLICATE]: [],
  [ReportStatus.ON_HOLD]: [ReportStatus.ASSIGNED_TO_DEPARTMENT, ReportStatus.ASSIGNED_TO_OFFICER, ReportStatus.IN_PROGRESS],
};

export default function ReportDetail({ reportId, admin = false, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [history, setHistory] = useState<StatusHistoryResponse | null>(null);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [r, h, m] = await Promise.all([
        reportsApi.getReportById(reportId),
        reportsApi.getStatusHistory(reportId).catch((err) => {
          console.log('History fetch error:', err);
          return null;
        }),
        mediaApi.getReportMedia(reportId).catch((err) => {
          console.log('Media fetch error:', err);
          return [];
        }),
      ]);
      console.log('Report loaded:', r);
      console.log('History loaded:', h);
      console.log('Media loaded:', m);
      setReport(r);
      if (h) setHistory(h);
      setMedia(m);
      setError(null);
    } catch (e: any) {
      console.error('Load error:', e);
      setError(e?.response?.data?.detail || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const allowedNext = useMemo(() => {
    if (!report) return [] as ReportStatus[];
    return statusTransitions[report.status] || [];
  }, [report]);

  const handleAssignDepartment = async () => {
    const idStr = prompt('Enter Department ID');
    if (!idStr) return;
    const payload: AssignDepartmentRequest = { department_id: Number(idStr) };
    try {
      const updated = await reportsApi.assignDepartment(reportId, payload);
      setReport(updated);
      onUpdated?.(updated);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to assign department');
    }
  };

  const handleAssignOfficer = async () => {
    const uidStr = prompt('Enter Officer User ID');
    if (!uidStr) return;
    const priorityStr = prompt('Priority (1-10, optional)') || '';
    const payload: AssignOfficerRequest = {
      officer_user_id: Number(uidStr),
      priority: priorityStr ? Number(priorityStr) : undefined,
    };
    try {
      const updated = await reportsApi.assignOfficer(reportId, payload);
      setReport(updated);
      onUpdated?.(updated);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to assign officer');
    }
  };

  const toLabel = (s?: string | null) => (s ? s.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '-');

  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportPDF = async (level: 'summary' | 'standard' | 'comprehensive') => {
    if (!report) return;
    
    const { exportReportPDF, PDFExportLevel } = await import('@/lib/utils/pdf-export-service');
    
    if (level === 'summary') {
      exportReportPDF({ level: PDFExportLevel.SUMMARY, report });
    } else if (level === 'standard') {
      exportReportPDF({ level: PDFExportLevel.STANDARD, report, history: history?.history });
    } else {
      // Comprehensive - fetch activity logs
      const activityLogs = await apiClient.get(`/audit/resource/report/${report.id}`);
      exportReportPDF({ 
        level: PDFExportLevel.COMPREHENSIVE, 
        report, 
        history: history?.history,
        activityLogs: activityLogs.data
      });
    }
  };

  const handleExportPDFOld = () => {
    if (!report) return;

    // Generate auto-named filename
    const timestamp = new Date().toISOString().split('T')[0];
    const reportNum = report.report_number || `CL-${report.id}`;
    const filename = `CivicLens_Report_${reportNum}_${timestamp}`;

    // OLD IMPLEMENTATION - Generate comprehensive PDF with audit trail
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1f2937; line-height: 1.6; }
            .header { border-bottom: 4px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1e40af; font-size: 32px; font-weight: 700; }
            .header .subtitle { color: #6b7280; margin-top: 8px; font-size: 14px; }
            .header .meta { color: #9ca3af; margin-top: 4px; font-size: 12px; }
            .section { margin: 30px 0; page-break-inside: avoid; }
            .section-title { font-size: 20px; font-weight: 700; color: #1e40af; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
            .section-title svg { width: 24px; height: 24px; }
            .field { margin: 16px 0; }
            .field-label { font-weight: 600; color: #4b5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
            .field-value { color: #111827; font-size: 15px; line-height: 1.7; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 600; margin-right: 10px; }
            .badge-status { background: #dbeafe; color: #1e40af; }
            .badge-severity-low { background: #d1fae5; color: #065f46; }
            .badge-severity-medium { background: #fef3c7; color: #92400e; }
            .badge-severity-high { background: #fed7aa; color: #9a3412; }
            .badge-severity-critical { background: #fee2e2; color: #991b1b; }
            .notes-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 12px 0; border-radius: 6px; }
            .timeline { margin: 20px 0; }
            .timeline-item { display: flex; gap: 16px; margin-bottom: 24px; position: relative; }
            .timeline-item:not(:last-child)::before { content: ''; position: absolute; left: 11px; top: 32px; bottom: -24px; width: 2px; background: #e5e7eb; }
            .timeline-dot { width: 24px; height: 24px; background: #3b82f6; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; }
            .timeline-content { flex: 1; }
            .timeline-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
            .timeline-status { font-weight: 600; color: #1f2937; font-size: 15px; }
            .timeline-time { color: #6b7280; font-size: 12px; }
            .timeline-user { color: #4b5563; font-size: 13px; margin-bottom: 6px; }
            .timeline-notes { background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 14px; color: #374151; margin-top: 8px; }
            .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            @media print {
              body { margin: 20px; }
              .no-print { display: none; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏛️ CivicLens Report</h1>
            <div class="subtitle">Report #${reportNum}</div>
            <div class="meta">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
          </div>
          
          <!-- Report Information -->
          <div class="section">
            <div class="section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Report Information
            </div>
            <div class="field">
              <div class="field-label">Title</div>
              <div class="field-value"><strong>${report.title}</strong></div>
            </div>
            <div class="field">
              <div class="field-label">Description</div>
              <div class="field-value">${report.description || 'N/A'}</div>
            </div>
            <div class="field">
              <div class="field-label">Current Status & Priority</div>
              <div class="field-value">
                <span class="badge badge-status">${toLabel(report.status)}</span>
                <span class="badge badge-severity-${report.severity}">${toLabel(report.severity)} Priority</span>
              </div>
            </div>
          </div>
          
          <!-- Classification -->
          <div class="section">
            <div class="section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              Classification & Processing
            </div>
            <div class="field">
              <div class="field-label">Category</div>
              <div class="field-value">${toLabel(report.category)}</div>
            </div>
            ${report.sub_category ? `
            <div class="field">
              <div class="field-label">Sub-Category</div>
              <div class="field-value">${toLabel(report.sub_category)}</div>
            </div>
            ` : ''}
            ${report.classification_notes ? `
            <div class="field">
              <div class="field-label">Processing Notes</div>
              <div class="notes-box">${report.classification_notes}</div>
            </div>
            ` : ''}
          </div>
          
          <!-- Location -->
          <div class="section">
            <div class="section-title">
              <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>
              Location Details
            </div>
            <div class="grid-2">
              <div class="field">
                <div class="field-label">Address</div>
                <div class="field-value">${report.address || 'N/A'}</div>
              </div>
              <div class="field">
                <div class="field-label">Coordinates</div>
                <div class="field-value">${report.latitude.toFixed(6)}°N, ${report.longitude.toFixed(6)}°E</div>
              </div>
            </div>
          </div>
          
          <!-- Assignment -->
          ${report.department || report.task ? `
          <div class="section">
            <div class="section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Assignment Details
            </div>
            ${report.department ? `
            <div class="field">
              <div class="field-label">Assigned Department</div>
              <div class="field-value">${report.department.name}</div>
            </div>
            ` : ''}
            ${report.task ? `
            <div class="field">
              <div class="field-label">Task Assignment</div>
              <div class="field-value">
                ${report.task.officer ? `
                  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin-top: 8px;">
                    <div style="font-weight: 600; color: #166534; margin-bottom: 8px;">Officer: ${report.task.officer.full_name}</div>
                    ${report.task.officer.employee_id ? `<div style="font-size: 14px; color: #15803d; margin-bottom: 4px;">Employee ID: ${report.task.officer.employee_id}</div>` : ''}
                    ${report.task.officer.email ? `<div style="font-size: 14px; color: #15803d; margin-bottom: 4px;">Email: ${report.task.officer.email}</div>` : ''}
                    ${report.task.officer.phone ? `<div style="font-size: 14px; color: #15803d; margin-bottom: 4px;">Phone: ${report.task.officer.phone}</div>` : ''}
                    ${report.task.officer.role ? `<div style="font-size: 14px; color: #15803d; margin-bottom: 4px;">Role: ${toLabel(report.task.officer.role)}</div>` : ''}
                    <div style="border-top: 1px solid #86efac; margin-top: 8px; padding-top: 8px;">
                      <div style="font-size: 14px; color: #15803d;">Task ID: ${report.task.id}</div>
                      ${report.task.priority ? `<div style="font-size: 14px; color: #15803d;">Priority: ${report.task.priority}</div>` : ''}
                      ${report.task.assigned_at ? `<div style="font-size: 14px; color: #15803d;">Assigned: ${new Date(report.task.assigned_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>` : ''}
                    </div>
                  </div>
                ` : `
                  <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 8px;">
                    <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">Task Created</div>
                    <div style="font-size: 14px; color: #92400e;">Task ID: ${report.task.id}</div>
                    <div style="font-size: 14px; color: #92400e; margin-top: 4px;">Officer information not loaded</div>
                  </div>
                `}
              </div>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Audit Trail -->
          ${history && history.history.length > 0 ? `
          <div class="section">
            <div class="section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Complete Audit Trail
            </div>
            <div class="timeline">
              ${history.history.map((h, idx) => `
                <div class="timeline-item">
                  <div class="timeline-dot">${idx + 1}</div>
                  <div class="timeline-content">
                    <div class="timeline-header">
                      <div class="timeline-status">${toLabel(h.new_status)}</div>
                      <div class="timeline-time">${new Date(h.changed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </div>
                    ${h.changed_by_user ? `
                    <div class="timeline-user">Changed by: ${h.changed_by_user.full_name} (${h.changed_by_user.email})</div>
                    ` : ''}
                    ${h.notes ? `
                    <div class="timeline-notes">Notes: ${h.notes}</div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <!-- Metadata -->
          <div class="section">
            <div class="section-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Report Metadata
            </div>
            <div class="grid-2">
              <div class="field">
                <div class="field-label">Report ID</div>
                <div class="field-value">${report.id}</div>
              </div>
              <div class="field">
                <div class="field-label">Report Number</div>
                <div class="field-value">${reportNum}</div>
              </div>
              <div class="field">
                <div class="field-label">Created On</div>
                <div class="field-value">${new Date(report.created_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
              </div>
              <div class="field">
                <div class="field-label">Last Updated</div>
                <div class="field-value">${report.updated_at ? new Date(report.updated_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>CivicLens - Government Complaint Management System</strong></p>
            <p>This is an official report generated from the CivicLens platform</p>
            <p>Document: ${filename}.pdf</p>
          </div>
          
          <div class="no-print" style="margin-top: 40px; text-align: center; padding: 20px; background: #f9fafb; border-radius: 8px;">
            <button onclick="window.print()" style="padding: 14px 28px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; margin-right: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              🖨️ Print / Save as PDF
            </button>
            <button onclick="window.close()" style="padding: 14px 28px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ✖️ Close
            </button>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.document.title = filename;
    }
  };

  const handleStatusChange = async (newStatus: ReportStatus) => {
    if (!confirm(`Change status to '${toLabel(newStatus)}'?`)) return;
    const payload: StatusUpdateRequest = { new_status: newStatus };
    try {
      const updated = await reportsApi.updateStatus(reportId, payload);
      setReport(updated);
      onUpdated?.(updated);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to update status');
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-40 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-800 font-medium">{error}</p>
    </div>
  );
  if (!report) return (
    <div className="text-center py-8 text-gray-500">Report not found</div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section - Using Shared Component */}
      <ReportHeader 
        report={report} 
        showExportButton={true}
        onExport={handleExportPDF}
      />

      {/* Report Info Section - Using Shared Component */}
      <ReportInfoSection report={report} showFullDetails={false} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Classification Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Classification</h3>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Category</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{toLabel(report.category)}</p>
              </div>
              {report.sub_category && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sub-Category</span>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{toLabel(report.sub_category)}</p>
                </div>
              )}
              {report.classification_notes && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing Notes</span>
                  <p className="text-sm text-gray-700 mt-1 bg-primary-50 border border-primary-200 rounded-lg p-3 leading-relaxed">{report.classification_notes}</p>
                </div>
              )}
              {report.confidence_score && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Confidence</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.round(report.confidence_score * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{Math.round(report.confidence_score * 100)}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Location</h3>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coordinates</span>
                <p className="text-sm font-mono text-gray-900 mt-1">{report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E</p>
              </div>
              {report.address && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Address</span>
                  <p className="text-sm text-gray-900 mt-1 leading-relaxed">{report.address}</p>
                </div>
              )}
              <a
                href={`https://maps.google.com/?q=${report.latitude},${report.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Map
              </a>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Assignment Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary-100 rounded-lg">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Assignment</h3>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{report.department?.name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Officer</span>
                <p className="text-sm font-semibold text-gray-900 mt-1">{report.task?.officer?.full_name || 'Pending Assignment'}</p>
              </div>
              {admin && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 italic">Note: Use the actions menu in the reports table to reassign</p>
                </div>
              )}
            </div>
          </div>

          {/* Citizen Information */}
          {report.user && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Citizen Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</span>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{report.user.full_name || 'Anonymous'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</span>
                  <p className="text-sm font-mono text-gray-900 mt-1">{report.user.phone}</p>
                </div>
                {report.user.email && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                    <p className="text-sm text-gray-900 mt-1">{report.user.email}</p>
                  </div>
                )}
                {report.user.reputation_score !== undefined && (
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reputation</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-gray-900">{report.user.reputation_score} pts</span>
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Gallery Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Media Files ({media.length})</h3>
        </div>
        {media.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {media.map((file) => {
              const mediaUrl = getMediaUrl(file.file_url);
              console.log('Media file:', { id: file.id, type: file.file_type, url: mediaUrl });
              
              return (
                <div key={file.id} className="relative group">
                  {file.file_type === 'image' ? (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-primary-500 transition-colors relative">
                        <img 
                          src={mediaUrl} 
                          alt={file.caption || 'Report image'} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            console.error('Image load error:', { url: mediaUrl, file_url: file.file_url });
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4">
                                  <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-xs text-center">Image unavailable</p>
                                </div>
                              `;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black bg-opacity-50 px-3 py-1 rounded">
                            Click to view
                          </span>
                        </div>
                      </div>
                      {file.is_primary && (
                        <span className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full shadow-md font-medium">Primary</span>
                      )}
                    </a>
                  ) : (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="aspect-square bg-gray-50 rounded-lg border-2 border-gray-200 group-hover:border-primary-400 transition-colors flex flex-col items-center justify-center p-4">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                        <p className="text-xs text-gray-500 text-center">Audio File</p>
                      </div>
                    </a>
                  )}
                  {file.caption && (
                    <p className="text-xs text-gray-600 mt-2 truncate" title={file.caption}>{file.caption}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 font-medium">No media files attached</p>
            <p className="text-sm text-gray-400 mt-1">Photos and audio will appear here</p>
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Timeline</h3>
        </div>
        {history?.history?.length ? (
          <div className="space-y-4">
            {history.history.map((h, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-primary-600 rounded-full ring-4 ring-primary-100"></div>
                  {idx < history.history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status={h.new_status} size="sm" />
                  </div>
                  <span className="text-xs text-gray-500">
                    {h.changed_at 
                      ? new Date(h.changed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'N/A'
                    }
                  </span>
                  {h.changed_by_user && (
                    <p className="text-xs text-gray-600 mt-1">
                      Changed by: {h.changed_by_user.full_name}
                    </p>
                  )}
                  {h.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{h.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No timeline history available</p>
        )}
      </div>

      {/* Admin Actions */}
      {admin && allowedNext.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 className="text-base font-semibold text-blue-900">Available Status Changes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedNext.map((s) => (
              <button 
                key={s} 
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium shadow-sm hover:shadow" 
                onClick={() => handleStatusChange(s)}
              >
                {toLabel(s)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

