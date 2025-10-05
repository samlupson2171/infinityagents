import { render, screen, fireEvent } from '@testing-library/react';
import OfferCard from '../OfferCard';

const mockOffer = {
  _id: 'offer1',
  title: 'Summer Special Package',
  description:
    'Amazing summer deals for travel agencies with exclusive benefits and great value for money. Perfect for your clients looking for memorable experiences.',
  inclusions: [
    'Accommodation for 7 nights',
    'Daily breakfast',
    'Airport transfers',
    'Welcome drink',
    'City tour guide',
    'Free WiFi',
  ],
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
  createdBy: {
    _id: 'admin1',
    name: 'Admin User',
  },
};

describe('OfferCard', () => {
  it('renders offer information correctly', () => {
    render(<OfferCard offer={mockOffer} />);

    expect(screen.getByText('Summer Special Package')).toBeInTheDocument();
    expect(
      screen.getByText(/Added 15 January 2024 by Admin User/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Amazing summer deals for travel agencies/)
    ).toBeInTheDocument();
    expect(screen.getByText('Active Offer')).toBeInTheDocument();
  });

  it('truncates long descriptions', () => {
    const longDescriptionOffer = {
      ...mockOffer,
      description:
        'This is a very long description that should be truncated after 150 characters to ensure the card layout remains consistent and readable for users browsing through multiple offers.',
    };

    render(<OfferCard offer={longDescriptionOffer} />);

    expect(
      screen.getByText(
        /This is a very long description that should be truncated after 150 characters to ensure the card layout remains consistent and/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });

  it('displays first 4 inclusions and shows count for remaining', () => {
    render(<OfferCard offer={mockOffer} />);

    // Should show first 4 inclusions
    expect(screen.getByText('Accommodation for 7 nights')).toBeInTheDocument();
    expect(screen.getByText('Daily breakfast')).toBeInTheDocument();
    expect(screen.getByText('Airport transfers')).toBeInTheDocument();
    expect(screen.getByText('Welcome drink')).toBeInTheDocument();

    // Should show count for remaining inclusions
    expect(screen.getByText('+2 more inclusions')).toBeInTheDocument();

    // Should not show the 5th and 6th inclusions
    expect(screen.queryByText('City tour guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Free WiFi')).not.toBeInTheDocument();
  });

  it('displays all inclusions when there are 4 or fewer', () => {
    const shortInclusionsOffer = {
      ...mockOffer,
      inclusions: ['Accommodation', 'Breakfast', 'Transfer'],
    };

    render(<OfferCard offer={shortInclusionsOffer} />);

    expect(screen.getByText('Accommodation')).toBeInTheDocument();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.queryByText(/more inclusion/)).not.toBeInTheDocument();
  });

  it('calls onViewDetails when View Details button is clicked', () => {
    const mockOnViewDetails = jest.fn();
    render(<OfferCard offer={mockOffer} onViewDetails={mockOnViewDetails} />);

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockOffer);
  });

  it('does not show View Details button when onViewDetails is not provided', () => {
    render(<OfferCard offer={mockOffer} />);

    expect(screen.queryByText('View Details')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<OfferCard offer={mockOffer} />);

    expect(screen.getByText(/Added 15 January 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Updated 20 January 2024/)).toBeInTheDocument();
  });

  it('handles offer without creator', () => {
    const offerWithoutCreator = {
      ...mockOffer,
      createdBy: undefined,
    };

    render(<OfferCard offer={offerWithoutCreator} />);

    expect(screen.getByText(/Added 15 January 2024$/)).toBeInTheDocument();
    expect(screen.queryByText(/by Admin User/)).not.toBeInTheDocument();
  });

  it('displays correct inclusion count', () => {
    render(<OfferCard offer={mockOffer} />);

    expect(screen.getByText('6 inclusions')).toBeInTheDocument();
  });

  it('handles singular inclusion count', () => {
    const singleInclusionOffer = {
      ...mockOffer,
      inclusions: ['Accommodation only'],
    };

    render(<OfferCard offer={singleInclusionOffer} />);

    expect(screen.getByText('1 inclusion')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <OfferCard offer={mockOffer} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    const mockOnViewDetails = jest.fn();
    render(<OfferCard offer={mockOffer} onViewDetails={mockOnViewDetails} />);

    const viewDetailsButton = screen.getByText('View Details');
    expect(viewDetailsButton).toHaveAttribute('type', 'button');
  });
});
