'use client';

import React, { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';
import { createTinyMCEImageHandler } from '@/lib/image-upload-handler';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  disabled?: boolean;
  height?: number;
  className?: string;
}

export default function WYSIWYGEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = 'Start writing your content...',
  disabled = false,
  height = 400,
  className = '',
}: WYSIWYGEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null);

  // Handle image upload
  const handleImageUpload = async (blobInfo: any, progress: (percent: number) => void): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        progress(0);

        // Convert blob to file
        const file = new File([blobInfo.blob()], blobInfo.filename(), {
          type: blobInfo.blob().type,
        });

        progress(25);

        // Use custom handler if provided, otherwise use default
        let imageUrl: string;
        if (onImageUpload) {
          imageUrl = await onImageUpload(file);
        } else {
          // Use default TinyMCE image handler
          const defaultHandler = createTinyMCEImageHandler();
          imageUrl = await defaultHandler(file);
        }

        progress(100);
        resolve(imageUrl);
      } catch (error) {
        console.error('Image upload error:', error);
        reject(error instanceof Error ? error.message : 'Image upload failed');
      }
    });
  };

  // TinyMCE configuration
  const editorConfig = {
    height,
    menubar: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount', 'paste'
    ],
    toolbar: [
      'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify',
      'bullist numlist outdent indent | removeformat | link image media table | code fullscreen help'
    ].join(' | '),
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
        font-size: 14px; 
        line-height: 1.6;
        color: #333;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      table td, table th {
        border: 1px solid #ddd;
        padding: 8px;
      }
      table th {
        background-color: #f2f2f2;
        font-weight: bold;
      }
    `,
    placeholder,
    paste_data_images: true,
    images_upload_handler: handleImageUpload,
    automatic_uploads: true,
    file_picker_types: 'image',
    image_advtab: true,
    image_caption: true,
    image_description: false,
    image_dimensions: false,
    image_title: true,
    link_default_target: '_blank',
    link_assume_external_targets: true,
    target_list: [
      { title: 'Same window', value: '' },
      { title: 'New window', value: '_blank' }
    ],
    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6; Preformatted=pre',
    fontsize_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt',
    setup: (editor: TinyMCEEditor) => {
      editorRef.current = editor;
      
      // Add custom validation
      editor.on('BeforeSetContent', (e) => {
        // Basic XSS prevention - remove script tags
        if (e.content) {
          e.content = e.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
      });

      // Handle paste events
      editor.on('PastePreProcess', (e) => {
        // Clean up pasted content
        if (e.content) {
          // Remove potentially dangerous attributes
          e.content = e.content.replace(/on\w+="[^"]*"/gi, '');
          e.content = e.content.replace(/javascript:/gi, '');
        }
      });
    },
    init_instance_callback: (editor: TinyMCEEditor) => {
      // Set initial content
      if (value && value !== editor.getContent()) {
        editor.setContent(value);
      }
    },
  };

  return (
    <div className={`wysiwyg-editor ${className}`}>
      <Editor
        apiKey="no-api-key" // Using TinyMCE without API key for local development
        value={value}
        onEditorChange={(content) => {
          // Sanitize content before passing to parent
          const sanitizedContent = sanitizeContent(content);
          onChange(sanitizedContent);
        }}
        init={editorConfig}
        disabled={disabled}
      />
    </div>
  );
}

/**
 * Basic content sanitization
 */
function sanitizeContent(content: string): string {
  if (!content) return '';

  // Remove script tags and event handlers
  let sanitized = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove potentially dangerous protocols
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, 'data:text/plain');
  
  return sanitized;
}

/**
 * Validate content length and structure
 */
export function validateContent(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim() === '') {
    return { isValid: false, error: 'Content cannot be empty' };
  }

  // Remove HTML tags to get text length
  const textContent = content.replace(/<[^>]*>/g, '').trim();
  
  if (textContent.length < 10) {
    return { isValid: false, error: 'Content must be at least 10 characters long' };
  }

  if (textContent.length > 50000) {
    return { isValid: false, error: 'Content cannot exceed 50,000 characters' };
  }

  return { isValid: true };
}