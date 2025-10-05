import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import DestinationContentEditor from '../DestinationContentEditor';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
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
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
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
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
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
import { expect } from '@playwright/test';
import { expect } from '@playwright/test';
import { it } from 'zod/v4/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock document.execCommand
Object.defineProperty(document, 'execCommand', {
  value: vi.fn(() => true),
  writable: true
});

const mockSections = {
  overview: {
    title: 'Overview',
    content: '<p>Test overview content</p>',
    images: [],
    highlights: ['Beautiful beaches', 'Great weather'],
    tips: ['Bring sunscreen', 'Book early'],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  },
  accommodation: {
    title: 'Accommodation',
    content: '<p>Test accommodation content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: true
  },
  attractions: {
    title: 'Attractions',
    content: '<p>Test attractions content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  },
  beaches: {
    title: 'Beaches',
    content: '<p>Test beaches content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  },
  nightlife: {
    title: 'Nightlife',
    content: '<p>Test nightlife content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  },
  dining: {
    title: 'Dining',
    content: '<p>Test dining content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  },
  practical: {
    title: 'Practical Information',
    content: '<p>Test practical content</p>',
    images: [],
    highlights: [],
    tips: [],
    lastModified: new Date('2023-01-01'),
    aiGenerated: false
  }
};

const mockOnSectionUpdate = vi.fn();
const mockOnSave = vi.fn();

describe('DestinationContentEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all section tabs', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getAllByText('Overview')).toHaveLength(2); // Tab and header
    expect(screen.getByText('Accommodation')).toBeInTheDocument();
    expect(screen.getByText('Attractions')).toBeInTheDocument();
    expect(screen.getByText('Beaches')).toBeInTheDocument();
    expect(screen.getByText('Nightlife')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Practical Information')).toBeInTheDocument();
  });

  it('displays overview section by default', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getByText('General introduction and highlights of the destination')).toBeInTheDocument();
  });

  it('switches between sections when tabs are clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Click on Accommodation tab
    await user.click(screen.getByText('Accommodation'));
    
    expect(screen.getByText('Hotels, resorts, and lodging options')).toBeInTheDocument();
  });

  it('renders formatting toolbar with all buttons', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Check for formatting buttons (by title attributes)
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Bullet List')).toBeInTheDocument();
    expect(screen.getByTitle('Numbered List')).toBeInTheDocument();
    expect(screen.getByTitle('Insert Link')).toBeInTheDocument();
    expect(screen.getByTitle('Insert Image')).toBeInTheDocument();
    expect(screen.getByTitle('Quote')).toBeInTheDocument();
    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
  });

  it('executes formatting commands when toolbar buttons are clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Click bold button
    await user.click(screen.getByTitle('Bold'));
    
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('displays highlights for current section', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getByText('Beautiful beaches')).toBeInTheDocument();
    expect(screen.getByText('Great weather')).toBeInTheDocument();
  });

  it('displays tips for current section', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getByText('Bring sunscreen')).toBeInTheDocument();
    expect(screen.getByText('Book early')).toBeInTheDocument();
  });

  it('adds new highlight when add button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt
    window.prompt = vi.fn().mockReturnValue('New highlight');
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Find and click the add highlight button
    const highlightsSection = screen.getByText('Highlights').closest('div');
    const addButton = highlightsSection?.querySelector('button');
    
    if (addButton) {
      await user.click(addButton);
    }

    expect(mockOnSectionUpdate).toHaveBeenCalledWith('overview', expect.objectContaining({
      highlights: expect.arrayContaining(['New highlight'])
    }));
  });

  it('adds new tip when add button is clicked', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt
    window.prompt = vi.fn().mockReturnValue('New tip');
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Find and click the add tip button
    const tipsSection = screen.getByText('Tips').closest('div');
    const addButton = tipsSection?.querySelector('button');
    
    if (addButton) {
      await user.click(addButton);
    }

    expect(mockOnSectionUpdate).toHaveBeenCalledWith('overview', expect.objectContaining({
      tips: expect.arrayContaining(['New tip'])
    }));
  });

  it('removes highlight when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Find the first highlight's delete button
    const highlightElement = screen.getByText('Beautiful beaches').closest('div');
    const deleteButton = highlightElement?.querySelector('button');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }

    expect(mockOnSectionUpdate).toHaveBeenCalledWith('overview', expect.objectContaining({
      highlights: ['Great weather'] // Should only contain the remaining highlight
    }));
  });

  it('removes tip when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Find the first tip's delete button
    const tipElement = screen.getByText('Bring sunscreen').closest('div');
    const deleteButton = tipElement?.querySelector('button');
    
    if (deleteButton) {
      await user.click(deleteButton);
    }

    expect(mockOnSectionUpdate).toHaveBeenCalledWith('overview', expect.objectContaining({
      tips: ['Book early'] // Should only contain the remaining tip
    }));
  });

  it('toggles preview mode when preview button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    const previewButton = screen.getByText('Preview');
    await user.click(previewButton);

    // In preview mode, the contentEditable div should not be present
    // and the preview div should show the content
    expect(screen.getByText('Preview')).toHaveClass('bg-blue-100');
  });

  it('shows templates modal when templates button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    await user.click(screen.getByText('Templates'));

    expect(screen.getByText('Content Templates')).toBeInTheDocument();
  });

  it('shows version history modal when history button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    await user.click(screen.getByText('History'));

    expect(screen.getByText('Version History')).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
        onSave={mockOnSave}
      />
    );

    await user.click(screen.getByText('Save'));

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('displays section info correctly', () => {
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getByText('Section Info')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument(); // AI Generated: No
  });

  it('shows AI generated indicator for AI-generated content', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Switch to accommodation section (which is AI generated)
    await user.click(screen.getByText('Accommodation'));

    expect(screen.getByText('Yes')).toBeInTheDocument(); // AI Generated: Yes
  });

  it('handles link insertion with prompt', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt
    window.prompt = vi.fn().mockReturnValue('https://example.com');
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    await user.click(screen.getByTitle('Insert Link'));

    expect(window.prompt).toHaveBeenCalledWith('Enter URL:');
    expect(document.execCommand).toHaveBeenCalledWith('createLink', false, 'https://example.com');
  });

  it('handles image insertion with prompt', async () => {
    const user = userEvent.setup();
    
    // Mock window.prompt
    window.prompt = vi.fn().mockReturnValue('https://example.com/image.jpg');
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    await user.click(screen.getByTitle('Insert Image'));

    expect(window.prompt).toHaveBeenCalledWith('Enter image URL:');
    expect(document.execCommand).toHaveBeenCalledWith('insertImage', false, 'https://example.com/image.jpg');
  });

  it('closes templates modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Open templates modal
    await user.click(screen.getByText('Templates'));
    expect(screen.getByText('Content Templates')).toBeInTheDocument();

    // Close modal
    await user.click(screen.getByText('×'));
    
    await waitFor(() => {
      expect(screen.queryByText('Content Templates')).not.toBeInTheDocument();
    });
  });

  it('closes version history modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Open version history modal
    await user.click(screen.getByText('History'));
    expect(screen.getByText('Version History')).toBeInTheDocument();

    // Close modal
    const closeButtons = screen.getAllByText('×');
    await user.click(closeButtons[closeButtons.length - 1]); // Get the last close button
    
    await waitFor(() => {
      expect(screen.queryByText('Version History')).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles empty highlights and tips gracefully', async () => {
    const user = userEvent.setup();
    
    const sectionsWithoutHighlights = {
      ...mockSections,
      overview: {
        ...mockSections.overview,
        highlights: [],
        tips: []
      }
    };

    render(
      <DestinationContentEditor
        sections={sectionsWithoutHighlights}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    expect(screen.getByText('No highlights added')).toBeInTheDocument();
    expect(screen.getByText('No tips added')).toBeInTheDocument();
  });

  it('shows available templates for current section', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Open templates modal
    await user.click(screen.getByText('Templates'));

    // Should show overview templates
    expect(screen.getByText('Beach Destination Overview')).toBeInTheDocument();
  });

  it('filters templates by section', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Switch to accommodation section
    await user.click(screen.getByText('Accommodation'));
    
    // Open templates modal
    await user.click(screen.getByText('Templates'));

    // Should show accommodation templates
    expect(screen.getByText('Luxury Accommodation')).toBeInTheDocument();
  });
});

describe('DestinationContentEditor Integration', () => {
  it('updates section content when editor content changes', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Find the contentEditable div and simulate input
    const editor = document.querySelector('[contenteditable="true"]');
    if (editor) {
      // Simulate content change
      editor.innerHTML = '<p>New content</p>';
      fireEvent.input(editor);
    }

    // Should call onSectionUpdate with new content
    await waitFor(() => {
      expect(mockOnSectionUpdate).toHaveBeenCalledWith('overview', expect.objectContaining({
        content: '<p>New content</p>'
      }));
    });
  });

  it('maintains section state when switching between sections', async () => {
    const user = userEvent.setup();
    
    render(
      <DestinationContentEditor
        sections={mockSections}
        onSectionUpdate={mockOnSectionUpdate}
      />
    );

    // Switch to accommodation
    await user.click(screen.getByText('Accommodation'));
    
    // Switch back to overview
    await user.click(screen.getByText('Overview'));

    // Should still show overview highlights
    expect(screen.getByText('Beautiful beaches')).toBeInTheDocument();
    expect(screen.getByText('Great weather')).toBeInTheDocument();
  });
});