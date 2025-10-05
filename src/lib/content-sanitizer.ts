/**
 * Content sanitization and validation utilities for training materials
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedContent?: string;
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  removeScripts?: boolean;
  removeEventHandlers?: boolean;
  validateUrls?: boolean;
}

export class ContentSanitizer {
  private static readonly DEFAULT_ALLOWED_TAGS = [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'pre', 'code'
  ];

  private static readonly DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    'a': ['href', 'title', 'target'],
    'img': ['src', 'alt', 'title', 'width', 'height'],
    'table': ['border', 'cellpadding', 'cellspacing'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
    'div': ['class'],
    'span': ['class'],
    'p': ['class'],
    'h1': ['class'],
    'h2': ['class'],
    'h3': ['class'],
    'h4': ['class'],
    'h5': ['class'],
    'h6': ['class'],
  };

  private static readonly DANGEROUS_PROTOCOLS = [
    'javascript:', 'vbscript:', 'data:text/html', 'data:application/'
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^>\s]+/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?\s*javascript:/gi,
  ];

  /**
   * Sanitize HTML content for safe display
   */
  static sanitizeHtml(
    content: string,
    options: SanitizationOptions = {}
  ): ValidationResult {
    const {
      allowedTags = this.DEFAULT_ALLOWED_TAGS,
      allowedAttributes = this.DEFAULT_ALLOWED_ATTRIBUTES,
      maxLength = 50000,
      removeScripts = true,
      removeEventHandlers = true,
      validateUrls = true,
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitized = content;

    // Check content length
    if (content.length > maxLength) {
      errors.push(`Content exceeds maximum length of ${maxLength} characters`);
      return { isValid: false, errors, warnings };
    }

    // Remove script tags
    if (removeScripts) {
      const scriptMatches = content.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
      if (scriptMatches) {
        warnings.push(`Removed ${scriptMatches.length} script tag(s)`);
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      }
    }

    // Remove event handlers
    if (removeEventHandlers) {
      const eventMatches = sanitized.match(/on\w+\s*=\s*["'][^"']*["']/gi);
      if (eventMatches) {
        warnings.push(`Removed ${eventMatches.length} event handler(s)`);
        sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        sanitized = sanitized.replace(/on\w+\s*=\s*[^>\s]+/gi, '');
      }
    }

    // Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(sanitized)) {
        const matches = sanitized.match(pattern);
        if (matches) {
          warnings.push(`Removed potentially dangerous content: ${matches.length} pattern(s)`);
          sanitized = sanitized.replace(pattern, '');
        }
      }
    }

    // Validate and sanitize URLs
    if (validateUrls) {
      sanitized = this.sanitizeUrls(sanitized, warnings);
    }

    // Remove disallowed tags
    sanitized = this.removeDisallowedTags(sanitized, allowedTags, warnings);

    // Remove disallowed attributes
    sanitized = this.removeDisallowedAttributes(sanitized, allowedAttributes, warnings);

    // Final validation
    const textContent = sanitized.replace(/<[^>]*>/g, '').trim();
    if (textContent.length === 0 && content.trim().length > 0) {
      errors.push('Content became empty after sanitization');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedContent: sanitized,
    };
  }

  /**
   * Validate file references in content
   */
  static validateFileReferences(
    content: string,
    allowedFileIds: string[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract file references from content
    const fileRefPattern = /\/api\/training\/files\/([a-f0-9-]+)\/download/gi;
    const matches = content.matchAll(fileRefPattern);
    
    for (const match of matches) {
      const fileId = match[1];
      if (!allowedFileIds.includes(fileId)) {
        errors.push(`Invalid file reference: ${fileId}`);
      }
    }

    // Check for external image references
    const imgPattern = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    const imgMatches = content.matchAll(imgPattern);
    
    for (const match of matches) {
      const src = match[1];
      if (!src.startsWith('/api/training/files/') && !this.isValidExternalUrl(src)) {
        warnings.push(`External image reference may not be accessible: ${src}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate content size and complexity
   */
  static validateContentSize(content: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check text content length
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 10) {
      warnings.push('Content is very short (less than 10 characters)');
    }

    // Check HTML complexity
    const tagCount = (content.match(/<[^>]+>/g) || []).length;
    if (tagCount > 1000) {
      warnings.push('Content has high HTML complexity (many tags)');
    }

    // Check nesting depth
    const maxDepth = this.calculateNestingDepth(content);
    if (maxDepth > 20) {
      warnings.push('Content has deep HTML nesting');
    }

    // Check for excessive whitespace
    const whitespaceRatio = (content.length - content.replace(/\s/g, '').length) / content.length;
    if (whitespaceRatio > 0.5) {
      warnings.push('Content has excessive whitespace');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Sanitize URLs in content
   */
  private static sanitizeUrls(content: string, warnings: string[]): string {
    let sanitized = content;

    // Check for dangerous protocols
    for (const protocol of this.DANGEROUS_PROTOCOLS) {
      if (sanitized.toLowerCase().includes(protocol)) {
        warnings.push(`Removed dangerous protocol: ${protocol}`);
        sanitized = sanitized.replace(new RegExp(protocol, 'gi'), 'about:blank');
      }
    }

    return sanitized;
  }

  /**
   * Remove disallowed HTML tags
   */
  private static removeDisallowedTags(
    content: string,
    allowedTags: string[],
    warnings: string[]
  ): string {
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    const matches = content.matchAll(tagPattern);
    const removedTags = new Set<string>();

    let sanitized = content;

    for (const match of matches) {
      const tagName = match[1].toLowerCase();
      if (!allowedTags.includes(tagName)) {
        removedTags.add(tagName);
        sanitized = sanitized.replace(match[0], '');
      }
    }

    if (removedTags.size > 0) {
      warnings.push(`Removed disallowed tags: ${Array.from(removedTags).join(', ')}`);
    }

    return sanitized;
  }

  /**
   * Remove disallowed attributes
   */
  private static removeDisallowedAttributes(
    content: string,
    allowedAttributes: Record<string, string[]>,
    warnings: string[]
  ): string {
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
    let sanitized = content;
    const removedAttrs = new Set<string>();

    sanitized = sanitized.replace(tagPattern, (match, tagName, attributes) => {
      const tag = tagName.toLowerCase();
      const allowedAttrs = allowedAttributes[tag] || [];
      
      if (!allowedAttrs.length) {
        return `<${tagName}>`;
      }

      // Parse and filter attributes
      const attrPattern = /(\w+)\s*=\s*["']([^"']*)["']/g;
      const validAttrs: string[] = [];
      
      let attrMatch;
      while ((attrMatch = attrPattern.exec(attributes)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2];
        
        if (allowedAttrs.includes(attrName)) {
          validAttrs.push(`${attrName}="${attrValue}"`);
        } else {
          removedAttrs.add(`${tag}.${attrName}`);
        }
      }

      return validAttrs.length > 0 
        ? `<${tagName} ${validAttrs.join(' ')}>`
        : `<${tagName}>`;
    });

    if (removedAttrs.size > 0) {
      warnings.push(`Removed disallowed attributes: ${Array.from(removedAttrs).join(', ')}`);
    }

    return sanitized;
  }

  /**
   * Calculate HTML nesting depth
   */
  private static calculateNestingDepth(html: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let match;
    
    while ((match = tagPattern.exec(html)) !== null) {
      const tag = match[0];
      const tagName = match[1].toLowerCase();
      
      // Skip self-closing tags
      if (tag.endsWith('/>') || ['br', 'img', 'hr', 'input'].includes(tagName)) {
        continue;
      }
      
      if (tag.startsWith('</')) {
        currentDepth--;
      } else {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      }
    }
    
    return maxDepth;
  }

  /**
   * Check if URL is valid and safe
   */
  private static isValidExternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}

/**
 * Quick sanitization for simple use cases
 */
export function sanitizeHtml(content: string): string {
  const result = ContentSanitizer.sanitizeHtml(content);
  return result.sanitizedContent || content;
}

/**
 * Validate training material content
 */
export function validateTrainingContent(
  type: 'video' | 'blog' | 'download',
  content: {
    title?: string;
    description?: string;
    contentUrl?: string;
    richContent?: string;
    uploadedFiles?: any[];
    fileUrl?: string;
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate title
  if (!content.title?.trim()) {
    errors.push('Title is required');
  } else if (content.title.length > 200) {
    errors.push('Title is too long (maximum 200 characters)');
  }

  // Validate description
  if (!content.description?.trim()) {
    errors.push('Description is required');
  } else if (content.description.length > 1000) {
    errors.push('Description is too long (maximum 1000 characters)');
  }

  // Type-specific validation
  switch (type) {
    case 'video':
      if (!content.contentUrl?.trim()) {
        errors.push('Video URL is required');
      }
      break;
    
    case 'blog':
      if (!content.richContent?.trim() && !content.contentUrl?.trim()) {
        errors.push('Blog content or external URL is required');
      }
      if (content.richContent) {
        const htmlValidation = ContentSanitizer.sanitizeHtml(content.richContent);
        errors.push(...htmlValidation.errors);
        warnings.push(...htmlValidation.warnings);
      }
      break;
    
    case 'download':
      const hasFiles = content.uploadedFiles && content.uploadedFiles.length > 0;
      const hasFileUrl = content.fileUrl?.trim();
      if (!hasFiles && !hasFileUrl) {
        errors.push('Files or file URL is required');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}