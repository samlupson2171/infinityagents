'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, Play, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface UploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

interface TrainingMaterial {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'blog' | 'download';
  contentUrl?: string;
  fileUrl?: string;
  richContent?: string;
  richContentImages?: string[];
  uploadedFiles?: UploadedFile[];
  isActive: boolean;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
  };
}

interface ContentRendererProps {
  material: TrainingMaterial;
  showMetadata?: boolean;
  className?: string;
}

export default function ContentRenderer({
  material,
  showMetadata = true,
  className = '',
}: ContentRendererProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Set<string>>(new Set());

  // Handle image load errors
  const handleImageError = (src: string) => {
    setImageErrors(prev => new Set(prev).add(src));
  };

  // Handle download errors
  const handleDownloadError = (fileId: string) => {
    setDownloadErrors(prev => new Set(prev).add(fileId));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on MIME type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />;
    } else if (mimeType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    } else if (mimeType.includes('word')) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    } else if (mimeType.includes('excel') || mimeType.includes('sheet')) {
      return <FileText className="h-5 w-5 text-green-500" />;
    } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return <FileText className="h-5 w-5 text-orange-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
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

  // Handle file download
  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/training/files/${fileId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      handleDownloadError(fileId);
    }
  };

  // Render content based on material type
  const renderContent = () => {
    switch (material.type) {
      case 'video':
        return renderVideoContent();
      case 'blog':
        return renderBlogContent();
      case 'download':
        return renderDownloadContent();
      default:
        return (
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-600">Unknown content type</p>
          </div>
        );
    }
  };

  // Render video content
  const renderVideoContent = () => {
    if (!material.contentUrl) {
      return (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">No video URL available</p>
        </div>
      );
    }

    const embedUrl = getVideoEmbedUrl(material.contentUrl);
    
    if (embedUrl) {
      return (
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allowFullScreen
            title={material.title}
            loading="lazy"
          />
        </div>
      );
    } else {
      return (
        <div className="p-6 bg-gray-100 rounded-lg text-center">
          <Play className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">Video preview not available</p>
          <a
            href={material.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Video
          </a>
        </div>
      );
    }
  };

  // Render blog content
  const renderBlogContent = () => {
    if (material.richContent) {
      return (
        <div className="prose max-w-none">
          <div 
            dangerouslySetInnerHTML={{ __html: material.richContent }}
            className="content-renderer"
          />
        </div>
      );
    } else if (material.contentUrl) {
      return (
        <div className="p-6 bg-gray-100 rounded-lg text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">External blog content</p>
          <a
            href={material.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Read Article
          </a>
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">No blog content available</p>
        </div>
      );
    }
  };

  // Check if file is an image
  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  // Render download content
  const renderDownloadContent = () => {
    const hasUploadedFiles = material.uploadedFiles && material.uploadedFiles.length > 0;
    const hasFileUrl = material.fileUrl;

    if (hasUploadedFiles) {
      // Separate images from other files
      const imageFiles = material.uploadedFiles!.filter(file => isImageFile(file.mimeType));
      const otherFiles = material.uploadedFiles!.filter(file => !isImageFile(file.mimeType));

      return (
        <div className="space-y-6">
          {/* Display images inline */}
          {imageFiles.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Images:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {imageFiles.map((file) => (
                  <div key={file.id} className="space-y-2">
                    <div className="relative group">
                      {imageErrors.has(`/api/training/files/${file.id}/view`) ? (
                        <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">Image not available</p>
                          </div>
                        </div>
                      ) : (
                        <img
                          src={`/api/training/files/${file.id}/view`}
                          alt={file.originalName}
                          className="w-full h-auto max-h-96 object-contain rounded-lg border border-gray-200 shadow-sm"
                          onError={() => handleImageError(`/api/training/files/${file.id}/view`)}
                        />
                      )}
                      {/* Overlay with download button */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleFileDownload(file.id, file.originalName)}
                          className="inline-flex items-center px-3 py-2 bg-white bg-opacity-90 text-gray-900 text-sm rounded-md hover:bg-opacity-100 transition-all shadow-lg"
                          disabled={downloadErrors.has(file.id)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-gray-900 text-sm">{file.originalName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Display other files as download list */}
          {otherFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Downloads:</h4>
              {otherFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getFileIcon(file.mimeType)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{file.originalName}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {downloadErrors.has(file.id) && (
                      <div className="flex items-center text-red-500 text-sm">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        <span>Download failed</span>
                      </div>
                    )}
                    <button
                      onClick={() => handleFileDownload(file.id, file.originalName)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      disabled={downloadErrors.has(file.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else if (hasFileUrl) {
      return (
        <div className="p-6 bg-gray-100 rounded-lg text-center">
          <Download className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">External download file</p>
          <a
            href={material.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download File
          </a>
        </div>
      );
    } else {
      return (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-600">No download files available</p>
        </div>
      );
    }
  };

  return (
    <article className={`training-material ${className}`}>
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`
              inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${material.type === 'video' ? 'bg-red-100 text-red-800' : ''}
              ${material.type === 'blog' ? 'bg-blue-100 text-blue-800' : ''}
              ${material.type === 'download' ? 'bg-green-100 text-green-800' : ''}
            `}>
              {material.type === 'video' && '🎥'}
              {material.type === 'blog' && '📝'}
              {material.type === 'download' && '📁'}
              {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
            </span>
          </div>
          
          {showMetadata && (
            <div className="text-sm text-gray-500">
              {new Date(material.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {material.title}
        </h1>
        
        <p className="text-gray-600 leading-relaxed">
          {material.description}
        </p>
      </header>

      {/* Content */}
      <div className="mb-6">
        {renderContent()}
      </div>

      {/* Metadata */}
      {showMetadata && material.createdBy && (
        <footer className="pt-4 border-t border-gray-200">
          <div className="flex items-center text-sm text-gray-500">
            <span>Created by {material.createdBy.name}</span>
            <span className="mx-2">•</span>
            <span>{new Date(material.createdAt).toLocaleDateString()}</span>
          </div>
        </footer>
      )}

      {/* Styles for rich content */}
      <style jsx>{`
        .content-renderer {
          line-height: 1.6;
        }
        
        .content-renderer h1,
        .content-renderer h2,
        .content-renderer h3,
        .content-renderer h4,
        .content-renderer h5,
        .content-renderer h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        
        .content-renderer h1 { font-size: 1.875rem; }
        .content-renderer h2 { font-size: 1.5rem; }
        .content-renderer h3 { font-size: 1.25rem; }
        .content-renderer h4 { font-size: 1.125rem; }
        
        .content-renderer p {
          margin-bottom: 1em;
        }
        
        .content-renderer ul,
        .content-renderer ol {
          margin-bottom: 1em;
          padding-left: 1.5em;
        }
        
        .content-renderer li {
          margin-bottom: 0.25em;
        }
        
        .content-renderer blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .content-renderer img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1em 0;
        }
        
        .content-renderer a {
          color: #2563eb;
          text-decoration: underline;
        }
        
        .content-renderer a:hover {
          color: #1d4ed8;
        }
        
        .content-renderer table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        
        .content-renderer th,
        .content-renderer td {
          border: 1px solid #e5e7eb;
          padding: 0.5em;
          text-align: left;
        }
        
        .content-renderer th {
          background-color: #f9fafb;
          font-weight: 600;
        }
        
        .content-renderer pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .content-renderer code {
          background-color: #f3f4f6;
          padding: 0.125em 0.25em;
          border-radius: 0.25rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875em;
        }
      `}</style>
    </article>
  );
}