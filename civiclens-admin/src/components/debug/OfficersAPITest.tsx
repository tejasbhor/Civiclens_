"use client";

import React, { useState } from 'react';
import { usersApi } from '@/lib/api/users';
import { User } from '@/types';

export function OfficersAPITest() {
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<number>(1); // PWD

  const testAPI = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🧪 Testing officers API with department:', departmentId);
      
      // Test with department filter
      const result = await usersApi.getOfficers(departmentId);
      console.log('✅ API Result:', result);
      
      setOfficers(result);
      
    } catch (err: any) {
      console.error('❌ API Error:', err);
      setError(err.message || 'Failed to load officers');
    } finally {
      setLoading(false);
    }
  };

  const testAllOfficers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🧪 Testing officers API without filter');
      
      // Test without department filter
      const result = await usersApi.getOfficers();
      console.log('✅ All Officers Result:', result);
      
      setOfficers(result);
      
    } catch (err: any) {
      console.error('❌ API Error:', err);
      setError(err.message || 'Failed to load officers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Officers API Test</h3>
      
      <div className="flex gap-3 mb-4">
        <input
          type="number"
          value={departmentId}
          onChange={(e) => setDepartmentId(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded"
          placeholder="Department ID"
        />
        <button
          onClick={testAPI}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test with Department'}
        </button>
        <button
          onClick={testAllOfficers}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Test All Officers'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <p className="font-medium">Results: {officers.length} officers</p>
        {officers.map(officer => (
          <div key={officer.id} className="p-2 bg-white border rounded text-sm">
            <p><strong>{officer.full_name || officer.email}</strong></p>
            <p>Department ID: {officer.department_id}</p>
            <p>Role: {officer.role}</p>
            <p>Employee ID: {officer.employee_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}