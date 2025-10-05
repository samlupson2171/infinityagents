import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DestinationSection from '../DestinationSection';

describe('DestinationSection', () => {
  it('renders section title as heading', () => {
    render(
      <DestinationSection title="Test Section">
        <p>Test content</p>
      </DestinationSection>
    );
    
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Section');
  });

  it('renders children content', () => {
    render(
      <DestinationSection title="Test Section">
        <p>Test paragraph content</p>
        <div>Test div content</div>
      </DestinationSection>
    );
    
    expect(screen.getByText('Test paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Test div content')).toBeInTheDocument();
  });

  it('applies default styling classes', () => {
    const { container } = render(
      <DestinationSection title="Test Section">
        <p>Test content</p>
      </DestinationSection>
    );
    
    const sectionDiv = container.firstChild;
    expect(sectionDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'p-8');
  });

  it('applies additional className when provided', () => {
    const { container } = render(
      <DestinationSection title="Test Section" className="custom-class">
        <p>Test content</p>
      </DestinationSection>
    );
    
    const sectionDiv = container.firstChild;
    expect(sectionDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'p-8', 'custom-class');
  });

  it('applies prose styling to content area', () => {
    const { container } = render(
      <DestinationSection title="Test Section">
        <p>Test content</p>
      </DestinationSection>
    );
    
    const proseDiv = container.querySelector('.prose.max-w-none');
    expect(proseDiv).toBeInTheDocument();
  });

  it('renders with complex children content', () => {
    render(
      <DestinationSection title="Complex Section">
        <div>
          <h3>Subsection</h3>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
          <p>Paragraph with <strong>bold text</strong></p>
        </div>
      </DestinationSection>
    );
    
    expect(screen.getByText('Subsection')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('bold text')).toBeInTheDocument();
  });

  it('renders with empty className', () => {
    const { container } = render(
      <DestinationSection title="Test Section" className="">
        <p>Test content</p>
      </DestinationSection>
    );
    
    const sectionDiv = container.firstChild;
    expect(sectionDiv).toHaveClass('bg-white', 'rounded-lg', 'shadow-lg', 'p-8');
    expect(sectionDiv).not.toHaveClass('undefined');
  });
});