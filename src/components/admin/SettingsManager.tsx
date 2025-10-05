'use client';

import { useState, useEffect } from 'react';
import ContractTemplateManager from './ContractTemplateManager';

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  enableTLS: boolean;
}

export default function SettingsManager() {
  const [activeSection, setActiveSection] = useState('email');
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableTLS: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);

  const sections = [
    { id: 'email', name: 'Email Settings', icon: '📧' },
    { id: 'contracts', name: 'Contract Templates', icon: '📄' },
    { id: 'system', name: 'System Settings', icon: '⚙️' },
  ];

  useEffect(() => {
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/email');
      if (response.ok) {
        const data = await response.json();
        setEmailSettings(data.data || emailSettings);
      }
    } catch (err) {
      console.error('Failed to fetch email settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailSettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save email settings');
      }

      setSuccess('Email settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testEmailSettings = async () => {
    try {
      setTestEmailLoading(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailSettings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to test email settings');
      }

      setSuccess('Test email sent successfully! Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="flex">
        {/* Settings Navigation */}
        <div className="w-64 bg-gray-50 rounded-l-lg border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Settings</h3>
          </div>
          <nav className="p-4 space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center px-3 py-2 rounded-md font-medium transition-colors text-left ${
                  activeSection === section.id
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3">{section.icon}</span>
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6">
          {/* Email Settings */}
          {activeSection === 'email' && (
            <div>
              <div className="mb-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Email Configuration</h4>
                <p className="text-gray-600">Configure SMTP settings for sending emails from the platform.</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">{success}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={emailSettings.smtpHost}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpHost: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={emailSettings.smtpPort}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) || 587 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="587"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                  <input
                    type="text"
                    value={emailSettings.smtpUser}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpUser: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="your-email@gmail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                  <input
                    type="password"
                    value={emailSettings.smtpPassword}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtpPassword: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                  <input
                    type="email"
                    value={emailSettings.fromEmail}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="noreply@yourcompany.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                  <input
                    type="text"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings({ ...emailSettings, fromName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Infinity Weekends"
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={emailSettings.enableTLS}
                    onChange={(e) => setEmailSettings({ ...emailSettings, enableTLS: e.target.checked })}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Enable TLS/SSL</label>
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <button
                  onClick={saveEmailSettings}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={testEmailSettings}
                  disabled={testEmailLoading || !emailSettings.smtpHost}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  {testEmailLoading ? 'Testing...' : 'Test Email'}
                </button>
              </div>
            </div>
          )}

          {/* Contract Templates */}
          {activeSection === 'contracts' && (
            <div>
              <div className="mb-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Contract Templates</h4>
                <p className="text-gray-600">Manage contract templates for agency agreements.</p>
              </div>
              <ContractTemplateManager />
            </div>
          )}

          {/* System Settings */}
          {activeSection === 'system' && (
            <div>
              <div className="mb-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-2">System Configuration</h4>
                <p className="text-gray-600">General system settings and configuration options.</p>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Platform Information</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Platform Name</label>
                      <p className="mt-1 text-sm text-gray-900">Infinity Weekends</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Version</label>
                      <p className="mt-1 text-sm text-gray-900">1.0.0</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Environment</label>
                      <p className="mt-1 text-sm text-gray-900">{process.env.NODE_ENV || 'development'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Database Status</label>
                      <p className="mt-1 text-sm text-green-600">Connected</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h5 className="text-lg font-medium text-gray-900 mb-4">Maintenance</h5>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="text-sm font-medium text-gray-900">Clear Cache</h6>
                        <p className="text-sm text-gray-600">Clear application cache and temporary files</p>
                      </div>
                      <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                        Clear Cache
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h6 className="text-sm font-medium text-gray-900">Database Backup</h6>
                        <p className="text-sm text-gray-600">Create a backup of the database</p>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
                        Create Backup
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}