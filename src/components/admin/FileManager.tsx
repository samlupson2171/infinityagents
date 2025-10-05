'use client';

import React, { useState, useEffect } from 'react';
import FileUpload, { type UploadedFile } from './FileUpload';
import FilePreview from './FilePreview';
import { Folder, Search, Filter, Grid, List } from 'lucide-react';

interface FileManagerProps {
  materialId?: string;
  onFilesChange?: (files: UploadedFile[]) => void;
  initialFiles?: UploadedFile[];
  maxFiles?: number;
  allowUpload?: boolean;
  showSearch?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export default function FileManager({
  materialId,
  onFilesChange,
  initialFiles = [],
  maxFiles = 10,
  allowUpload = true,
  showSearch = true,
  viewMode: initialViewMode = 'list',
  className = '',
}: FileManagerProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [isLoading, setIsLoading] = useState(false);

  // Load files when materialId changes
  useEffect(() => {
    if (materialId) {
      loadFiles();
    }
  }, [materialId]);

  // Notify parent when files change
  useEffect(() => {
    console.log('FileManager: Notifying parent of files change:', files);
    onFilesChange?.(files);
  }, [files]); // Remove onFilesChange from deps to prevent multiple calls

  // Load files from API
  const loadFiles = async () => {
    if (!materialId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/training/files/upload?materialId=${materialId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new file uploads
  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    console.log('FileManager: Received new files:', newFiles);
    console.log('FileManager: Current files before update:', files);
    
    setFiles(prev => {
      // Deduplicate files by ID to prevent duplicates
      const existingIds = new Set(prev.map(f => f.id));
      const uniqueNewFiles = newFiles.filter(f => !existingIds.has(f.id));
      
      console.log('FileManager: Existing IDs:', Array.from(existingIds));
      console.log('FileManager: Unique new files:', uniqueNewFiles);
      
      if (uniqueNewFiles.length === 0) {
        console.log('FileManager: No new unique files to add');
        return prev;
      }
      
      const updated = [...prev, ...uniqueNewFiles];
      console.log('FileManager: Updated files list:', updated);
      return updated;
    });
  };

  // Handle file removal
  const handleFileRemoved = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/training/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFiles(prev => prev.filter(file => file.id !== fileId));
      } else {
        console.error('Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // Filter files based on search and type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'all') return matchesSearch;
    
    const fileType = getFileCategory(file.mimeType);
    return matchesSearch && fileType === filterType;
  });

  // Get file category for filtering
  const getFileCategory = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.includes('pdf')) return 'documents';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'documents';
    return 'other';
  };

  // Get unique file types for filter options
  const getFileTypes = () => {
    const types = new Set(files.map(file => getFileCategory(file.mimeType)));
    return Array.from(types);
  };

  return (
    <div className={`file-manager ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Folder className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">
            File Manager ({files.length}/{maxFiles})
          </h3>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      {showSearch && files.length > 0 && (
        <div className="flex items-center space-x-4 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Files</option>
              {getFileTypes().map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {allowUpload && files.length < maxFiles && (
        <div className="mb-6">
          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            onFileRemoved={handleFileRemoved}
            existingFiles={files}
            maxFiles={maxFiles}
          />
        </div>
      )}

      {/* Files Display */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading files...</p>
        </div>
      ) : filteredFiles.length > 0 ? (
        <div className={`
          ${viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' 
            : 'space-y-3'
          }
        `}>
          {filteredFiles.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onRemove={allowUpload ? handleFileRemoved : undefined}
              compact={viewMode === 'list'}
              className={viewMode === 'grid' ? 'h-full' : ''}
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {allowUpload ? 'No files uploaded yet' : 'No files available'}
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <Search className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No files match your search criteria
          </p>
        </div>
      )}
    </div>
  );
}