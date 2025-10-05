import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DestinationSidebar from '../DestinationSidebar';

describe('DestinationSidebar', () => {
  const mockSections = [
    { id: 'overview', name: 'Overview', icon: '🏖️' },
    { id: 'accommodation', name: 'Hotels & Resorts', icon: '🏨' },
    { id: 'attractions', name: 'Attractions', icon: '🎢' },
  ];

  const mockProps = {
    destinationName: 'Test Destination',
    sections: mockSections,
    activeSection: 'overview',
    onSectionChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders destination name in heading', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    expect(screen.getByText('Explore Test Destination')).toBeInTheDocument();
  });

  it('renders all sections as buttons', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    expect(screen.getByRole('button', { name: /🏖️ Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🏨 Hotels & Resorts/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /🎢 Attractions/ })).toBeInTheDocument();
  });

  it('highlights active section', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    const activeButton = screen.getByRole('button', { name: /🏖️ Overview/ });
    expect(activeButton).toHaveClass('bg-orange-500', 'text-white');
  });

  it('applies hover styles to inactive sections', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    const inactiveButton = screen.getByRole('button', { name: /🏨 Hotels & Resorts/ });
    expect(inactiveButton).toHaveClass('text-gray-700', 'hover:bg-orange-50');
    expect(inactiveButton).not.toHaveClass('bg-orange-500', 'text-white');
  });

  it('calls onSectionChange when section button is clicked', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    const attractionsButton = screen.getByRole('button', { name: /🎢 Attractions/ });
    fireEvent.click(attractionsButton);
    
    expect(mockProps.onSectionChange).toHaveBeenCalledWith('attractions');
  });

  it('calls onSectionChange with correct section id for each button', () => {
    render(<DestinationSidebar {...mockProps} />);
    
    const overviewButton = screen.getByRole('button', { name: /🏖️ Overview/ });
    const accommodationButton = screen.getByRole('button', { name: /🏨 Hotels & Resorts/ });
    
    fireEvent.click(overviewButton);
    expect(mockProps.onSectionChange).toHaveBeenCalledWith('overview');
    
    fireEvent.click(accommodationButton);
    expect(mockProps.onSectionChange).toHaveBeenCalledWith('accommodation');
  });

  it('renders with different active section', () => {
    const propsWithDifferentActive = {
      ...mockProps,
      activeSection: 'attractions'
    };
    
    render(<DestinationSidebar {...propsWithDifferentActive} />);
    
    const attractionsButton = screen.getByRole('button', { name: /🎢 Attractions/ });
    const overviewButton = screen.getByRole('button', { name: /🏖️ Overview/ });
    
    expect(attractionsButton).toHaveClass('bg-orange-500', 'text-white');
    expect(overviewButton).toHaveClass('text-gray-700', 'hover:bg-orange-50');
  });

  it('renders with empty sections array', () => {
    const propsWithEmptySections = {
      ...mockProps,
      sections: []
    };
    
    render(<DestinationSidebar {...propsWithEmptySections} />);
    
    expect(screen.getByText('Explore Test Destination')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});