'use client';

import { useState, useEffect } from 'react';

interface QuoteEmailPreviewProps {
  quoteId: string;
  onClose: () => void;
  className?: string;
}

export default function QuoteEmailPreview({
  quoteId,
  onClose,
  className = '',
}: QuoteEmailPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const previewUrl = `/api/admin/quotes/${quoteId}/email-preview`;

  const handleSendTestEmail = async () => {
    if (!testEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/admin/quotes/${quoteId}/send-test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult(`Test email sent successfully to ${testEmail}`);
        setTestEmail('');
      } else {
        setTestResult(`Failed to send test email: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      setTestResult(`Error sending test email: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 ${className}`}>
      <div className="relative top-4 mx-auto p-5 border w-11/12 max-w-7xl shadow-lg rounded-md bg-white min-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">Email Preview</h3>
            
            {/* Preview Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`px-3 py-1 text-sm rounded-md ${
                  previewMode === 'desktop'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🖥️ Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`px-3 py-1 text-sm rounded-md ${
                  previewMode === 'mobile'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📱 Mobile
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Test Email Section */}
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSendTestEmail}
                disabled={sendingTest || !testEmail.trim()}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-md ${
            testResult.includes('successfully') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {testResult}
          </div>
        )}

        {/* Preview Container */}
        <div className="flex justify-center">
          <div className={`bg-gray-100 p-4 rounded-lg ${
            previewMode === 'desktop' ? 'w-full' : 'w-96'
          }`}>
            <div className={`bg-white rounded-md shadow-sm overflow-hidden ${
              previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
            }`}>
              {/* Preview Frame */}
              <div className="relative">
                <iframe
                  src={previewUrl}
                  className={`w-full border-0 ${
                    previewMode === 'desktop' ? 'h-[70vh]' : 'h-[60vh]'
                  }`}
                  title="Email Preview"
                  onLoad={() => setLoading(false)}
                  onError={() => {
                    setLoading(false);
                    setError('Failed to load email preview');
                  }}
                />
                
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Loading preview...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="text-center">
                      <div className="text-red-600 mb-2">
                        <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-600">{error}</p>
                      <button
                        onClick={() => {
                          setError(null);
                          setLoading(true);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Preview shows how the email will appear to recipients
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => window.open(previewUrl, '_blank')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}