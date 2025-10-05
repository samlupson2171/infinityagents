'use client';

import FileUploadTest from '@/components/admin/FileUploadTest';

export default function TestUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">File Upload Debug Page</h1>
        <FileUploadTest />
      </div>
    </div>
  );
}