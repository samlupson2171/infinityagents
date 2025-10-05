'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import type { UploadedFile } from './FileUpload';

interface ContentPreviewProps {
  type: 'video' | 'blog' | 'download';
  title: string;
  description: string;
  contentUrl?: string;
  richContent?: string;
  uploadedFiles?: UploadedFile[];
  fileUrl?: string;
  className?: string;
}

export default function ContentPreview({
  type,
  title,
  description,
  contentUrl,
  richContent,
  uploadedFiles = [],
  fileUrl,
  className = '',
}: ContentPreviewProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);

  // Validate content based on type
  const validateContent = () => {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isValid = true;

    // Basic validation
    if (!title.trim()) {
      errors.push('Title is required');
      isValid = false;
    } else if (title.length < 5) {
      warnings.push('Title is quite short (less than 5 characters)');
    } else if (title.length > 200) {
      errors.push('Title is too long (maximum 200 characters)');
      isValid = false;
    }

    if (!description.trim()) {
      errors.push('Description is required');
      isValid = false;
    } else if (description.length < 10) {
      warnings.push('Description is quite short (less than 10 characters)');
    } else if (description.length > 1000) {
      errors.push('Description is too long (maximum 1000 characters)');
      isValid = false;
    }

    // Type-specific validation
    switch (type) {
      case 'video':
        if (!contentUrl?.trim()) {
          errors.push('Video URL is required');
          isValid = false;
        } else {
          // Validate video URL format
          const videoUrlPattern = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i;
          if (!videoUrlPattern.test(contentUrl)) {
            warnings.push('URL does not appear to be from a supported video platform');
          }
        }
        break;

      case 'blog':
        const hasRichContent = richContent?.trim();
        const hasContentUrl = contentUrl?.trim();
        
        if (!hasRichContent && !hasContentUrl) {
          errors.push('Blog content or external URL is required');
          isValid = false;
        }
        
        if (hasRichContent) {
          // Remove HTML tags to get text length
          const textContent = richContent!.replace(/<[^>]*>/g, '').trim();
          if (textContent.length < 10) {
            warnings.push('Blog content is quite short');
          } else if (textContent.length > 50000) {
            errors.push('Blog content is too long (maximum 50,000 characters)');
            isValid = false;
          }
          
          // Check for potentially unsafe content
          const unsafePatterns = [/<script/i, /javascript:/i, /vbscript:/i];
          if (unsafePatterns.some(pattern => pattern.test(richContent!))) {
            errors.push('Content contains potentially unsafe elements');
            isValid = false;
          }
        }
        break;

      case 'download':
        const hasFiles = uploadedFiles.length > 0;
        const hasFileUrl = fileUrl?.trim();
        
        if (!hasFiles && !hasFileUrl) {
          errors.push('At least one file or external URL is required');
          isValid = false;
        }
        
        if (hasFiles) {
          const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);
          const maxTotalSize = 50 * 1024 * 1024; // 50MB total
          
          if (totalSize > maxTotalSize) {
            warnings.push(`Total file size (${formatFileSize(totalSize)}) is quite large`);
          }
          
          // Check for duplicate file names
          const fileNames = uploadedFiles.map(f => f.originalName.toLowerCase());
          const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
          if (duplicates.length > 0) {
            warnings.push('Some files have duplicate names');
          }
        }
        break;
    }

    setValidationResults({ isValid, warnings, errors });
    return { isValid, warnings, errors };
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get video embed URL
  const getVideoEmbedUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // YouTube
      if (urlObj.hostname.includes('youtube.com')) {
        const videoId = urlObj.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // YouTube short URL
      if (urlObj.hostname.includes('youtu.be')) {
        const videoId = urlObj.pathname.slice(1);
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
      
      // Vimeo
      if (urlObj.hostname.includes('vimeo.com')) {
        const videoId = urlObj.pathname.split('/').pop();
        return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const renderPreviewContent = () => {
    switch (type) {
      case 'video':
        if (!contentUrl) return <p className="text-gray-500">No video URL provided</p>;
        
        const embedUrl = getVideoEmbedUrl(contentUrl);
        if (embedUrl) {
          return (
            <div className="aspect-video">
              <iframe
                src={embedUrl}
                className="w-full h-full rounded-lg"
                allowFullScreen
                title={title}
              />
            </div>
          );
        } else {
          return (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600">Video preview not available</p>
              <a
                href={contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Open video link
              </a>
            </div>
          );
        }

      case 'blog':
        if (richContent?.trim()) {
          return (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: richContent }}
            />
          );
        } else if (contentUrl?.trim()) {
          return (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600">External blog content</p>
              <a
                href={contentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Open blog link
              </a>
            </div>
          );
        } else {
          return <p className="text-gray-500">No blog content provided</p>;
        }

      case 'download':
        if (uploadedFiles.length > 0) {
          return (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Uploaded Files:</h4>
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{file.originalName}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)} • {file.mimeType}
                    </p>
                  </div>
                  <span className="text-2xl">
                    {file.mimeType.startsWith('image/') ? '🖼️' : 
                     file.mimeType.includes('pdf') ? '📄' : '📎'}
                  </span>
                </div>
              ))}
            </div>
          );
        } else if (fileUrl?.trim()) {
          return (
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-gray-600">External download file</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 underline"
              >
                Open file link
              </a>
            </div>
          );
        } else {
          return <p className="text-gray-500">No files provided</p>;
        }

      default:
        return <p className="text-gray-500">Unknown content type</p>;
    }
  };

  return (
    <div className={`content-preview ${className}`}>
      {/* Preview Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {isPreviewOpen ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hide Preview</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span>Show Preview</span>
            </>
          )}
        </button>

        <button
          onClick={validateContent}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
        >
          <CheckCircle className="h-4 w-4" />
          <span>Validate Content</span>
        </button>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <div className="mb-4">
          {validationResults.errors.length > 0 && (
            <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <h4 className="text-sm font-medium text-red-800">Errors</h4>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationResults.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResults.warnings.length > 0 && (
            <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
                <h4 className="text-sm font-medium text-yellow-800">Warnings</h4>
              </div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validationResults.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {validationResults.isValid && validationResults.errors.length === 0 && validationResults.warnings.length === 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-800">Content is valid</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Content */}
      {isPreviewOpen && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || 'Untitled'}</h3>
            <p className="text-gray-600">{description || 'No description'}</p>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            {renderPreviewContent()}
          </div>
        </div>
      )}
    </div>
  );
}