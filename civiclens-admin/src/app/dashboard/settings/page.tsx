'use client';

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Users, 
  Upload, 
  Bell, 
  Database, 
  FileText, 
  Zap,
  Server,
  AlertTriangle,
  Save,
  RefreshCw
} from 'lucide-react';
import {
  SystemSettings,
  SecuritySettings,
  UserSettings,
  UploadSettings,
  NotificationSettings,
  DatabaseSettings,
  AuditSettings,
  IntegrationSettings
} from '@/components/settings/SettingsSections';

type SettingsTab = 'system' | 'security' | 'users' | 'uploads' | 'notifications' | 'database' | 'audit' | 'integrations';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    appName: 'CivicLens API',
    appVersion: '1.0.0',
    environment: 'production',
    cityCode: 'RNC',
    debug: false,
    accessTokenExpireMinutes: 1440,
    maxLoginAttempts: 5,
    accountLockoutDuration: 30,
    passwordMinLength: 12,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireDigit: true,
    passwordRequireSpecial: true,
    twoFaEnabled: true,
    sessionFingerprintEnabled: true,
    rateLimitEnabled: true,
    rateLimitOtp: '3/hour',
    rateLimitLogin: '5/15minutes',
    maxConcurrentSessions: 3,
    sessionInactivityTimeout: 60,
    maxUploadSize: 10485760,
    maxImagesPerReport: 5,
    maxAudioPerReport: 1,
    pushNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    emailNotificationsEnabled: true,
    databasePoolSize: 20,
    databaseMaxOverflow: 10,
    auditLogEnabled: true,
    auditLogRetentionDays: 365,
  });

  const tabs = [
    { id: 'system' as SettingsTab, label: 'System', icon: Server },
    { id: 'security' as SettingsTab, label: 'Security', icon: Shield },
    { id: 'users' as SettingsTab, label: 'Users', icon: Users },
    { id: 'uploads' as SettingsTab, label: 'Uploads', icon: Upload },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'database' as SettingsTab, label: 'Database', icon: Database },
    { id: 'audit' as SettingsTab, label: 'Audit', icon: FileText },
    { id: 'integrations' as SettingsTab, label: 'Integrations', icon: Zap },
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setHasChanges(false);
    
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = 'Settings saved successfully';
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-600 rounded-lg shadow-sm">
            <SettingsIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
            <p className="text-sm text-gray-600">Configure system-wide settings and preferences</p>
          </div>
        </div>
        
        {hasChanges && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-orange-600 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Unsaved changes
            </span>
            <button
              onClick={() => setHasChanges(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 inline mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'system' && <SystemSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'security' && <SecuritySettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'users' && <UserSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'uploads' && <UploadSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'notifications' && <NotificationSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'database' && <DatabaseSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'audit' && <AuditSettings settings={settings} setSettings={setSettings} setHasChanges={setHasChanges} />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
}
