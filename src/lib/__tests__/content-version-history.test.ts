import { vi } from 'vitest';
import {
  ContentVersionManager,
  AutoSaveManager,
  contentVersionManager,
  autoSaveManager,
  ContentVersion,
  ContentDiff
} from '../content-version-history';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('ContentVersionManager', () => {
  let manager: ContentVersionManager;
  const mockAuthor = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com'
  };

  beforeEach(() => {
    manager = new ContentVersionManager();
  });

  describe('saveVersion', () => {
    it('should save a new version', () => {
      const version = manager.saveVersion(
        'dest-1',
        'overview',
        '<p>Test content</p>',
        mockAuthor,
        'Initial content'
      );

      expect(version).toMatchObject({
        content: '<p>Test content</p>',
        author: mockAuthor,
        changes: 'Initial content',
        sectionKey: 'overview',
        destinationId: 'dest-1',
        changeType: 'update'
      });
      expect(version.id).toBeDefined();
      expect(version.timestamp).toBeInstanceOf(Date);
      expect(version.metadata?.wordCount).toBe(2);
      expect(version.metadata?.characterCount).toBe(19);
    });

    it('should generate unique version IDs', () => {
      const version1 = manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      const version2 = manager.saveVersion('dest-1', 'overview', 'Content 2', mockAuthor, 'Change 2');

      expect(version1.id).not.toBe(version2.id);
    });

    it('should include metadata in versions', () => {
      const customMetadata = {
        aiGenerated: true,
        templateUsed: 'beach-template'
      };

      const version = manager.saveVersion(
        'dest-1',
        'overview',
        '<p>AI generated content</p>',
        mockAuthor,
        'AI generation',
        'create',
        customMetadata
      );

      expect(version.metadata).toMatchObject({
        wordCount: 3,
        characterCount: 27,
        aiGenerated: true,
        templateUsed: 'beach-template'
      });
    });

    it('should maintain version order (newest first)', () => {
      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-1', 'overview', 'Content 2', mockAuthor, 'Change 2');
      manager.saveVersion('dest-1', 'overview', 'Content 3', mockAuthor, 'Change 3');

      const versions = manager.getVersionHistory('dest-1', 'overview');
      expect(versions).toHaveLength(3);
      expect(versions[0].changes).toBe('Change 3');
      expect(versions[1].changes).toBe('Change 2');
      expect(versions[2].changes).toBe('Change 1');
    });
  });

  describe('getVersionHistory', () => {
    it('should return empty array for non-existent section', () => {
      const versions = manager.getVersionHistory('dest-1', 'overview');
      expect(versions).toEqual([]);
    });

    it('should return all versions for a section', () => {
      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-1', 'overview', 'Content 2', mockAuthor, 'Change 2');

      const versions = manager.getVersionHistory('dest-1', 'overview');
      expect(versions).toHaveLength(2);
    });

    it('should separate versions by destination and section', () => {
      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-1', 'accommodation', 'Content 2', mockAuthor, 'Change 2');
      manager.saveVersion('dest-2', 'overview', 'Content 3', mockAuthor, 'Change 3');

      expect(manager.getVersionHistory('dest-1', 'overview')).toHaveLength(1);
      expect(manager.getVersionHistory('dest-1', 'accommodation')).toHaveLength(1);
      expect(manager.getVersionHistory('dest-2', 'overview')).toHaveLength(1);
    });
  });

  describe('getVersion', () => {
    it('should return specific version by ID', () => {
      const version = manager.saveVersion('dest-1', 'overview', 'Test content', mockAuthor, 'Test change');
      
      const retrieved = manager.getVersion('dest-1', 'overview', version.id);
      expect(retrieved).toEqual(version);
    });

    it('should return undefined for non-existent version', () => {
      const retrieved = manager.getVersion('dest-1', 'overview', 'non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('restoreVersion', () => {
    it('should restore content to a previous version', () => {
      const version1 = manager.saveVersion('dest-1', 'overview', 'Original content', mockAuthor, 'Initial');
      manager.saveVersion('dest-1', 'overview', 'Modified content', mockAuthor, 'Update');

      const restored = manager.restoreVersion('dest-1', 'overview', version1.id, mockAuthor);

      expect(restored).toBeDefined();
      expect(restored!.content).toBe('Original content');
      expect(restored!.changeType).toBe('restore');
      expect(restored!.changes).toContain('Restored to version from');
    });

    it('should return null for non-existent version', () => {
      const restored = manager.restoreVersion('dest-1', 'overview', 'non-existent-id', mockAuthor);
      expect(restored).toBeNull();
    });

    it('should create new version when restoring', () => {
      const version1 = manager.saveVersion('dest-1', 'overview', 'Original', mockAuthor, 'Initial');
      manager.saveVersion('dest-1', 'overview', 'Modified', mockAuthor, 'Update');

      const beforeRestore = manager.getVersionHistory('dest-1', 'overview');
      expect(beforeRestore).toHaveLength(2);

      manager.restoreVersion('dest-1', 'overview', version1.id, mockAuthor);

      const afterRestore = manager.getVersionHistory('dest-1', 'overview');
      expect(afterRestore).toHaveLength(3);
    });
  });

  describe('compareVersions', () => {
    it('should generate diff between versions', () => {
      const version1: ContentVersion = {
        id: '1',
        content: '<p>Hello world</p>',
        timestamp: new Date(),
        author: mockAuthor,
        changes: 'Initial',
        sectionKey: 'overview',
        destinationId: 'dest-1',
        changeType: 'create'
      };

      const version2: ContentVersion = {
        id: '2',
        content: '<p>Hello beautiful world</p>',
        timestamp: new Date(),
        author: mockAuthor,
        changes: 'Added adjective',
        sectionKey: 'overview',
        destinationId: 'dest-1',
        changeType: 'update'
      };

      const diff = manager.compareVersions(version1, version2);
      expect(diff).toBeDefined();
      expect(Array.isArray(diff)).toBe(true);
    });
  });

  describe('getContentStats', () => {
    it('should calculate content statistics', () => {
      const content = '<p>Hello world</p><p>Another paragraph</p><img src="test.jpg"><a href="link">Link</a>';
      const stats = manager.getContentStats(content);

      expect(stats).toMatchObject({
        wordCount: 3, // "Hello world Another paragraph" (after HTML stripping)
        characterCount: content.length,
        paragraphCount: 2,
        imageCount: 1,
        linkCount: 1
      });
    });

    it('should handle empty content', () => {
      const stats = manager.getContentStats('');
      expect(stats.wordCount).toBe(0);
      expect(stats.characterCount).toBe(0);
      expect(stats.paragraphCount).toBe(0);
    });
  });

  describe('searchVersions', () => {
    beforeEach(() => {
      manager.saveVersion('dest-1', 'overview', 'Beach content', mockAuthor, 'Added beach info');
      manager.saveVersion('dest-1', 'overview', 'Mountain content', mockAuthor, 'Added mountain info');
      manager.saveVersion('dest-1', 'overview', 'City content', mockAuthor, 'Added city info');
    });

    it('should find versions by content', () => {
      const results = manager.searchVersions('dest-1', 'overview', 'beach');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Beach');
    });

    it('should find versions by changes description', () => {
      const results = manager.searchVersions('dest-1', 'overview', 'mountain info');
      expect(results).toHaveLength(1);
      expect(results[0].changes).toContain('mountain info');
    });

    it('should find versions by author name', () => {
      const results = manager.searchVersions('dest-1', 'overview', 'John');
      expect(results).toHaveLength(3); // All versions by John Doe
    });

    it('should be case insensitive', () => {
      const results = manager.searchVersions('dest-1', 'overview', 'BEACH');
      expect(results).toHaveLength(1);
    });
  });

  describe('getVersionsByDateRange', () => {
    it('should filter versions by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-1', 'overview', 'Content 2', mockAuthor, 'Change 2');

      const results = manager.getVersionsByDateRange('dest-1', 'overview', yesterday, tomorrow);
      expect(results).toHaveLength(2);
    });
  });

  describe('getVersionsByAuthor', () => {
    it('should filter versions by author', () => {
      const author2 = { id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' };

      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-1', 'overview', 'Content 2', author2, 'Change 2');
      manager.saveVersion('dest-1', 'overview', 'Content 3', mockAuthor, 'Change 3');

      const johnVersions = manager.getVersionsByAuthor('dest-1', 'overview', 'user-1');
      const janeVersions = manager.getVersionsByAuthor('dest-1', 'overview', 'user-2');

      expect(johnVersions).toHaveLength(2);
      expect(janeVersions).toHaveLength(1);
    });
  });

  describe('cleanupOldVersions', () => {
    it('should remove versions older than retention period', () => {
      // Create versions with different timestamps
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const recentDate = new Date();

      // Mock the timestamp for old version
      const oldVersion = manager.saveVersion('dest-1', 'overview', 'Old content', mockAuthor, 'Old change');
      oldVersion.timestamp = oldDate;

      manager.saveVersion('dest-1', 'overview', 'Recent content', mockAuthor, 'Recent change');

      const deletedCount = manager.cleanupOldVersions(90); // 90 days retention
      expect(deletedCount).toBeGreaterThan(0);

      const remainingVersions = manager.getVersionHistory('dest-1', 'overview');
      expect(remainingVersions).toHaveLength(1);
      expect(remainingVersions[0].content).toBe('Recent content');
    });
  });

  describe('exportVersionHistory', () => {
    it('should export all version history', () => {
      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-2', 'overview', 'Content 2', mockAuthor, 'Change 2');

      const exported = manager.exportVersionHistory();
      expect(Object.keys(exported)).toHaveLength(2);
      expect(exported['dest-1-overview']).toHaveLength(1);
      expect(exported['dest-2-overview']).toHaveLength(1);
    });

    it('should export version history for specific destination', () => {
      manager.saveVersion('dest-1', 'overview', 'Content 1', mockAuthor, 'Change 1');
      manager.saveVersion('dest-2', 'overview', 'Content 2', mockAuthor, 'Change 2');

      const exported = manager.exportVersionHistory('dest-1');
      expect(Object.keys(exported)).toHaveLength(1);
      expect(exported['dest-1-overview']).toHaveLength(1);
    });
  });

  describe('importVersionHistory', () => {
    it('should import version history from backup', () => {
      const backupData = {
        'dest-1-overview': [{
          id: 'v1',
          content: 'Imported content',
          timestamp: new Date(),
          author: mockAuthor,
          changes: 'Imported change',
          sectionKey: 'overview',
          destinationId: 'dest-1',
          changeType: 'create' as const
        }]
      };

      manager.importVersionHistory(backupData);

      const versions = manager.getVersionHistory('dest-1', 'overview');
      expect(versions).toHaveLength(1);
      expect(versions[0].content).toBe('Imported content');
    });
  });
});

describe('AutoSaveManager', () => {
  let manager: AutoSaveManager;
  let mockSaveFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    manager = new AutoSaveManager();
    mockSaveFunction = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('scheduleAutoSave', () => {
    it('should schedule auto-save with default delay', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction);

      expect(mockSaveFunction).not.toHaveBeenCalled();
      expect(manager.isPending('test-key')).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
      expect(manager.isPending('test-key')).toBe(false);
    });

    it('should schedule auto-save with custom delay', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction, 5000);

      vi.advanceTimersByTime(2000);
      expect(mockSaveFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(3000);
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous timeout when scheduling new one', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction, 1000);
      manager.scheduleAutoSave('test-key', mockSaveFunction, 2000);

      vi.advanceTimersByTime(1000);
      expect(mockSaveFunction).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockSaveFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelAutoSave', () => {
    it('should cancel pending auto-save', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction);
      expect(manager.isPending('test-key')).toBe(true);

      manager.cancelAutoSave('test-key');
      expect(manager.isPending('test-key')).toBe(false);

      vi.advanceTimersByTime(2000);
      expect(mockSaveFunction).not.toHaveBeenCalled();
    });

    it('should handle canceling non-existent auto-save', () => {
      expect(() => manager.cancelAutoSave('non-existent')).not.toThrow();
    });
  });

  describe('cancelAllAutoSaves', () => {
    it('should cancel all pending auto-saves', () => {
      const mockSave1 = vi.fn();
      const mockSave2 = vi.fn();

      manager.scheduleAutoSave('key1', mockSave1);
      manager.scheduleAutoSave('key2', mockSave2);

      expect(manager.getPendingKeys()).toHaveLength(2);

      manager.cancelAllAutoSaves();

      expect(manager.getPendingKeys()).toHaveLength(0);

      vi.advanceTimersByTime(2000);
      expect(mockSave1).not.toHaveBeenCalled();
      expect(mockSave2).not.toHaveBeenCalled();
    });
  });

  describe('isPending', () => {
    it('should return true for pending auto-save', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction);
      expect(manager.isPending('test-key')).toBe(true);
    });

    it('should return false for non-pending auto-save', () => {
      expect(manager.isPending('test-key')).toBe(false);
    });

    it('should return false after auto-save completes', () => {
      manager.scheduleAutoSave('test-key', mockSaveFunction);
      expect(manager.isPending('test-key')).toBe(true);

      vi.advanceTimersByTime(2000);
      expect(manager.isPending('test-key')).toBe(false);
    });
  });

  describe('getPendingKeys', () => {
    it('should return all pending keys', () => {
      manager.scheduleAutoSave('key1', vi.fn());
      manager.scheduleAutoSave('key2', vi.fn());
      manager.scheduleAutoSave('key3', vi.fn());

      const pendingKeys = manager.getPendingKeys();
      expect(pendingKeys).toHaveLength(3);
      expect(pendingKeys).toContain('key1');
      expect(pendingKeys).toContain('key2');
      expect(pendingKeys).toContain('key3');
    });

    it('should return empty array when no pending saves', () => {
      const pendingKeys = manager.getPendingKeys();
      expect(pendingKeys).toEqual([]);
    });
  });
});

describe('Singleton Instances', () => {
  it('should provide global contentVersionManager instance', () => {
    expect(contentVersionManager).toBeInstanceOf(ContentVersionManager);
  });

  it('should provide global autoSaveManager instance', () => {
    expect(autoSaveManager).toBeInstanceOf(AutoSaveManager);
  });

  it('should maintain state across imports', () => {
    const mockAuthor = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
    
    contentVersionManager.saveVersion('test-dest', 'overview', 'Test content', mockAuthor, 'Test change');
    
    const versions = contentVersionManager.getVersionHistory('test-dest', 'overview');
    expect(versions).toHaveLength(1);
  });
});