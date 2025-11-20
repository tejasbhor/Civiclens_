"use client";

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Department, UserRole } from '@/types';
import { departmentsApi } from '@/lib/api/departments';
import apiClient from '@/lib/api/client';

interface AddOfficerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OfficerFormData {
  phone: string;
  email: string;
  full_name: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  department_id: number | null;
}

export function AddOfficerModal({ onClose, onSuccess }: AddOfficerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<OfficerFormData>({
    phone: '',
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    role: UserRole.NODAL_OFFICER,
    department_id: null,
  });

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasDigit: false,
    hasSpecial: false,
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    // Validate password
    setPasswordValidation({
      minLength: formData.password.length >= 12,
      hasUppercase: /[A-Z]/.test(formData.password),
      hasDigit: /\d/.test(formData.password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
    });
  }, [formData.password]);

  const loadDepartments = async () => {
    try {
      const deps = await departmentsApi.list();
      setDepartments(deps);
    } catch (e) {
      console.error('Failed to load departments', e);
    }
  };

  const handleChange = (field: keyof OfficerFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): string | null => {
    // Phone validation
    if (!formData.phone) return 'Phone number is required';
    if (formData.phone.length !== 10) {
      return 'Phone number must be exactly 10 digits';
    }
    if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      return 'Invalid phone number (must start with 6, 7, 8, or 9)';
    }

    // Email validation
    if (!formData.email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Invalid email format';
    }

    // Name validation
    if (!formData.full_name) return 'Full name is required';
    if (formData.full_name.length < 2) return 'Full name must be at least 2 characters';

    // Password validation
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 12) return 'Password must be at least 12 characters';
    if (!passwordValidation.hasUppercase) return 'Password must contain at least one uppercase letter';
    if (!passwordValidation.hasDigit) return 'Password must contain at least one digit';
    if (!passwordValidation.hasSpecial) return 'Password must contain at least one special character';

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) return 'Role is required';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        phone: `+91${formData.phone}`, // Prepend +91 country code
        email: formData.email,
        full_name: formData.full_name,
        password: formData.password,
        role: formData.role,
        department_id: formData.department_id || undefined,
      };

      console.log('Creating officer with payload:', payload);

      await apiClient.post('/auth/create-officer', payload);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating officer:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle different error formats
      let errorMessage = 'Failed to create officer account';
      
      if (err.response?.data?.detail) {
        // Pydantic validation errors
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map((e: any) => `${e.loc?.join(' → ') || 'Field'}: ${e.msg}`)
            .join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else {
          errorMessage = JSON.stringify(err.response.data.detail);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isPasswordValid = passwordValidation.minLength && 
                          passwordValidation.hasUppercase && 
                          passwordValidation.hasDigit &&
                          passwordValidation.hasSpecial;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Officer</h2>
              <p className="text-sm text-gray-600">Create a new officer/admin account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Personal Information
            </h3>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="e.g., Rajesh Kumar Singh"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 text-sm font-medium text-gray-700">
                  +91
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                    if (value.length <= 10) {
                      handleChange('phone', value);
                    }
                  }}
                  placeholder="9876543210"
                  maxLength={10}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter 10-digit mobile number
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g., rajesh.singh@Navi Mumbai.gov.in"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
          </div>

          {/* Account Credentials */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Account Credentials
            </h3>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Password Requirements */}
              <div className="mt-2 space-y-1">
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.minLength ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                  <span>At least 12 characters</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.hasUppercase ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                  <span>At least one uppercase letter</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasDigit ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.hasDigit ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                  <span>At least one digit</span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${passwordValidation.hasSpecial ? 'text-green-600' : 'text-gray-500'}`}>
                  {passwordValidation.hasSpecial ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
                  <span>At least one special character (!@#$%...)</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          {/* Role & Department */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Role & Assignment
            </h3>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value as UserRole)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value={UserRole.NODAL_OFFICER}>Nodal Officer</option>
                <option value={UserRole.AUDITOR}>Auditor</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === UserRole.NODAL_OFFICER && 'Field officer who handles reports and tasks'}
                {formData.role === UserRole.AUDITOR && 'Oversees and audits report handling'}
                {formData.role === UserRole.ADMIN && 'Full administrative access'}
              </p>
            </div>

            {/* Employee ID Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-800">Employee ID Auto-Generated</p>
                  <p className="text-xs text-blue-700 mt-1">
                    The system will automatically generate an employee ID (e.g., EMP-2025-000015) after account creation.
                  </p>
                </div>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department <span className="text-gray-400">(optional)</span>
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => handleChange('department_id', e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">No Department (Unassigned)</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Officers can be assigned to a department later
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !isPasswordValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Officer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
