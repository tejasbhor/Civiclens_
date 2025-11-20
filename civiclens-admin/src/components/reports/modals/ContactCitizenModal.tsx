"use client";

import React, { useState } from 'react';
import { Report } from '@/types';
import { X, AlertCircle, Mail, Phone, MessageSquare } from 'lucide-react';

interface ContactCitizenModalProps {
  report: Report;
  onClose: () => void;
}

export function ContactCitizenModal({ report, onClose }: ContactCitizenModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'phone' | 'sms'>('email');
  const [message, setMessage] = useState('');

  const citizenEmail = report.user?.email || 'N/A';
  const citizenPhone = (report.user as any)?.phone_number || 'N/A';
  const citizenName = report.user?.full_name || 'Citizen';

  const handleCopyEmail = () => {
    if (citizenEmail !== 'N/A') {
      navigator.clipboard.writeText(citizenEmail);
      alert('Email copied to clipboard');
    }
  };

  const handleCopyPhone = () => {
    if (citizenPhone !== 'N/A') {
      navigator.clipboard.writeText(citizenPhone);
      alert('Phone number copied to clipboard');
    }
  };

  const handleSendEmail = () => {
    if (citizenEmail !== 'N/A') {
      const subject = `Regarding Report: ${report.report_number || `CL-${report.id}`}`;
      const body = message || `Dear ${citizenName},\n\nRegarding your report "${report.title}"...\n\nBest regards,\nCivicLens Team`;
      window.location.href = `mailto:${citizenEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  };

  const handleCallPhone = () => {
    if (citizenPhone !== 'N/A') {
      window.location.href = `tel:${citizenPhone}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contact Citizen</h2>
            <p className="text-sm text-gray-600 mt-1">{report.report_number || `CL-${report.id}`}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Citizen Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Citizen Information</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  <strong>Name:</strong> {citizenName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  <strong>Email:</strong> {citizenEmail}
                </span>
                {citizenEmail !== 'N/A' && (
                  <button
                    onClick={handleCopyEmail}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  <strong>Phone:</strong> {citizenPhone}
                </span>
                {citizenPhone !== 'N/A' && (
                  <button
                    onClick={handleCopyPhone}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Contact Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Contact Method
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMethod('email')}
                disabled={citizenEmail === 'N/A'}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'email'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${citizenEmail === 'N/A' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Mail className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Email</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('phone')}
                disabled={citizenPhone === 'N/A'}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'phone'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${citizenPhone === 'N/A' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Phone className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('sms')}
                disabled={citizenPhone === 'N/A'}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'sms'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${citizenPhone === 'N/A' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <MessageSquare className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">SMS</span>
              </button>
            </div>
          </div>

          {/* Message Template */}
          {selectedMethod === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder={`Dear ${citizenName},\n\nRegarding your report "${report.title}"...\n\nBest regards,\nCivicLens Team`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          )}

          {selectedMethod === 'sms' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMS Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder={`Hi ${citizenName}, regarding report ${report.report_number}...`}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                maxLength={160}
              />
              <p className="text-xs text-gray-500 mt-1">{message.length}/160 characters</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            {selectedMethod === 'email' && (
              <button
                onClick={handleSendEmail}
                disabled={citizenEmail === 'N/A'}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Open Email Client
              </button>
            )}
            {selectedMethod === 'phone' && (
              <button
                onClick={handleCallPhone}
                disabled={citizenPhone === 'N/A'}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Call Now
              </button>
            )}
            {selectedMethod === 'sms' && (
              <button
                disabled={citizenPhone === 'N/A'}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Send SMS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
