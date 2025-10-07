'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Quote, 
  Undo, 
  Redo,
  Save,
  Eye,
  History,
  FileText,
  Plus,
  Trash2,
  Copy,
  Sparkles
} from 'lucide-react';
import { AIContentGenerator } from './AIContentGenerator';

interface DestinationSection {
  title: string;
  content: string;
  images?: string[];
  highlights?: string[];
  tips?: string[];
  lastModified: Date;
  aiGenerated: boolean;
}

interface ContentVersion {
  id: string;
  content: string;
  timestamp: Date;
  author: string;
  changes: string;
}

interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
}

interface DestinationContentEditorProps {
  destinationId?: string;
  destination?: {
    name: string;
    country: string;
    region: string;
    description?: string;
  };
  sections: {
    overview: DestinationSection;
    accommodation: DestinationSection;
    attractions: DestinationSection;
    beaches: DestinationSection;
    nightlife: DestinationSection;
    dining: DestinationSection;
    practical: DestinationSection;
  };
  onSectionUpdate: (sectionKey: string, section: DestinationSection) => void;
  onSave?: () => void;
  className?: string;
}

const SECTION_CONFIGS = {
  overview: {
    title: 'Overview',
    description: 'General introduction and highlights of the destination',
    icon: '🏖️',
    placeholder: 'Provide an engaging overview of this destination...'
  },
  accommodation: {
    title: 'Accommodation',
    description: 'Hotels, resorts, and lodging options',
    icon: '🏨',
    placeholder: 'Describe accommodation options and recommendations...'
  },
  attractions: {
    title: 'Attractions',
    description: 'Must-see sights and activities',
    icon: '🎯',
    placeholder: 'List and describe key attractions and activities...'
  },
  beaches: {
    title: 'Beaches',
    description: 'Beach information and recommendations',
    icon: '🏖️',
    placeholder: 'Describe the beaches and coastal areas...'
  },
  nightlife: {
    title: 'Nightlife',
    description: 'Entertainment and nighttime activities',
    icon: '🌙',
    placeholder: 'Detail nightlife options and entertainment venues...'
  },
  dining: {
    title: 'Dining',
    description: 'Restaurants, cuisine, and food experiences',
    icon: '🍽️',
    placeholder: 'Describe dining options and local cuisine...'
  },
  practical: {
    title: 'Practical Information',
    description: 'Travel tips, logistics, and essential information',
    icon: 'ℹ️',
    placeholder: 'Provide practical travel information and tips...'
  }
};

const DEFAULT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'overview-beach',
    name: 'Beach Destination Overview',
    description: 'Template for beach destinations',
    category: 'overview',
    content: `<h3>Welcome to Paradise</h3>
<p>Discover the stunning beauty of [Destination Name], where pristine beaches meet vibrant culture and endless adventure.</p>
<h4>What Makes This Special</h4>
<ul>
<li>Crystal-clear waters and golden sandy beaches</li>
<li>Rich cultural heritage and local traditions</li>
<li>World-class dining and entertainment</li>
<li>Perfect weather year-round</li>
</ul>`
  },
  {
    id: 'accommodation-luxury',
    name: 'Luxury Accommodation',
    description: 'Template for luxury hotel descriptions',
    category: 'accommodation',
    content: `<h3>Luxury Stays</h3>
<p>Experience unparalleled comfort in our carefully selected luxury accommodations.</p>
<h4>Featured Properties</h4>
<ul>
<li><strong>5-Star Resorts:</strong> All-inclusive luxury with premium amenities</li>
<li><strong>Boutique Hotels:</strong> Intimate settings with personalized service</li>
<li><strong>Beachfront Villas:</strong> Private retreats with stunning ocean views</li>
</ul>`
  }
];

export default function DestinationContentEditor({
  destinationId,
  destination,
  sections,
  onSectionUpdate,
  onSave,
  className = ''
}: DestinationContentEditorProps) {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [showPreview, setShowPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [templates] = useState<ContentTemplate[]>(DEFAULT_TEMPLATES);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const currentSection = sections[activeSection as keyof typeof sections];

  // Auto-save functionality
  const triggerAutoSave = useCallback(async () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (!destinationId) return;
      
      setIsAutoSaving(true);
      try {
        const response = await fetch(`/api/admin/destinations/${destinationId}/auto-save`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sections }),
        });
        
        if (response.ok) {
          setLastSaved(new Date());
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 3000); // Increased delay to reduce conflicts
  }, [destinationId, sections]);

  // Handle content changes
  const handleContentChange = useCallback(() => {
    if (!editorRef.current) return;
    
    // Store cursor position before updating
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const cursorOffset = range ? range.startOffset : 0;
    const cursorNode = range ? range.startContainer : null;
    
    const content = editorRef.current.innerHTML;
    const updatedSection: DestinationSection = {
      ...currentSection,
      content,
      lastModified: new Date()
    };
    
    onSectionUpdate(activeSection, updatedSection);
    
    // Restore cursor position after update
    if (cursorNode && selection && range) {
      try {
        range.setStart(cursorNode, Math.min(cursorOffset, cursorNode.textContent?.length || 0));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (e) {
        // Ignore cursor restoration errors
      }
    }
    
    triggerAutoSave();
  }, [activeSection, currentSection, onSectionUpdate, triggerAutoSave]);

  // Formatting commands
  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleContentChange();
  }, [handleContentChange]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Insert image with file upload
  const insertImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          execCommand('insertImage', data.url);
        } else {
          // Fallback to URL input
          const url = prompt('Upload failed. Enter image URL:');
          if (url) {
            execCommand('insertImage', url);
          }
        }
      } catch (error) {
        console.error('Image upload failed:', error);
        // Fallback to URL input
        const url = prompt('Upload failed. Enter image URL:');
        if (url) {
          execCommand('insertImage', url);
        }
      }
    };
    input.click();
  }, [execCommand]);

  // Apply template
  const applyTemplate = useCallback((template: ContentTemplate) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = template.content;
      handleContentChange();
      setShowTemplates(false);
    }
  }, [handleContentChange]);

  // Add highlight
  const addHighlight = useCallback(() => {
    const text = prompt('Enter highlight text:');
    if (text && currentSection) {
      const updatedSection: DestinationSection = {
        ...currentSection,
        highlights: [...(currentSection.highlights || []), text],
        lastModified: new Date()
      };
      onSectionUpdate(activeSection, updatedSection);
    }
  }, [activeSection, currentSection, onSectionUpdate]);

  // Add tip
  const addTip = useCallback(() => {
    const text = prompt('Enter tip text:');
    if (text && currentSection) {
      const updatedSection: DestinationSection = {
        ...currentSection,
        tips: [...(currentSection.tips || []), text],
        lastModified: new Date()
      };
      onSectionUpdate(activeSection, updatedSection);
    }
  }, [activeSection, currentSection, onSectionUpdate]);

  // Remove highlight
  const removeHighlight = useCallback((index: number) => {
    if (currentSection) {
      const updatedHighlights = [...(currentSection.highlights || [])];
      updatedHighlights.splice(index, 1);
      const updatedSection: DestinationSection = {
        ...currentSection,
        highlights: updatedHighlights,
        lastModified: new Date()
      };
      onSectionUpdate(activeSection, updatedSection);
    }
  }, [activeSection, currentSection, onSectionUpdate]);

  // Remove tip
  const removeTip = useCallback((index: number) => {
    if (currentSection) {
      const updatedTips = [...(currentSection.tips || [])];
      updatedTips.splice(index, 1);
      const updatedSection: DestinationSection = {
        ...currentSection,
        tips: updatedTips,
        lastModified: new Date()
      };
      onSectionUpdate(activeSection, updatedSection);
    }
  }, [activeSection, currentSection, onSectionUpdate]);

  // Handle AI content generation
  const handleAIContentGenerated = useCallback((generatedContent: any) => {
    console.log('🤖 AI Content Generated:', generatedContent);
    
    // Apply generated content to sections
    Object.entries(generatedContent.sections || {}).forEach(([sectionKey, sectionData]: [string, any]) => {
      console.log(`📝 Processing section ${sectionKey}:`, sectionData);
      
      if (sections[sectionKey as keyof typeof sections]) {
        const updatedSection: DestinationSection = {
          ...sections[sectionKey as keyof typeof sections],
          content: sectionData.content || '',
          highlights: sectionData.highlights || [],
          tips: sectionData.tips || [],
          lastModified: new Date(),
          aiGenerated: true
        };
        
        console.log(`💾 Saving section ${sectionKey}:`, updatedSection);
        onSectionUpdate(sectionKey, updatedSection);
      } else {
        console.warn(`⚠️ Section ${sectionKey} not found in existing sections`);
      }
    });
    
    setShowAIGenerator(false);
  }, [sections, onSectionUpdate]);

  // Load version history (mock implementation)
  const loadVersionHistory = useCallback(() => {
    // In a real implementation, this would fetch from an API
    const mockVersions: ContentVersion[] = [
      {
        id: '1',
        content: currentSection?.content || '',
        timestamp: new Date(),
        author: 'Current User',
        changes: 'Current version'
      },
      {
        id: '2',
        content: 'Previous version content...',
        timestamp: new Date(Date.now() - 3600000),
        author: 'John Doe',
        changes: 'Updated attractions section'
      }
    ];
    setVersions(mockVersions);
    setShowVersionHistory(true);
  }, [currentSection]);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && currentSection) {
      editorRef.current.innerHTML = currentSection.content || '';
    }
  }, [activeSection, currentSection]);

  const sectionConfig = SECTION_CONFIGS[activeSection as keyof typeof SECTION_CONFIGS];
  const availableTemplates = templates.filter(t => t.category === activeSection);

  return (
    <div className={`destination-content-editor ${className}`}>
      {/* Section Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-1">
          {Object.entries(SECTION_CONFIGS).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeSection === key
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-2">{config.icon}</span>
              {config.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Editor Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {sectionConfig?.title}
          </h2>
          <p className="text-sm text-gray-600">{sectionConfig?.description}</p>
        </div>
        
        <div className="flex items-center space-x-2">
          {isAutoSaving && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={() => setShowAIGenerator(true)}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            <Sparkles className="w-4 h-4 inline mr-1" />
            AI Generate
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Templates
          </button>
          
          <button
            onClick={loadVersionHistory}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            <History className="w-4 h-4 inline mr-1" />
            History
          </button>
          
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 text-sm rounded ${
              showPreview 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-1" />
            Preview
          </button>
          
          <button
            onClick={async () => {
              if (!destinationId) return;
              
              try {
                const response = await fetch(`/api/admin/destinations/${destinationId}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ sections }),
                });
                
                if (response.ok) {
                  setLastSaved(new Date());
                  if (onSave) onSave();
                } else {
                  alert('Failed to save changes');
                }
              } catch (error) {
                console.error('Save failed:', error);
                alert('Failed to save changes');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Save className="w-4 h-4 inline mr-1" />
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          {/* Toolbar */}
          <div className="border border-gray-300 rounded-t-lg bg-gray-50 p-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => execCommand('bold')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Underline"
              >
                <Underline className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <button
                onClick={() => execCommand('insertUnorderedList')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('insertOrderedList')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <button
                onClick={insertLink}
                className="p-2 hover:bg-gray-200 rounded"
                title="Insert Link"
              >
                <Link className="w-4 h-4" />
              </button>
              <button
                onClick={insertImage}
                className="p-2 hover:bg-gray-200 rounded"
                title="Insert Image"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('formatBlock', 'blockquote')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <button
                onClick={() => execCommand('undo')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Undo"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => execCommand('redo')}
                className="p-2 hover:bg-gray-200 rounded"
                title="Redo"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="border-x border-b border-gray-300 rounded-b-lg">
            {showPreview ? (
              <div className="p-4 min-h-96 bg-white">
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentSection?.content || '' }}
                />
              </div>
            ) : (
              <div
                ref={editorRef}
                contentEditable
                onInput={handleContentChange}
                className="p-4 min-h-96 bg-white outline-none prose max-w-none"
                placeholder={sectionConfig?.placeholder}
                style={{ minHeight: '384px' }}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Highlights */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Highlights</h3>
              <button
                onClick={addHighlight}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {currentSection?.highlights && currentSection.highlights.length > 0 ? (
                currentSection.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded">
                    <span className="text-sm">{highlight}</span>
                    <button
                      onClick={() => removeHighlight(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No highlights added</p>
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Tips</h3>
              <button
                onClick={addTip}
                className="text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {currentSection?.tips && currentSection.tips.length > 0 ? (
                currentSection.tips.map((tip, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                    <span className="text-sm">{tip}</span>
                    <button
                      onClick={() => removeTip(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tips added</p>
              )}
            </div>
          </div>

          {/* Section Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Section Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Last Modified:</span>
                <br />
                <span className="text-gray-900">
                  {currentSection?.lastModified?.toLocaleString() || 'Never'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">AI Generated:</span>
                <br />
                <span className={`inline-flex px-2 py-1 rounded text-xs ${
                  currentSection?.aiGenerated 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {currentSection?.aiGenerated ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Content Templates</h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {availableTemplates.length > 0 ? (
                availableTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Use Template
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <div 
                      className="text-xs text-gray-500 bg-gray-50 p-2 rounded"
                      dangerouslySetInnerHTML={{ __html: template.content.substring(0, 200) + '...' }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No templates available for this section
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {showAIGenerator && destination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">AI Content Generator</h3>
              <button
                onClick={() => setShowAIGenerator(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <AIContentGenerator
                destination={destination}
                onContentGenerated={handleAIContentGenerated}
                onError={(error) => console.error('AI Generation Error:', error)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Version History</h3>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{version.author}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {version.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200">
                      <Copy className="w-3 h-3 inline mr-1" />
                      Restore
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{version.changes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}