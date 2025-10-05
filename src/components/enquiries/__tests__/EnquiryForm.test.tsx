import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EnquiryForm from '../EnquiryForm';

// Mock dependencies
jest.mock('next-auth/react');
jest.mock('next/navigation');

// Mock fetch
global.fetch = jest.fn();

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

describe('EnquiryForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
    } as any);

    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'agent@test.com',
          name: 'Test Agent',
        },
      },
      status: 'authenticated',
    } as any);

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { enquiryId: 'test-enquiry-id' },
      }),
    });
  });

  it('renders form with all required fields', () => {
    render(<EnquiryForm />);

    expect(screen.getByText('Submit New Enquiry')).toBeInTheDocument();
    expect(screen.getByLabelText('Lead Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Trip Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Resort/Destination *')).toBeInTheDocument();
    expect(screen.getByLabelText('Travel Date *')).toBeInTheDocument();
    expect(screen.getByLabelText('Departure Airport *')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Nights *')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Guests *')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Budget per Person (£) *')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Accommodation Type *')).toBeInTheDocument();
    expect(screen.getByLabelText('Board Type *')).toBeInTheDocument();
  });

  it('displays agent email from session', () => {
    render(<EnquiryForm />);

    expect(screen.getByText('Agent Email: agent@test.com')).toBeInTheDocument();
  });

  it('updates form fields when user types', () => {
    render(<EnquiryForm />);

    const leadNameInput = screen.getByLabelText('Lead Name *');
    fireEvent.change(leadNameInput, { target: { value: 'John Smith' } });

    expect(leadNameInput).toHaveValue('John Smith');
  });

  it('updates number fields correctly', () => {
    render(<EnquiryForm />);

    const guestsInput = screen.getByLabelText('Number of Guests *');
    fireEvent.change(guestsInput, { target: { value: '15' } });

    expect(guestsInput).toHaveValue(15);
  });

  it('calculates total budget correctly', () => {
    render(<EnquiryForm />);

    const guestsInput = screen.getByLabelText('Number of Guests *');
    const budgetInput = screen.getByLabelText('Budget per Person (£) *');

    fireEvent.change(guestsInput, { target: { value: '12' } });
    fireEvent.change(budgetInput, { target: { value: '600' } });

    expect(screen.getByText('Total budget: £7,200')).toBeInTheDocument();
    expect(screen.getByText('Total Budget: £7,200')).toBeInTheDocument();
  });

  it('handles event selection correctly', () => {
    render(<EnquiryForm />);

    const boatPartyCheckbox = screen.getByLabelText('Boat Party');
    const clubEntryCheckbox = screen.getByLabelText('Club Entry');

    fireEvent.click(boatPartyCheckbox);
    fireEvent.click(clubEntryCheckbox);

    expect(boatPartyCheckbox).toBeChecked();
    expect(clubEntryCheckbox).toBeChecked();
    expect(
      screen.getByText('Selected events: Boat Party, Club Entry')
    ).toBeInTheDocument();
  });

  it('can deselect events', () => {
    render(<EnquiryForm />);

    const boatPartyCheckbox = screen.getByLabelText('Boat Party');

    // Select then deselect
    fireEvent.click(boatPartyCheckbox);
    expect(boatPartyCheckbox).toBeChecked();

    fireEvent.click(boatPartyCheckbox);
    expect(boatPartyCheckbox).not.toBeChecked();
  });

  it('updates enquiry summary as form is filled', () => {
    render(<EnquiryForm />);

    const leadNameInput = screen.getByLabelText('Lead Name *');
    const resortInput = screen.getByLabelText('Resort/Destination *');

    fireEvent.change(leadNameInput, { target: { value: 'John Smith' } });
    fireEvent.change(resortInput, { target: { value: 'Ibiza' } });

    expect(screen.getByText('Lead: John Smith')).toBeInTheDocument();
    expect(screen.getByText('Destination: Ibiza')).toBeInTheDocument();
  });

  it('submits form successfully', async () => {
    render(<EnquiryForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Lead Name *'), {
      target: { value: 'John Smith' },
    });
    fireEvent.change(screen.getByLabelText('Resort/Destination *'), {
      target: { value: 'Ibiza' },
    });
    fireEvent.change(screen.getByLabelText('Travel Date *'), {
      target: { value: '2024-06-15' },
    });
    fireEvent.change(screen.getByLabelText('Departure Airport *'), {
      target: { value: 'London Heathrow' },
    });
    fireEvent.change(screen.getByLabelText('Board Type *'), {
      target: { value: 'Half Board' },
    });

    const submitButton = screen.getByText('Submit Enquiry');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadName: 'John Smith',
          tripType: 'stag',
          resort: 'Ibiza',
          travelDate: '2024-06-15',
          departureAirport: 'London Heathrow',
          numberOfNights: 3,
          numberOfGuests: 10,
          eventsRequested: [],
          accommodationType: 'hotel',
          boardType: 'Half Board',
          budgetPerPerson: 500,
        }),
      });
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/enquiries/confirmation?id=test-enquiry-id'
    );
  });

  it('shows loading state during submission', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<EnquiryForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Lead Name *'), {
      target: { value: 'John Smith' },
    });
    fireEvent.change(screen.getByLabelText('Resort/Destination *'), {
      target: { value: 'Ibiza' },
    });
    fireEvent.change(screen.getByLabelText('Travel Date *'), {
      target: { value: '2024-06-15' },
    });
    fireEvent.change(screen.getByLabelText('Departure Airport *'), {
      target: { value: 'London Heathrow' },
    });
    fireEvent.change(screen.getByLabelText('Board Type *'), {
      target: { value: 'Half Board' },
    });

    const submitButton = screen.getByText('Submit Enquiry');
    fireEvent.click(submitButton);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('displays error message on submission failure', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Validation failed' },
      }),
    });

    render(<EnquiryForm />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Lead Name *'), {
      target: { value: 'John Smith' },
    });
    fireEvent.change(screen.getByLabelText('Resort/Destination *'), {
      target: { value: 'Ibiza' },
    });
    fireEvent.change(screen.getByLabelText('Travel Date *'), {
      target: { value: '2024-06-15' },
    });
    fireEvent.change(screen.getByLabelText('Departure Airport *'), {
      target: { value: 'London Heathrow' },
    });
    fireEvent.change(screen.getByLabelText('Board Type *'), {
      target: { value: 'Half Board' },
    });

    const submitButton = screen.getByText('Submit Enquiry');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });
  });

  it('sets minimum date to tomorrow', () => {
    render(<EnquiryForm />);

    const travelDateInput = screen.getByLabelText('Travel Date *');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expectedMin = tomorrow.toISOString().split('T')[0];

    expect(travelDateInput).toHaveAttribute('min', expectedMin);
  });

  it('validates number field ranges', () => {
    render(<EnquiryForm />);

    const nightsInput = screen.getByLabelText('Number of Nights *');
    const guestsInput = screen.getByLabelText('Number of Guests *');
    const budgetInput = screen.getByLabelText('Budget per Person (£) *');

    expect(nightsInput).toHaveAttribute('min', '1');
    expect(nightsInput).toHaveAttribute('max', '30');
    expect(guestsInput).toHaveAttribute('min', '1');
    expect(guestsInput).toHaveAttribute('max', '50');
    expect(budgetInput).toHaveAttribute('min', '0');
    expect(budgetInput).toHaveAttribute('max', '10000');
  });

  it('displays all event options', () => {
    render(<EnquiryForm />);

    const expectedEvents = [
      'Boat Party',
      'Club Entry',
      'Bar Crawl',
      'Beach Activities',
      'Water Sports',
      'Go Karting',
      'Paintball',
      'Quad Biking',
      'Spa Treatment',
      'Restaurant Booking',
      'Private Transfer',
      'Airport Meet & Greet',
    ];

    expectedEvents.forEach((event) => {
      expect(screen.getByLabelText(event)).toBeInTheDocument();
    });
  });

  it('displays all board type options', () => {
    render(<EnquiryForm />);

    const boardTypeSelect = screen.getByLabelText('Board Type *');

    expect(screen.getByText('Room Only')).toBeInTheDocument();
    expect(screen.getByText('Bed & Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Half Board')).toBeInTheDocument();
    expect(screen.getByText('Full Board')).toBeInTheDocument();
    expect(screen.getByText('All Inclusive')).toBeInTheDocument();
  });

  it('formats trip type display correctly in summary', () => {
    render(<EnquiryForm />);

    // Default is 'stag'
    expect(screen.getByText('Trip Type: Stag Do')).toBeInTheDocument();

    // Change to 'hen'
    const tripTypeSelect = screen.getByLabelText('Trip Type *');
    fireEvent.change(tripTypeSelect, { target: { value: 'hen' } });
    expect(screen.getByText('Trip Type: Hen Do')).toBeInTheDocument();

    // Change to 'other'
    fireEvent.change(tripTypeSelect, { target: { value: 'other' } });
    expect(screen.getByText('Trip Type: Other')).toBeInTheDocument();
  });

  it('handles session without user email', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<EnquiryForm />);

    expect(screen.queryByText(/Agent Email:/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EnquiryForm className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
