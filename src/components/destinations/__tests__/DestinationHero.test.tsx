import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DestinationHero from '../DestinationHero';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('DestinationHero', () => {
  const mockProps = {
    name: 'Test Destination',
    description: 'A beautiful test destination',
    region: 'Test Region',
    country: 'Test Country',
    quickInfo: ['✈️ 2 hours from UK', '☀️ 300+ days of sunshine'],
    gradientColors: 'bg-gradient-to-r from-blue-600 to-orange-500'
  };

  it('renders destination name as heading', () => {
    render(<DestinationHero {...mockProps} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Destination');
  });

  it('renders destination description', () => {
    render(<DestinationHero {...mockProps} />);
    
    expect(screen.getByText('A beautiful test destination')).toBeInTheDocument();
  });

  it('renders breadcrumb navigation with link to destinations', () => {
    render(<DestinationHero {...mockProps} />);
    
    const destinationsLink = screen.getByRole('link', { name: 'Destinations' });
    expect(destinationsLink).toHaveAttribute('href', '/destinations');
  });

  it('displays region and country information', () => {
    render(<DestinationHero {...mockProps} />);
    
    expect(screen.getByText('📍 Test Region, Test Country')).toBeInTheDocument();
  });

  it('renders all quick info items', () => {
    render(<DestinationHero {...mockProps} />);
    
    expect(screen.getByText('✈️ 2 hours from UK')).toBeInTheDocument();
    expect(screen.getByText('☀️ 300+ days of sunshine')).toBeInTheDocument();
  });

  it('applies gradient colors class', () => {
    const { container } = render(<DestinationHero {...mockProps} />);
    
    const heroSection = container.querySelector('.bg-gradient-to-r.from-blue-600.to-orange-500');
    expect(heroSection).toBeInTheDocument();
  });

  it('renders with empty quick info array', () => {
    const propsWithEmptyQuickInfo = {
      ...mockProps,
      quickInfo: []
    };
    
    render(<DestinationHero {...propsWithEmptyQuickInfo} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Destination');
    expect(screen.getByText('📍 Test Region, Test Country')).toBeInTheDocument();
  });
});