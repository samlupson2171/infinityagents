import { render, screen, fireEvent } from '@testing-library/react';
import OfferDetails from '../OfferDetails';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockOffer = {
  _id: 'offer1',
  title: 'Summer Special Package',
  description:
    'Amazing summer deals for travel agencies with exclusive benefits and great value for money.\n\nPerfect for your clients looking for memorable experiences during the summer season.',
  inclusions: [
    'Accommodation for 7 nights',
    'Daily breakfast',
    'Airport transfers',
    'Welcome drink',
    'City tour guide',
    'Free WiFi',
    'Spa access',
    'Beach activities',
  ],
  isActive: true,
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-20T14:45:00Z'),
  createdBy: {
    _id: 'admin1',
    name: 'Admin User',
  },
};

describe('OfferDetails', () => {
  it('renders when isOpen is true', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText("What's Included")).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={false} onClose={jest.fn()} />
    );

    expect(
      screen.queryByText('Summer Special Package')
    ).not.toBeInTheDocument();
  });

  it('displays offer information correctly', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    expect(
      screen.getByText(/Added 15 January 2024.*10:30 by Admin User/)
    ).toBeInTheDocument();
    expect(screen.getByText('Active Offer')).toBeInTheDocument();
  });

  it('displays full description with line breaks', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    const description = screen.getByText(
      /Amazing summer deals for travel agencies/
    );
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('whitespace-pre-wrap');
  });

  it('displays all inclusions in grid layout', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    mockOffer.inclusions.forEach((inclusion) => {
      expect(screen.getByText(inclusion)).toBeInTheDocument();
    });

    // Check that inclusions are in a grid container
    const inclusionsContainer = screen
      .getByText('Accommodation for 7 nights')
      .closest('.grid');
    expect(inclusionsContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2');
  });

  it('displays metadata information correctly', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();
    expect(screen.getByText('Created By')).toBeInTheDocument();
    expect(screen.getByText('Total Inclusions')).toBeInTheDocument();

    expect(screen.getByText(/15 January 2024.*10:30/)).toBeInTheDocument();
    expect(screen.getByText(/20 January 2024.*14:45/)).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('8 items')).toBeInTheDocument();
  });

  it('handles offer without creator', () => {
    const offerWithoutCreator = {
      ...mockOffer,
      createdBy: undefined,
    };

    render(
      <OfferDetails
        offer={offerWithoutCreator}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(
      screen.getByText(/Added 15 January 2024.*10:30$/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Created By')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={mockOnClose} />
    );

    // Find the X button (SVG close icon)
    const xButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(xButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('copies offer details to clipboard when Copy Details is clicked', async () => {
    const mockWriteText = jest.fn();
    (navigator.clipboard.writeText as jest.Mock) = mockWriteText;

    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    const copyButton = screen.getByText('Copy Details');
    fireEvent.click(copyButton);

    const expectedText = `Summer Special Package

Amazing summer deals for travel agencies with exclusive benefits and great value for money.

Perfect for your clients looking for memorable experiences during the summer season.

Inclusions:
• Accommodation for 7 nights
• Daily breakfast
• Airport transfers
• Welcome drink
• City tour guide
• Free WiFi
• Spa access
• Beach activities`;

    expect(mockWriteText).toHaveBeenCalledWith(expectedText);
  });

  it('formats dates with time correctly', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    // Check that dates include time
    expect(screen.getByText(/15 January 2024.*10:30/)).toBeInTheDocument();
    expect(screen.getByText(/20 January 2024.*14:45/)).toBeInTheDocument();
  });

  it('handles singular inclusion count', () => {
    const singleInclusionOffer = {
      ...mockOffer,
      inclusions: ['Accommodation only'],
    };

    render(
      <OfferDetails
        offer={singleInclusionOffer}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('has proper modal structure and styling', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    // Check for modal backdrop
    const backdrop = screen
      .getByText('Summer Special Package')
      .closest('.fixed');
    expect(backdrop).toHaveClass(
      'inset-0',
      'bg-gray-600',
      'bg-opacity-50',
      'z-50'
    );

    // Check for modal content container
    const modalContent = screen
      .getByText('Summer Special Package')
      .closest('.relative');
    expect(modalContent).toHaveClass(
      'top-20',
      'mx-auto',
      'max-w-2xl',
      'shadow-lg',
      'rounded-md',
      'bg-white'
    );
  });

  it('displays status badge correctly', () => {
    render(
      <OfferDetails offer={mockOffer} isOpen={true} onClose={jest.fn()} />
    );

    const statusBadge = screen.getByText('Active Offer');
    expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
  });
});
