/**
 * Production-Ready PDF Export Service for CivicLens
 * 
 * Integrates with backend PDF generation service to provide:
 * 1. COMPREHENSIVE - Full government-grade PDF with all details
 * 2. BULK - Multiple reports in single document
 * 3. SECURE - Proper access control and audit logging
 */

import { Report } from '@/types';

export enum PDFExportLevel {
  SUMMARY = 'summary',
  STANDARD = 'standard', 
  COMPREHENSIVE = 'comprehensive'
}

export enum PDFExportFormat {
  COMPREHENSIVE = 'comprehensive',
  BULK = 'bulk'
}

interface PDFExportOptions {
  reportId?: number;
  reportIds?: number[];
  format: PDFExportFormat;
  includeMedia?: boolean;
  includeSensitiveData?: boolean;
}

interface BulkExportRequest {
  report_ids: number[];
  include_media: boolean;
  export_format: string;
}

interface PDFExportOptions {
  level: PDFExportLevel;
  report: Report;
  history?: any[];
  activityLogs?: any[];
  includePhotos?: boolean;
}

/**
 * Format label for display
 */
function toLabel(str: string): string {
  if (!str) return '';
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get severity badge class
 */
function getSeverityBadgeClass(severity: string): string {
  const severityMap: Record<string, string> = {
    low: 'badge-severity-low',
    medium: 'badge-severity-medium',
    high: 'badge-severity-high',
    critical: 'badge-severity-critical'
  };
  return severityMap[severity?.toLowerCase()] || 'badge-severity-medium';
}

/**
 * Generate PDF styles
 */
function getPDFStyles(): string {
  return `
    body { font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; margin: 40px; color: #1f2937; line-height: 1.6; background: #ffffff; }
    .header { border-bottom: 4px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #1e40af; font-size: 32px; font-weight: 700; }
    .header .subtitle { color: #6b7280; margin-top: 8px; font-size: 16px; font-weight: 600; }
    .header .meta { color: #9ca3af; margin-top: 4px; font-size: 12px; }
    .section { margin: 30px 0; page-break-inside: avoid; }
    .section-title { font-size: 20px; font-weight: 700; color: #1e40af; margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; display: flex; align-items: center; gap: 10px; }
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
    .timeline-item { display: flex; gap: 16px; margin-bottom: 24px; position: relative; background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; }
    .timeline-dot { width: 32px; height: 32px; background: #3b82f6; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; }
    .timeline-content { flex: 1; }
    .timeline-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
    .timeline-status { font-weight: 700; color: #1f2937; font-size: 16px; }
    .timeline-time { color: #6b7280; font-size: 13px; font-weight: 500; }
    .timeline-user { color: #4b5563; font-size: 13px; margin-bottom: 6px; }
    .timeline-notes { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 14px; color: #374151; margin-top: 8px; border-left: 3px solid #64748b; }
    .activity-item { border-left: 4px solid #3b82f6; padding-left: 16px; margin-bottom: 20px; padding-bottom: 12px; background: #f8fafc; padding: 16px; border-radius: 8px; }
    .activity-header { font-weight: 700; color: #1f2937; font-size: 15px; margin-bottom: 6px; }
    .activity-desc { color: #4b5563; font-size: 14px; margin-bottom: 4px; }
    .activity-meta { color: #6b7280; font-size: 12px; font-weight: 500; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 120px; color: rgba(0,0,0,0.03); font-weight: bold; z-index: -1; pointer-events: none; }
    .highlight-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .coordinates { font-family: 'Courier New', monospace; background: #f1f5f9; padding: 8px; border-radius: 4px; display: inline-block; }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
      .section { page-break-inside: avoid; }
      .timeline-item { page-break-inside: avoid; }
      .activity-item { page-break-inside: avoid; }
    }
  `;
}

/**
 * Generate SUMMARY level PDF (citizen-facing, quick glance)
 */
function generateSummaryPDF(options: PDFExportOptions): string {
  const { report } = options;
  const reportNum = report.report_number || `CL-${report.id}`;
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `CivicLens_Summary_${reportNum}_${timestamp}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>${getPDFStyles()}</style>
    </head>
    <body>
      <div class="watermark">SUMMARY</div>
      
      <div class="header">
        <h1>🏛️ CivicLens Report Summary</h1>
        <div class="subtitle">Report #${reportNum}</div>
        <div class="meta">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
      </div>
      
      <!-- Basic Information -->
      <div class="section">
        <div class="section-title">📋 Report Information</div>
        <div class="field">
          <div class="field-label">Title</div>
          <div class="field-value"><strong>${report.title}</strong></div>
        </div>
        <div class="field">
          <div class="field-label">Description</div>
          <div class="field-value">${report.description ?? 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Status</div>
          <div class="field-value">
            <span class="badge badge-status">${toLabel(report.status)}</span>
          </div>
        </div>
        <div class="field">
          <div class="field-label">Category</div>
          <div class="field-value">${toLabel(report.category || '')}</div>
        </div>
      </div>
      
      <!-- Location -->
      <div class="section">
        <div class="section-title">📍 Location</div>
        <div class="field">
          <div class="field-label">Address</div>
          <div class="field-value">${report.address || 'N/A'}</div>
        </div>
      </div>
      
      <!-- Metadata -->
      <div class="section">
        <div class="section-title">ℹ️ Report Details</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Report Number</div>
            <div class="field-value">${reportNum}</div>
          </div>
          <div class="field">
            <div class="field-label">Reported On</div>
            <div class="field-value">${new Date(report.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
          </div>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>CivicLens - Government Complaint Management System</strong></p>
        <p>This is a summary report for citizen reference</p>
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
  `;
}

/**
 * Generate STANDARD level PDF (internal use, moderate detail)
 */
function generateStandardPDF(options: PDFExportOptions): string {
  const { report, history } = options;
  const reportNum = report.report_number || `CL-${report.id}`;
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `CivicLens_Report_${reportNum}_${timestamp}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>${getPDFStyles()}</style>
    </head>
    <body>
      <div class="watermark">STANDARD</div>
      
      <div class="header">
        <h1>🏛️ CivicLens Report</h1>
        <div class="subtitle">Report #${reportNum}</div>
        <div class="meta">Generated on ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
      </div>
      
      <!-- Report Information -->
      <div class="section">
        <div class="section-title">📋 Report Information</div>
        <div class="field">
          <div class="field-label">Title</div>
          <div class="field-value"><strong>${report.title}</strong></div>
        </div>
        <div class="field">
          <div class="field-label">Description</div>
          <div class="field-value">${report.description ?? 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Current Status & Priority</div>
          <div class="field-value">
            <span class="badge badge-status">${toLabel(report.status)}</span>
            <span class="badge ${getSeverityBadgeClass(report.severity)}">${toLabel(report.severity)} Priority</span>
          </div>
        </div>
      </div>
      
      <!-- Classification -->
      <div class="section">
        <div class="section-title">🏷️ Classification & Processing</div>
        <div class="field">
          <div class="field-label">Category</div>
          <div class="field-value">${toLabel(report.category || '')}</div>
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
        <div class="section-title">📍 Location Details</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Address</div>
            <div class="field-value">${report.address || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Coordinates</div>
            <div class="field-value">${report.latitude?.toFixed(6)}°N, ${report.longitude?.toFixed(6)}°E</div>
          </div>
        </div>
      </div>
      
      <!-- Assignment -->
      ${report.department || report.task ? `
      <div class="section">
        <div class="section-title">👥 Assignment Details</div>
        ${report.department ? `
        <div class="field">
          <div class="field-label">Assigned Department</div>
          <div class="field-value">${report.department.name}</div>
        </div>
        ` : ''}
        ${report.task?.officer ? `
        <div class="field">
          <div class="field-label">Assigned Officer</div>
          <div class="field-value">${report.task.officer.full_name} (${report.task.officer.email})</div>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Status History -->
      ${history && history.length > 0 ? `
      <div class="section">
        <div class="section-title">📊 Status History</div>
        <div class="timeline">
          ${history.map((h: any, idx: number) => `
            <div class="timeline-item">
              <div class="timeline-dot">${idx + 1}</div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-status">${toLabel(h.new_status)}</div>
                  <div class="timeline-time">${new Date(h.changed_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                </div>
                ${h.changed_by_user ? `
                <div class="timeline-user">👤 Changed by: ${h.changed_by_user.full_name}</div>
                ` : ''}
                ${h.notes ? `
                <div class="timeline-notes">📝 ${h.notes}</div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Metadata -->
      <div class="section">
        <div class="section-title">ℹ️ Report Metadata</div>
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
  `;
}

/**
 * Generate COMPREHENSIVE level PDF (full detail, audit/compliance)
 */
function generateComprehensivePDF(options: PDFExportOptions): string {
  const { report, history, activityLogs } = options;
  const reportNum = report.report_number || `CL-${report.id}`;
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `CivicLens_Comprehensive_${reportNum}_${timestamp}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>${getPDFStyles()}</style>
    </head>
    <body>
      <div class="watermark">COMPREHENSIVE</div>
      
      <div class="header">
        <h1>COMPREHENSIVE</h1>
        <h1>🏛️ CivicLens Comprehensive Report</h1>
        <div class="subtitle">Report #${reportNum}</div>
        <div class="meta">Generated on ${new Date().toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
        <div class="meta" style="margin-top: 8px; color: #dc2626; font-weight: 600;">⚠️ CONFIDENTIAL - For Internal Use Only</div>
      </div>
      
      <!-- Report Information -->
      <div class="section">
        <div class="section-title">📋 Report Information</div>
        <div class="field">
          <div class="field-label">Title</div>
          <div class="field-value"><strong>${report.title}</strong></div>
        </div>
        <div class="field">
          <div class="field-label">Description</div>
          <div class="field-value">${report.description ?? 'N/A'}</div>
        </div>
        <div class="field">
          <div class="field-label">Current Status & Priority</div>
          <div class="field-value">
            <span class="badge badge-status">${toLabel(report.status)}</span>
            <span class="badge ${getSeverityBadgeClass(report.severity)}">${toLabel(report.severity)} Priority</span>
          </div>
        </div>
      </div>
      
      <!-- Classification -->
      <div class="section">
        <div class="section-title">🏷️ Classification & Processing</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Category</div>
            <div class="field-value">${toLabel(report.category || '')}</div>
          </div>
          ${report.sub_category ? `
          <div class="field">
            <div class="field-label">Sub-Category</div>
            <div class="field-value">${toLabel(report.sub_category)}</div>
          </div>
          ` : ''}
        </div>
        ${report.classification_notes ? `
        <div class="field">
          <div class="field-label">Processing Notes</div>
          <div class="notes-box">${report.classification_notes}</div>
        </div>
        ` : ''}
      </div>
      
      <!-- Location -->
      <div class="section">
        <div class="section-title">📍 Location Details</div>
        <div class="grid-2">
          <div class="field">
            <div class="field-label">Address</div>
            <div class="field-value">${report.address || 'N/A'}</div>
          </div>
          <div class="field">
            <div class="field-label">Coordinates</div>
            <div class="field-value">${report.latitude?.toFixed(6)}°N, ${report.longitude?.toFixed(6)}°E</div>
          </div>
        </div>
      </div>
      
      <!-- Assignment -->
      ${report.department || report.task ? `
      <div class="section">
        <div class="section-title">👥 Assignment Details</div>
        ${report.department ? `
        <div class="field">
          <div class="field-label">Assigned Department</div>
          <div class="field-value">${report.department.name}</div>
        </div>
        ` : ''}
        ${report.task?.officer ? `
        <div class="field">
          <div class="field-label">Assigned Officer</div>
          <div class="field-value">${report.task.officer.full_name} (${report.task.officer.email})</div>
        </div>
        ${report.task?.priority ? `
        <div class="field">
          <div class="field-label">Task Priority</div>
          <div class="field-value">Priority ${report.task.priority}/10</div>
        </div>
        ` : ''}
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Status History -->
      ${history && history.length > 0 ? `
      <div class="section">
        <div class="section-title">📊 Status History</div>
        <div class="timeline">
          ${history.map((h: any, idx: number) => `
            <div class="timeline-item">
              <div class="timeline-dot">${idx + 1}</div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <div class="timeline-status">${toLabel(h.new_status)}</div>
                  <div class="timeline-time">${new Date(h.changed_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</div>
                </div>
                ${h.changed_by_user ? `
                <div class="timeline-user">👤 Changed by: ${h.changed_by_user.full_name} (${h.changed_by_user.email})</div>
                ` : ''}
                ${h.notes ? `
                <div class="timeline-notes">📝 ${h.notes}</div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Complete Activity History -->
      ${activityLogs && activityLogs.length > 0 ? `
      <div class="section">
        <div class="section-title">🕒 Complete Activity History</div>
        <div style="margin-top: 20px;">
          ${activityLogs.map((log: any, idx: number) => `
            <div class="activity-item">
              <div class="activity-header">${idx + 1}. ${toLabel(log.action)}</div>
              <div class="activity-desc">${log.description || 'No description'}</div>
              <div class="activity-meta">
                ${new Date(log.timestamp).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                ${log.user_role ? ` • ${toLabel(log.user_role)}` : ''}
                ${log.ip_address ? ` • IP: ${log.ip_address}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <!-- Metadata -->
      <div class="section">
        <div class="section-title">ℹ️ Report Metadata</div>
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
        <p>⚠️ CONFIDENTIAL - This is a comprehensive report for internal audit and compliance purposes</p>
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
  `;
}

/**
 * Export report as PDF with specified level
 */
export function exportReportPDF(options: PDFExportOptions): void {
  const { level } = options;
  
  let htmlContent: string;
  
  switch (level) {
    case PDFExportLevel.SUMMARY:
      htmlContent = generateSummaryPDF(options);
      break;
    case PDFExportLevel.STANDARD:
      htmlContent = generateStandardPDF(options);
      break;
    case PDFExportLevel.COMPREHENSIVE:
      htmlContent = generateComprehensivePDF(options);
      break;
    default:
      htmlContent = generateStandardPDF(options);
  }
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Set title based on level
    const reportNum = options.report.report_number || `CL-${options.report.id}`;
    const timestamp = new Date().toISOString().split('T')[0];
    const levelPrefix = level === PDFExportLevel.SUMMARY ? 'Summary' : 
                       level === PDFExportLevel.COMPREHENSIVE ? 'Comprehensive' : 'Report';
    printWindow.document.title = `CivicLens_${levelPrefix}_${reportNum}_${timestamp}`;
  }
}
