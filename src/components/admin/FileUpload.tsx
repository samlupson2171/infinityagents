'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  onFileRemoved?: (fileId: string) => void;
  existingFiles?: UploadedFile[];
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  uploadedFile?: UploadedFile;
}

export default function FileUpload({
  onFilesUploaded,
  onFileRemoved,
  existingFiles = [],
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  disabled = false,
  className = '',
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate current file count
  const currentFileCount = existingFiles.length + uploadingFiles.filter(f => f.status === 'success').length;

  // Handle file selection
  const handleFileSelect = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      
      // Check file count limit
      if (currentFileCount + fileArray.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      // Check for duplicate file names
      const existingFileNames = new Set([
        ...existingFiles.map(f => f.originalName),
        ...uploadingFiles.filter(uf => uf.status === 'success').map(uf => uf.uploadedFile?.originalName).filter(Boolean)
      ]);

      // Validate and upload files
      const validFiles: File[] = [];
      
      for (const file of fileArray) {
        // Check for duplicate names
        if (existingFileNames.has(file.name)) {
          alert(`${file.name}: A file with this name already exists`);
          continue;
        }

        const validation = validateFile(file, maxFileSize, allowedTypes);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          alert(`${file.name}: ${validation.error}`);
        }
      }

      if (validFiles.length > 0) {
        uploadFiles(validFiles);
      }
    },
    [currentFileCount, maxFiles, maxFileSize, allowedTypes, existingFiles, uploadingFiles]
  );

  // Upload files
  const uploadFiles = async (files: File[]) => {
    const newUploadingFiles: UploadingFile[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    const successfulUploads: UploadedFile[] = [];

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Update progress
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, progress: 10 } : uf
          )
        );

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file
        const response = await fetch('/api/admin/training/files/upload', {
          method: 'POST',
          body: formData,
        });

        // Update progress
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file ? { ...uf, progress: 80 } : uf
          )
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Mark as successful
        const uploadedFile: UploadedFile = {
          id: result.file.id,
          originalName: result.file.originalName,
          fileName: result.file.fileName,
          filePath: result.file.filePath,
          mimeType: result.file.mimeType,
          size: result.file.size,
          uploadedAt: new Date(result.file.uploadedAt),
        };

        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file
              ? { ...uf, progress: 100, status: 'success', uploadedFile }
              : uf
          )
        );

        // Add to successful uploads array
        successfulUploads.push(uploadedFile);
      } catch (error) {
        console.error('Upload error:', error);
        
        // Mark as failed
        setUploadingFiles(prev =>
          prev.map(uf =>
            uf.file === file
              ? {
                  ...uf,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : uf
          )
        );
      }
    }

    // Notify parent component with all successful uploads at once
    if (successfulUploads.length > 0) {
      console.log('FileUpload: Notifying parent of successful uploads:', successfulUploads);
      onFilesUploaded(successfulUploads);
    }
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files);
      }
    },
    [disabled, handleFileSelect]
  );

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files);
      }
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    },
    [handleFileSelect]
  );

  // Remove file
  const handleRemoveFile = (fileId: string, isUploading: boolean = false) => {
    if (isUploading) {
      // Remove from uploading files
      setUploadingFiles(prev => prev.filter(uf => uf.uploadedFile?.id !== fileId));
    } else {
      // Notify parent to remove from existing files
      onFileRemoved?.(fileId);
    }
  };

  // Retry failed upload
  const handleRetryUpload = (file: File) => {
    // Remove failed upload and retry
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
    uploadFiles([file]);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType.includes('pdf')) {
      return '📄';
    } else if (mimeType.includes('word')) {
      return '📝';
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return '📊';
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return '📽️';
    }
    return '📎';
  };

  return (
    <div className={`file-upload ${className}`}>
      {/* Upload Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {isDragOver ? 'Drop files here' : 'Upload files'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Drag and drop files here, or click to select files
        </p>
        <p className="text-xs text-gray-400">
          Maximum {maxFiles} files, {formatFileSize(maxFileSize)} per file
        </p>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* File List */}
      {(existingFiles.length > 0 || uploadingFiles.length > 0) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Files ({currentFileCount}/{maxFiles})
          </h4>
          
          <div className="space-y-2">
            {/* Existing Files */}
            {existingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.originalName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {!disabled && (
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Uploading Files */}
            {uploadingFiles.map((uploadingFile, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(uploadingFile.file.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {uploadingFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(uploadingFile.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {uploadingFile.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${uploadingFile.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {uploadingFile.status === 'error' && uploadingFile.error && (
                      <p className="text-xs text-red-500 mt-1">
                        {uploadingFile.error}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {uploadingFile.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  {uploadingFile.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {uploadingFile.status === 'error' && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <button
                        onClick={() => handleRetryUpload(uploadingFile.file)}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        Retry
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={() => handleRemoveFile(uploadingFile.uploadedFile?.id || '', true)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Validate file before upload
 */
function validateFile(
  file: File,
  maxSize: number,
  allowedTypes: string[]
): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'File is empty',
    };
  }

  return { isValid: true };
}