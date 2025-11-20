"use client";

import React, { useState, useEffect } from 'react';
import { Report, ReportSeverity } from '@/types';
import { reportsApi } from '@/lib/api/reports';
import { departmentsApi } from '@/lib/api/departments';
import { usersApi } from '@/lib/api/users';
import { X, Loader2 } from 'lucide-react';

// Classify Report Form
export function ClassifyReportForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(report.category || '');
  const [severity, setSeverity] = useState<ReportSeverity | ''>(report.severity || '');
  const [notes, setNotes] = useState('');

  const categories = [
    { value: 'roads', label: 'Roads' },
    { value: 'water_supply', label: 'Water Supply' },
    { value: 'sanitation', label: 'Sanitation' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'street_lights', label: 'Street Lights' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'garbage', label: 'Garbage Collection' },
    { value: 'parks', label: 'Parks & Recreation' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !severity) return;
    
    setLoading(true);
    try {
      await reportsApi.classifyReport(report.id, {
        category,
        severity: severity as ReportSeverity,
        notes: notes.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to classify report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Classify Report</h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="">Select category</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as ReportSeverity)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="">Select severity</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
          placeholder="Add any classification notes..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !category || !severity}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Classify
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Assign Department Form
export function AssignDepartmentForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const deps = await departmentsApi.list();
      setDepartments(deps);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;
    
    setLoading(true);
    try {
      await reportsApi.assignDepartment(report.id, {
        department_id: Number(departmentId),
        notes: notes.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to assign department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Assign to Department</h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="">Select department</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
          placeholder="Add assignment notes..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !departmentId}
          className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Assign
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Assign Officer Form
export function AssignOfficerForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState<any[]>([]);
  const [officerId, setOfficerId] = useState<number | ''>('');
  const [priority, setPriority] = useState(5);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadOfficers();
  }, []);

  const loadOfficers = async () => {
    try {
      const response = await usersApi.listUsers({ per_page: 100 });
      const officerUsers = response.data.filter((u: any) => 
        u.role === 'nodal_officer' || u.role === 'admin'
      );
      setOfficers(officerUsers);
    } catch (err) {
      console.error('Failed to load officers', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerId) return;
    
    setLoading(true);
    try {
      await reportsApi.assignOfficer(report.id, {
        officer_user_id: Number(officerId),
        priority,
        notes: notes.trim() || undefined
      });
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to assign officer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Assign to Officer</h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Officer *</label>
        <select
          value={officerId}
          onChange={(e) => setOfficerId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          required
        >
          <option value="">Select officer</option>
          {officers.map(officer => (
            <option key={officer.id} value={officer.id}>{officer.full_name} ({officer.email})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Priority: {priority}</label>
        <input
          type="range"
          min="1"
          max="10"
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={2}
          placeholder="Add assignment notes..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !officerId}
          className="flex-1 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Assign
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// Add Update Form
export function AddUpdateForm({ report, onSuccess, onCancel }: { report: Report; onSuccess: () => void; onCancel: () => void }) {
  const [loading, setLoading] = useState(false);
  const [update, setUpdate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!update.trim()) return;
    
    setLoading(true);
    try {
      // TODO: Implement work updates API endpoint
      alert('Work updates feature coming soon!');
      onSuccess();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to add update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Add Work Update</h4>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Update *</label>
        <textarea
          value={update}
          onChange={(e) => setUpdate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          rows={3}
          placeholder="Describe the work progress..."
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !update.trim()}
          className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Add Update
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
