import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import EnquiryConfirmation from '../EnquiryConfirmation';

// Mock dependencies
jest.mock('next/navigation');

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<
  typeof useSearchParams
>;
const mockPush = jest.fn();

// Mock timers
jest.useFakeTimers();

describe('EnquiryConfirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders confirmation message with enquiry ID', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    expect(
      screen.getByText('Enquiry Submitted Successfully!')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Enquiry ID: test-enquiry-123')
    ).toBeInTheDocument();
  });

  it('displays what happens next information', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    expect(screen.getByText('What happens next?')).toBeInTheDocument();
    expect(
      screen.getByText('Our team will review your enquiry within 24 hours')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We'll prepare a detailed quote based on your requirements"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "You'll receive a response directly to your email address"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'We may contact you for additional information if needed'
      )
    ).toBeInTheDocument();
  });

  it('displays important notes', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    expect(screen.getByText('Important Notes:')).toBeInTheDocument();
    expect(
      screen.getByText('• Please keep this enquiry ID for your records')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '• A confirmation email has been sent to your registered email address'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '• For urgent enquiries, contact us directly at info@infinityweekends.co.uk'
      )
    ).toBeInTheDocument();
  });

  it('shows countdown timer', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    expect(
      screen.getByText(/Redirecting to offers page in.*10.*seconds/)
    ).toBeInTheDocument();
  });

  it('updates countdown every second', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    expect(screen.getByText(/10.*seconds/)).toBeInTheDocument();

    // Advance timer by 1 second
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText(/9.*seconds/)).toBeInTheDocument();
    });

    // Advance timer by another second
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByText(/8.*seconds/)).toBeInTheDocument();
    });
  });

  it('redirects to offers page when countdown reaches zero', async () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    // Advance timer by 10 seconds
    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/offers');
    });
  });

  it('redirects to enquiries page when no enquiry ID is provided', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);

    render(<EnquiryConfirmation />);

    expect(mockPush).toHaveBeenCalledWith('/enquiries');
  });

  it('renders nothing when no enquiry ID is provided', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    } as any);

    const { container } = render(<EnquiryConfirmation />);

    expect(container.firstChild).toBeNull();
  });

  it('displays navigation links', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    const viewOffersLink = screen.getByText('View Current Offers');
    const submitAnotherLink = screen.getByText('Submit Another Enquiry');

    expect(viewOffersLink).toBeInTheDocument();
    expect(viewOffersLink.closest('a')).toHaveAttribute('href', '/offers');

    expect(submitAnotherLink).toBeInTheDocument();
    expect(submitAnotherLink.closest('a')).toHaveAttribute(
      'href',
      '/enquiries'
    );
  });

  it('displays contact information', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    const contactLink = screen.getByText('info@infinityweekends.co.uk');
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute(
      'href',
      'mailto:info@infinityweekends.co.uk'
    );
  });

  it('displays success icon', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    // Check for success icon (checkmark SVG)
    const successIcon = screen.getByRole('img', { hidden: true });
    expect(successIcon).toBeInTheDocument();
  });

  it('cleans up timer on unmount', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    const { unmount } = render(<EnquiryConfirmation />);

    // Spy on clearInterval
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('applies custom className', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    const { container } = render(
      <EnquiryConfirmation className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles enquiry ID parameter correctly', () => {
    const mockGet = jest.fn();
    mockUseSearchParams.mockReturnValue({
      get: mockGet,
    } as any);

    mockGet.mockReturnValue('my-enquiry-id-456');

    render(<EnquiryConfirmation />);

    expect(mockGet).toHaveBeenCalledWith('id');
    expect(
      screen.getByText('Enquiry ID: my-enquiry-id-456')
    ).toBeInTheDocument();
  });

  it('displays proper styling classes', () => {
    mockUseSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue('test-enquiry-123'),
    } as any);

    render(<EnquiryConfirmation />);

    // Check for key styling elements
    expect(screen.getByText('Enquiry Submitted Successfully!')).toHaveClass(
      'text-3xl',
      'font-bold',
      'text-gray-900'
    );

    // Check for success styling
    const successSection = screen
      .getByText('Enquiry ID: test-enquiry-123')
      .closest('div');
    expect(successSection).toHaveClass(
      'border-l-4',
      'border-green-400',
      'bg-green-50'
    );
  });
});
