import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import RegisterForm from '../RegisterForm';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

describe('RegisterForm', () => {
  beforeEach(() => {
    (useRouter as any).mockReturnValue(mockRouter);
    (fetch as any).mockClear();
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^company \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/consortia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/abta\/pts number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /register/i })
    ).toBeInTheDocument();
  });

  it('enables submit button when form is valid', async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    // Fill out all fields with valid data
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(
      screen.getByLabelText(/company name/i),
      'Test Travel Agency'
    );
    await user.type(
      screen.getByLabelText(/^company \*/i),
      'Test Travel Agency'
    );
    await user.type(
      screen.getByLabelText(/consortia/i),
      'Test Consortia'
    );
    await user.type(screen.getByLabelText(/abta\/pts number/i), 'ABTA12345');
    await user.type(
      screen.getByLabelText(/contact email/i),
      'john@example.com'
    );
    await user.type(
      screen.getByLabelText(/website address/i),
      'https://www.example.com'
    );
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /register/i });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('submits form with valid data and redirects on success', async () => {
    const user = userEvent.setup();

    (fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        data: {
          message: 'Registration successful',
          user: {
            id: '123',
            name: 'John Doe',
            companyName: 'Test Travel Agency',
            company: 'Test Travel Agency',
            consortia: 'Test Consortia',
            contactEmail: 'john@example.com',
            abtaPtsNumber: 'ABTA12345',
            websiteAddress: 'https://www.example.com',
            isApproved: false,
            role: 'agent',
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        },
      }),
    });

    render(<RegisterForm />);

    // Fill out form
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(
      screen.getByLabelText(/company name/i),
      'Test Travel Agency'
    );
    await user.type(
      screen.getByLabelText(/^company \*/i),
      'Test Travel Agency'
    );
    await user.type(
      screen.getByLabelText(/consortia/i),
      'Test Consortia'
    );
    await user.type(screen.getByLabelText(/abta\/pts number/i), 'ABTA12345');
    await user.type(
      screen.getByLabelText(/contact email/i),
      'john@example.com'
    );
    await user.type(
      screen.getByLabelText(/website address/i),
      'https://www.example.com'
    );
    await user.type(screen.getByLabelText(/^password/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /register/i });
    await user.click(submitButton);

    // Check that fetch was called with correct data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'John Doe',
          companyName: 'Test Travel Agency',
          company: 'Test Travel Agency',
          abtaPtsNumber: 'ABTA12345',
          contactEmail: 'john@example.com',
          websiteAddress: 'https://www.example.com',
          password: 'password123',
          consortia: 'Test Consortia',
        }),
      });
    });

    // Check that router.push was called
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/register/confirmation');
    });
  });

  it('includes link to login page', () => {
    render(<RegisterForm />);

    const loginLink = screen.getByRole('link', { name: /sign in here/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/auth/login');
  });
});