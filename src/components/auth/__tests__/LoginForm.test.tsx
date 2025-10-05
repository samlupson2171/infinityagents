import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoginForm from '../LoginForm';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  getSession: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

describe('LoginForm', () => {
  const mockPush = vi.fn();
  const mockSignIn = vi.mocked(signIn);
  const mockGetSession = vi.mocked(getSession);
  const mockUseRouter = vi.mocked(useRouter);

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render login form with all required fields', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    render(<LoginForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please provide a valid email address/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email format', async () => {
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please provide a valid email address/i)
      ).toBeInTheDocument();
    });
  });

  it('should successfully submit form with valid credentials', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    mockGetSession.mockResolvedValue({});

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });

    expect(mockGetSession).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should handle invalid credentials error', async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: 'CredentialsSignin',
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should handle pending approval error', async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error:
        'Your account is pending approval. Please wait for admin approval.',
    });

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/your account is pending approval/i)
      ).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should show loading state during submission', async () => {
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should disable form fields during submission', async () => {
    mockSignIn.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it('should call onSuccess callback when provided', async () => {
    const mockOnSuccess = vi.fn();
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    mockGetSession.mockResolvedValue({});

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should redirect to custom redirectTo path', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    mockGetSession.mockResolvedValue({});

    render(<LoginForm redirectTo="/custom-path" />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-path');
    });
  });

  it('should handle unexpected errors gracefully', async () => {
    mockSignIn.mockRejectedValue(new Error('Network error'));

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/an unexpected error occurred/i)
      ).toBeInTheDocument();
    });
  });

  it('should transform email to lowercase', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    mockGetSession.mockResolvedValue({});

    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'TEST@EXAMPLE.COM' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });
  });
});
