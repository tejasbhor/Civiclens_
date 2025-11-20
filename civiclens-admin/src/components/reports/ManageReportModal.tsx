"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { reportsApi, ClassifyReportRequest, AssignDepartmentRequest, AssignOfficerRequest } from '@/lib/api/reports';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { ReportSeverity, Department, User, UserRole, Report } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import apiClient from '@/lib/api/client';

interface ManageReportModalProps {
  reportId: number;
  reportNumber: string;
  title: string;
  currentCategory?: string | null;
  currentSeverity?: string;
  currentDepartmentId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Helper to fetch full report data
const fetchReportData = async (reportId: number): Promise<Report | null> => {
  try {
    const response = await apiClient.get(`/reports/${reportId}`);
    return response.data;
  } catch (e) {
    console.error('Failed to fetch report:', e);
    return null;
  }
};

const toLabel = (str: string): string => {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export function ManageReportModal({ 
  reportId, 
  reportNumber, 
  title,
  currentCategory,
  currentSeverity,
  currentDepartmentId,
  onClose, 
  onSuccess 
}: ManageReportModalProps) {
  // Step 1: Categorization
  const [category, setCategory] = useState(currentCategory || '');
  const [severity, setSeverity] = useState<'' | 'low' | 'medium' | 'high' | 'critical'>(currentSeverity as any || '');
  const [notes, setNotes] = useState('');
  
  // Step 2: Department Assignment
  const [departmentId, setDepartmentId] = useState<number | null>(currentDepartmentId || null);
  const [departmentNotes, setDepartmentNotes] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Step 3: Officer Assignment
  const [officerId, setOfficerId] = useState<number | null>(null);
  const [priority, setPriority] = useState<number>(5);
  const [officerNotes, setOfficerNotes] = useState('');
  const [officers, setOfficers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fullReport, setFullReport] = useState<Report | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Ref for content container to enable auto-scroll
  const contentRef = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  
  // Load full report data for header display
  useEffect(() => {
    const loadReport = async () => {
      const data = await fetchReportData(reportId);
      setFullReport(data);
    };
    loadReport();
  }, [reportId]);

  const categories = [
    { value: 'roads', label: 'Roads' },
    { value: 'water_supply', label: 'Water Supply' },
    { value: 'sanitation', label: 'Sanitation' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'street_lights', label: 'Street Lights' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'garbage', label: 'Garbage Collection' },
    { value: 'parks', label: 'Parks & Recreation' },
    { value: 'public_transport', label: 'Public Transport' },
    { value: 'pollution', label: 'Pollution' },
    { value: 'other', label: 'Other' },
  ];

  const severities: Array<{ value: 'low' | 'medium' | 'high' | 'critical'; label: string; color: string }> = [
    { value: 'low', label: 'Low', color: 'text-green-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
  ];

  const loadDepartments = async () => {
    try {
      const deps = await departmentsApi.list();
      setDepartments(deps);
    } catch (e) {
      console.error('Failed to load departments', e);
    }
  };

  const loadOfficers = useCallback(async () => {
    try {
      // If department is selected, load officers for that department only
      if (departmentId) {
        console.log('🔍 Loading officers for department:', departmentId);
        const officersData = await usersApi.getOfficers(departmentId);
        console.log('👮 Officers loaded for department:', officersData.length, officersData);
        setOfficers(Array.isArray(officersData) ? officersData : []);
      } else {
        // No department selected, load all officers
        const response = await usersApi.listUsers({ per_page: 100 });
        // Filter for nodal officers and admins
        const officerUsers = response.data.filter((u: User) => 
          u.role === UserRole.NODAL_OFFICER || u.role === UserRole.ADMIN
        );
        setOfficers(Array.isArray(officerUsers) ? officerUsers : []);
      }
    } catch (e) {
      console.error('Failed to load officers', e);
      setOfficers([]); // Set empty array on error to prevent undefined
    }
  }, [departmentId]);

  useEffect(() => {
    loadDepartments();
  }, []);

  // Reload officers when department changes
  useEffect(() => {
    if (currentStep === 3) {
      loadOfficers();
    }
  }, [departmentId, currentStep, loadOfficers]);

  // Auto-scroll to new step when it changes
  useEffect(() => {
    if (currentStep === 2 && step2Ref.current) {
      step2Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (currentStep === 3 && step3Ref.current) {
      step3Ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (currentStep === 1 && contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const handleSubmitClick = () => {
    if (!category || !severity) {
      setError('Please select both category and severity');
      return;
    }
    setError('');
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    
    try {
      setLoading(true);
      setError('');
      
      // Step 1: Classify
      await reportsApi.classifyReport(reportId, {
        category,
        severity,
        notes: notes.trim() || undefined
      });

      // Step 2: Assign Department (if selected)
      if (departmentId) {
        await reportsApi.assignDepartment(reportId, {
          department_id: departmentId,
          notes: departmentNotes.trim() || undefined
        });
      }

      // Step 3: Assign Officer (if selected and department assigned)
      if (officerId && departmentId) {
        await reportsApi.assignOfficer(reportId, {
          officer_user_id: officerId,
          priority,
          notes: officerNotes.trim() || undefined
        });
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to manage report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = category && severity;
  const canProceedToStep3 = canProceedToStep2 && departmentId;

  const handleExportPDF = async (level: 'summary' | 'standard' | 'comprehensive') => {
    if (!fullReport) return;
    
    const { exportReportPDF, PDFExportLevel } = await import('@/lib/utils/pdf-export-service');
    
    if (level === 'summary') {
      exportReportPDF({ level: PDFExportLevel.SUMMARY, report: fullReport });
    } else if (level === 'standard') {
      const history = await apiClient.get(`/reports/${reportId}/status-history`);
      exportReportPDF({ level: PDFExportLevel.STANDARD, report: fullReport, history: history.data.history });
    } else {
      const [history, activityLogs] = await Promise.all([
        apiClient.get(`/reports/${reportId}/status-history`),
        apiClient.get(`/audit/resource/report/${reportId}`)
      ]);
      exportReportPDF({ 
        level: PDFExportLevel.COMPREHENSIVE, 
        report: fullReport, 
        history: history.data.history,
        activityLogs: activityLogs.data
      });
    }
    setShowExportMenu(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Manage Report
              </h3>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-gray-600">{reportNumber}</p>
                {fullReport && (
                <>
                    <Badge status={fullReport.status} size="sm" />
                    <Badge status={fullReport.severity} size="sm" />
                </>
              )}
            </div>
              <p className="text-xs text-gray-500 mt-1">Process, categorize, and assign report</p>
            </div>
            <div className="flex items-center gap-2">
            {fullReport && (
                <div className="relative">
                <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Export PDF"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <button onClick={() => handleExportPDF('summary')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">
                        Summary
                      </button>
                      <button onClick={() => handleExportPDF('standard')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">
                        Standard
                      </button>
                      <button onClick={() => handleExportPDF('comprehensive')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700">
                        Comprehensive
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

        {/* Progress Steps */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3].map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-base transition-all ${
                    currentStep === step 
                      ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100 scale-110' 
                      : currentStep > step
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step ? '✓' : step}
                  </div>
                  <span className={`text-xs font-semibold mt-2 transition-colors ${
                    currentStep === step 
                      ? 'text-blue-600' 
                      : currentStep > step
                      ? 'text-green-600'
                      : 'text-gray-500'
                  }`}>
                    {step === 1 ? 'Categorize' : step === 2 ? 'Assign Dept' : 'Assign Officer'}
                  </span>
                </div>
                {index < 2 && (
                  <div className="flex-1 h-1 mx-4 rounded-full transition-all" style={{
                    background: currentStep > step + 1 ? '#10b981' : currentStep === step + 1 ? 'linear-gradient(to right, #10b981 50%, #e5e7eb 50%)' : '#e5e7eb'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div ref={contentRef} className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto scroll-smooth">
          {/* Report Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-1">REPORT</p>
            <p className="text-sm font-bold text-gray-900">{reportNumber}</p>
            <p className="text-sm font-semibold text-gray-800 mt-2">{title}</p>
            {fullReport?.description && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed line-clamp-3">
                {fullReport.description}
              </p>
            )}
          </div>

          {/* Step 1: Categorization */}
          <div className={`space-y-4 ${currentStep !== 1 && 'opacity-50'}`}>
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">1</span>
              Categorization
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={loading || currentStep !== 1}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {severities.map(sev => (
                  <button
                    key={sev.value}
                    onClick={() => setSeverity(sev.value)}
                    disabled={loading || currentStep !== 1}
                    className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      severity === sev.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        sev.value === 'low' ? 'bg-green-500' :
                        sev.value === 'medium' ? 'bg-yellow-500' :
                        sev.value === 'high' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`} />
                      {sev.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Notes <span className="text-gray-400">(optional)</span>
              </label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                rows={2}
                placeholder="Add notes about categorization..."
                disabled={loading || currentStep !== 1}
              />
            </div>
          </div>

          {/* Step 2: Department Assignment */}
          {currentStep >= 2 && (
            <div ref={step2Ref} className={`space-y-4 ${currentStep !== 2 && 'opacity-50'}`}>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">2</span>
                Assign Department
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-gray-400">(optional)</span>
                </label>
                <select 
                  value={departmentId || ''} 
                  onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading || currentStep !== 2}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea 
                  value={departmentNotes}
                  onChange={(e) => setDepartmentNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  rows={2}
                  placeholder="Add notes about department assignment..."
                  disabled={loading || currentStep !== 2}
                />
              </div>
            </div>
          )}

          {/* Step 3: Officer Assignment */}
          {currentStep >= 3 && (
            <div ref={step3Ref} className={`space-y-4 ${currentStep !== 3 && 'opacity-50'}`}>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">3</span>
                Assign Officer
              </h4>

              {/* Department Filter Info */}
              {departmentId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">Department Filter Active</span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Showing officers from {departments.find(d => d.id === departmentId)?.name || 'selected department'} only.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Officer <span className="text-gray-400">(optional)</span>
                </label>
                <select 
                  value={officerId || ''} 
                  onChange={(e) => setOfficerId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading || currentStep !== 3 || !departmentId}
                >
                  <option value="">Select Officer</option>
                  {officers.map(officer => (
                    <option key={officer.id} value={officer.id}>
                      {officer.full_name} ({officer.email}){officer.department?.name ? ` - ${officer.department.name}` : ''}
                    </option>
                  ))}
                </select>
                {!departmentId ? (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Assign department first to see available officers
                  </p>
                ) : officers.length === 0 ? (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    No officers available in this department
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    {officers.length} officer{officers.length !== 1 ? 's' : ''} available
                  </p>
                )}
              </div>

              {officerId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority (1-10)
                    </label>
                    <input 
                      type="number"
                      min="1"
                      max="10"
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      disabled={loading || currentStep !== 3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Task Notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea 
                      value={officerNotes}
                      onChange={(e) => setOfficerNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      rows={2}
                      placeholder="Add notes for the officer..."
                      disabled={loading || currentStep !== 3}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            {currentStep > 1 && (
            <button 
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
                disabled={loading}
              >
                ← Back
              </button>
            )}
          <button 
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors text-sm font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <div className="flex-1" />
            {currentStep < 3 ? (
            <button 
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm"
                disabled={loading || (currentStep === 1 && !canProceedToStep2)}
              >
                Next →
              </button>
            ) : (
            <button 
                onClick={handleSubmitClick}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm flex items-center gap-2"
                disabled={loading || !canProceedToStep2}
              >
                {loading ? (
                <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save & Complete
                </>
              )}
            </button>
          )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Save Report Changes?"
        message={`You are about to ${category && severity ? 'classify this report' : 'update this report'}${departmentId ? ', assign it to a department' : ''}${officerId ? ', and assign it to an officer' : ''}. This action will update the report status and notify relevant parties.`}
        confirmText="Save & Complete"
        cancelText="Cancel"
        variant="info"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </div>
  );
}
