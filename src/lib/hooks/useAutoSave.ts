import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

interface AutoSaveOptions {
  delay?: number; // milliseconds
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
  enabled?: boolean;
}

interface AutoSaveStatus {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

export function useAutoSave<T>(
  data: T,
  options: AutoSaveOptions
): AutoSaveStatus {
  const {
    delay = 2000, // 2 seconds default
    onSave,
    onError,
    enabled = true,
  } = options;

  const statusRef = useRef<AutoSaveStatus>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const previousDataRef = useRef<T>(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (dataToSave: T) => {
      if (!enabled) return;

      try {
        statusRef.current = {
          ...statusRef.current,
          isSaving: true,
          error: null,
        };

        await onSave(dataToSave);

        statusRef.current = {
          ...statusRef.current,
          isSaving: false,
          lastSaved: new Date(),
          error: null,
        };
      } catch (error) {
        const saveError = error instanceof Error ? error : new Error('Auto-save failed');
        
        statusRef.current = {
          ...statusRef.current,
          isSaving: false,
          error: saveError,
        };

        onError?.(saveError);
      }
    }, delay),
    [delay, onSave, onError, enabled]
  );

  // Effect to trigger auto-save when data changes
  useEffect(() => {
    if (!enabled) return;

    // Skip if data hasn't actually changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // Update previous data reference
    previousDataRef.current = data;

    // Trigger debounced save
    debouncedSave(data);

    // Cleanup function
    return () => {
      debouncedSave.cancel();
    };
  }, [data, debouncedSave, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedSave]);

  return statusRef.current;
}

// Hook for unsaved changes warning
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}

// Hook for draft management
export function useDraftManager<T>(
  key: string,
  initialData: T
): {
  draftData: T;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
} {
  const draftKey = `draft_${key}`;

  // Load draft from localStorage
  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [draftKey]);

  // Save draft to localStorage
  const saveDraft = useCallback((data: T) => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [draftKey]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.warn('Failed to clear draft:', error);
    }
  }, [draftKey]);

  // Get current draft data
  const draftData = loadDraft() || initialData;
  const hasDraft = loadDraft() !== null;

  return {
    draftData,
    saveDraft,
    clearDraft,
    hasDraft,
  };
}