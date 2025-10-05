export interface ContentVersion {
  id: string;
  content: string;
  timestamp: Date;
  author: {
    id: string;
    name: string;
    email: string;
  };
  changes: string;
  sectionKey: string;
  destinationId: string;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  metadata?: {
    wordCount?: number;
    characterCount?: number;
    aiGenerated?: boolean;
    templateUsed?: string;
  };
}

export interface ContentDiff {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  position: number;
}

export class ContentVersionManager {
  private versions: Map<string, ContentVersion[]> = new Map();
  private maxVersions: number = 50; // Maximum versions to keep per section

  /**
   * Save a new version of content
   */
  saveVersion(
    destinationId: string,
    sectionKey: string,
    content: string,
    author: { id: string; name: string; email: string },
    changes: string,
    changeType: ContentVersion['changeType'] = 'update',
    metadata?: ContentVersion['metadata']
  ): ContentVersion {
    const versionKey = `${destinationId}-${sectionKey}`;
    const versions = this.versions.get(versionKey) || [];

    const newVersion: ContentVersion = {
      id: this.generateVersionId(),
      content,
      timestamp: new Date(),
      author,
      changes,
      sectionKey,
      destinationId,
      changeType,
      metadata: {
        wordCount: this.countWords(content),
        characterCount: content.length,
        ...metadata
      }
    };

    // Add new version at the beginning
    versions.unshift(newVersion);

    // Keep only the latest versions
    if (versions.length > this.maxVersions) {
      versions.splice(this.maxVersions);
    }

    this.versions.set(versionKey, versions);
    return newVersion;
  }

  /**
   * Get version history for a specific section
   */
  getVersionHistory(destinationId: string, sectionKey: string): ContentVersion[] {
    const versionKey = `${destinationId}-${sectionKey}`;
    return this.versions.get(versionKey) || [];
  }

  /**
   * Get a specific version by ID
   */
  getVersion(destinationId: string, sectionKey: string, versionId: string): ContentVersion | undefined {
    const versions = this.getVersionHistory(destinationId, sectionKey);
    return versions.find(version => version.id === versionId);
  }

  /**
   * Restore content to a specific version
   */
  restoreVersion(
    destinationId: string,
    sectionKey: string,
    versionId: string,
    author: { id: string; name: string; email: string }
  ): ContentVersion | null {
    const versionToRestore = this.getVersion(destinationId, sectionKey, versionId);
    if (!versionToRestore) {
      return null;
    }

    // Create a new version with the restored content
    return this.saveVersion(
      destinationId,
      sectionKey,
      versionToRestore.content,
      author,
      `Restored to version from ${versionToRestore.timestamp.toLocaleString()}`,
      'restore',
      {
        ...versionToRestore.metadata,
        aiGenerated: false // Mark as manually restored
      }
    );
  }

  /**
   * Compare two versions and generate a diff
   */
  compareVersions(version1: ContentVersion, version2: ContentVersion): ContentDiff[] {
    const content1 = this.stripHtml(version1.content);
    const content2 = this.stripHtml(version2.content);
    
    return this.generateDiff(content1, content2);
  }

  /**
   * Get content statistics for a version
   */
  getContentStats(content: string): {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    imageCount: number;
    linkCount: number;
  } {
    const wordCount = this.countWords(content);
    const characterCount = content.length;
    const paragraphCount = (content.match(/<p>/g) || []).length;
    const imageCount = (content.match(/<img/g) || []).length;
    const linkCount = (content.match(/<a/g) || []).length;

    return {
      wordCount,
      characterCount,
      paragraphCount,
      imageCount,
      linkCount
    };
  }

  /**
   * Search versions by content or metadata
   */
  searchVersions(
    destinationId: string,
    sectionKey: string,
    query: string
  ): ContentVersion[] {
    const versions = this.getVersionHistory(destinationId, sectionKey);
    const lowercaseQuery = query.toLowerCase();

    return versions.filter(version => 
      version.content.toLowerCase().includes(lowercaseQuery) ||
      version.changes.toLowerCase().includes(lowercaseQuery) ||
      version.author.name.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Get versions by date range
   */
  getVersionsByDateRange(
    destinationId: string,
    sectionKey: string,
    startDate: Date,
    endDate: Date
  ): ContentVersion[] {
    const versions = this.getVersionHistory(destinationId, sectionKey);
    
    return versions.filter(version => 
      version.timestamp >= startDate && version.timestamp <= endDate
    );
  }

  /**
   * Get versions by author
   */
  getVersionsByAuthor(
    destinationId: string,
    sectionKey: string,
    authorId: string
  ): ContentVersion[] {
    const versions = this.getVersionHistory(destinationId, sectionKey);
    
    return versions.filter(version => version.author.id === authorId);
  }

  /**
   * Delete old versions beyond retention period
   */
  cleanupOldVersions(retentionDays: number = 90): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedCount = 0;

    for (const [key, versions] of this.versions.entries()) {
      const filteredVersions = versions.filter(version => version.timestamp >= cutoffDate);
      deletedCount += versions.length - filteredVersions.length;
      
      if (filteredVersions.length === 0) {
        this.versions.delete(key);
      } else {
        this.versions.set(key, filteredVersions);
      }
    }

    return deletedCount;
  }

  /**
   * Export version history for backup
   */
  exportVersionHistory(destinationId?: string): { [key: string]: ContentVersion[] } {
    const exported: { [key: string]: ContentVersion[] } = {};

    for (const [key, versions] of this.versions.entries()) {
      if (!destinationId || key.startsWith(destinationId)) {
        exported[key] = versions;
      }
    }

    return exported;
  }

  /**
   * Import version history from backup
   */
  importVersionHistory(data: { [key: string]: ContentVersion[] }): void {
    for (const [key, versions] of Object.entries(data)) {
      this.versions.set(key, versions);
    }
  }

  /**
   * Generate a unique version ID
   */
  private generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    const text = this.stripHtml(content);
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
  }

  /**
   * Generate a simple diff between two text strings
   */
  private generateDiff(text1: string, text2: string): ContentDiff[] {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const diffs: ContentDiff[] = [];

    // Simple word-by-word comparison
    const maxLength = Math.max(words1.length, words2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const word1 = words1[i];
      const word2 = words2[i];

      if (word1 === word2) {
        if (word1) {
          diffs.push({
            type: 'unchanged',
            content: word1,
            position: i
          });
        }
      } else if (!word1 && word2) {
        diffs.push({
          type: 'added',
          content: word2,
          position: i
        });
      } else if (word1 && !word2) {
        diffs.push({
          type: 'removed',
          content: word1,
          position: i
        });
      } else if (word1 && word2) {
        diffs.push({
          type: 'removed',
          content: word1,
          position: i
        });
        diffs.push({
          type: 'added',
          content: word2,
          position: i
        });
      }
    }

    return diffs;
  }
}

// Singleton instance for global use
export const contentVersionManager = new ContentVersionManager();

// Auto-save functionality
export class AutoSaveManager {
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private saveDelay: number = 2000; // 2 seconds delay

  /**
   * Schedule an auto-save for content
   */
  scheduleAutoSave(
    key: string,
    saveFunction: () => void,
    delay: number = this.saveDelay
  ): void {
    // Clear existing timeout
    const existingTimeout = this.saveTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      saveFunction();
      this.saveTimeouts.delete(key);
    }, delay);

    this.saveTimeouts.set(key, timeout);
  }

  /**
   * Cancel auto-save for a specific key
   */
  cancelAutoSave(key: string): void {
    const timeout = this.saveTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(key);
    }
  }

  /**
   * Cancel all pending auto-saves
   */
  cancelAllAutoSaves(): void {
    for (const timeout of this.saveTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.saveTimeouts.clear();
  }

  /**
   * Check if auto-save is pending for a key
   */
  isPending(key: string): boolean {
    return this.saveTimeouts.has(key);
  }

  /**
   * Get all pending auto-save keys
   */
  getPendingKeys(): string[] {
    return Array.from(this.saveTimeouts.keys());
  }
}

// Singleton instance for global use
export const autoSaveManager = new AutoSaveManager();