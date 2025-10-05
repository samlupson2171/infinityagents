'use client';

import React, { useState } from 'react';
import FileManager from './FileManager';
import { UploadedFile } from './FileUpload';

export default function FileUploadTest() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(logMessage);
  };

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    addLog(`Files changed: ${newFiles.length} files`);
    addLog(`File IDs: ${newFiles.map(f => f.id).join(', ')}`);
    setFiles(newFiles);
  };

  const testCreateMaterial = async () => {
    if (files.length === 0) {
      addLog('No files to test with');
      return;
    }

    const testData = {
      title: 'Test Material',
      description: 'Test description',
      type: 'download',
      isActive: true,
      uploadedFiles: files.map(file => ({
        id: file.id,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt instanceof Date ? file.uploadedAt : new Date(file.uploadedAt),
      }))
    };

    addLog(`Testing material creation with: ${JSON.stringify(testData, null, 2)}`);

    try {
      const response = await fetch('/api/admin/training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      const result = await response.json();
      
      if (response.ok) {
        addLog(`✓ Material created successfully: ${result.material?.title}`);
      } else {
        addLog(`✗ Failed to create material: ${result.error || 'Unknown error'}`);
        addLog(`Response status: ${response.status}`);
      }
    } catch (error) {
      addLog(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">File Upload Test Component</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File Manager */}
        <div>
          <h3 className="text-lg font-semibold mb-3">File Upload</h3>
          <FileManager
            onFilesChange={handleFilesChange}
            initialFiles={files}
            maxFiles={5}
            allowUpload={true}
            showSearch={false}
            viewMode="list"
          />
          
          <div className="mt-4 space-x-2">
            <button
              onClick={testCreateMaterial}
              disabled={files.length === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Test Create Material
            </button>
            <button
              onClick={clearLogs}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Debug Logs */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Debug Logs</h3>
          <div className="bg-gray-100 p-3 rounded h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
          
          {/* Current Files Display */}
          <div className="mt-4">
            <h4 className="font-medium mb-2">Current Files ({files.length})</h4>
            <div className="bg-gray-50 p-2 rounded text-sm max-h-32 overflow-y-auto">
              {files.length === 0 ? (
                <p className="text-gray-500">No files</p>
              ) : (
                files.map(file => (
                  <div key={file.id} className="mb-1">
                    <strong>{file.originalName}</strong> (ID: {file.id})
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}