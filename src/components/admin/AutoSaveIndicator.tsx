'use client';

import React from 'react';
import { Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  className?: string;
}

export default function AutoSaveIndicator({
  isSaving,
  lastSaved,
  error,
  className = '',
}: AutoSaveIndicatorProps) {
  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 10) {
      return 'just now';
    } else if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (error) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Auto-save failed</span>
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className={`flex items-center space-x-2 text-blue-600 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className={`flex items-center space-x-2 text-green-600 ${className}`}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Saved {formatLastSaved(lastSaved)}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-gray-500 ${className}`}>
      <Save className="h-4 w-4" />
      <span className="text-sm">Auto-save enabled</span>
    </div>
  );
}