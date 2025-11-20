import React from 'react';
import {
  Users,
  Clock,
  Upload,
  CheckCircle2,
  Bell,
  Database,
  FileText,
  Zap,
  AlertTriangle,
} from 'lucide-react';

interface SettingsProps {
  settings: any;
  setSettings: (settings: any) => void;
  setHasChanges: (hasChanges: boolean) => void;
}

// User Settings Component
export function UserSettings({ settings, setSettings, setHasChanges }: SettingsProps) {
  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Session Management</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Sessions</label>
            <input
              type="number"
              value={settings.maxConcurrentSessions}
              onChange={(e) => handleChange('maxConcurrentSessions', parseInt(e.target.value))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum active sessions per user</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inactivity Timeout (minutes)</label>
            <input
              type="number"
              value={settings.sessionInactivityTimeout}
              onChange={(e) => handleChange('sessionInactivityTimeout', parseInt(e.target.value))}
              min="15"
              max="240"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Clock className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Rate Limits</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OTP Requests</label>
            <input
              type="text"
              value={settings.rateLimitOtp}
              onChange={(e) => handleChange('rateLimitOtp', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="3/hour"
            />
            <p className="text-xs text-gray-500 mt-1">Format: count/period</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Login Attempts</label>
            <input
              type="text"
              value={settings.rateLimitLogin}
              onChange={(e) => handleChange('rateLimitLogin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="5/15minutes"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload Settings Component
export function UploadSettings({ settings, setSettings, setHasChanges }: SettingsProps) {
  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Upload className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">File Upload Limits</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Upload Size (bytes)</label>
            <input
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => handleChange('maxUploadSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">Current: {(settings.maxUploadSize / 1048576).toFixed(2)} MB</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Images Per Report</label>
            <input
              type="number"
              value={settings.maxImagesPerReport}
              onChange={(e) => handleChange('maxImagesPerReport', parseInt(e.target.value))}
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Audio Per Report</label>
            <input
              type="number"
              value={settings.maxAudioPerReport}
              onChange={(e) => handleChange('maxAudioPerReport', parseInt(e.target.value))}
              min="0"
              max="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Allowed File Types</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image Formats</label>
            <div className="flex flex-wrap gap-2">
              {['JPEG', 'PNG', 'WebP'].map((format) => (
                <span key={format} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {format}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Audio Formats</label>
            <div className="flex flex-wrap gap-2">
              {['MP3', 'WAV', 'M4A'].map((format) => (
                <span key={format} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {format}
                </span>
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              File types are validated on both client and server side for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Settings Component
export function NotificationSettings({ settings, setSettings, setHasChanges }: SettingsProps) {
  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Bell className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Notification Channels</h3>
      </div>
      <div className="space-y-4">
        {[
          { key: 'pushNotificationsEnabled', label: 'Push Notifications', desc: 'Send push notifications to mobile apps' },
          { key: 'smsNotificationsEnabled', label: 'SMS Notifications', desc: 'Send SMS alerts for critical updates' },
          { key: 'emailNotificationsEnabled', label: 'Email Notifications', desc: 'Send email updates to users' },
        ].map((item) => (
          <div key={item.key} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <p className="font-medium text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={(e) => handleChange(item.key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// Database Settings Component
export function DatabaseSettings({ settings, setSettings, setHasChanges }: SettingsProps) {
  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Database className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Connection Pool</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pool Size</label>
          <input
            type="number"
            value={settings.databasePoolSize}
            onChange={(e) => handleChange('databasePoolSize', parseInt(e.target.value))}
            min="10"
            max="50"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">Number of connections in the pool</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Overflow</label>
          <input
            type="number"
            value={settings.databaseMaxOverflow}
            onChange={(e) => handleChange('databaseMaxOverflow', parseInt(e.target.value))}
            min="5"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">Additional connections when pool is full</p>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-900">Restart Required</p>
            <p className="text-sm text-yellow-700 mt-1">Database changes require application restart.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Audit Settings Component
export function AuditSettings({ settings, setSettings, setHasChanges }: SettingsProps) {
  const handleChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <FileText className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Audit Logging</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <p className="font-medium text-gray-900">Enable Audit Logs</p>
            <p className="text-sm text-gray-600 mt-1">Track all system actions and changes</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={settings.auditLogEnabled}
              onChange={(e) => handleChange('auditLogEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
          <input
            type="number"
            value={settings.auditLogRetentionDays}
            onChange={(e) => handleChange('auditLogRetentionDays', parseInt(e.target.value))}
            min="30"
            max="730"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">How long to keep audit logs (30-730 days)</p>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Compliance:</strong> Audit logs help meet regulatory requirements.
          </p>
        </div>
      </div>
    </div>
  );
}

// Integration Settings Component
export function IntegrationSettings() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Zap className="w-5 h-5 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">External Integrations</h3>
      </div>
      <div className="text-center py-12">
        <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">Integration Settings</p>
        <p className="text-sm text-gray-500">Configure MinIO, Redis, and other external services</p>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-blue-900">
            <strong>Coming Soon:</strong> External service configuration interface
          </p>
        </div>
      </div>
    </div>
  );
}
