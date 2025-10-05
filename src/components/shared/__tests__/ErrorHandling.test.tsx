import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';
import { Toast } from '../Toast';
import { LoadingSpinner } from '../LoadingSpinner';
import { ProgressBar } from '../ProgressBar';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Test component that uses error handler hook
const ErrorHandlerTestComponent = () => {
  const { error, handleError, clearError } = useErrorHandler();

  return (
    <div>
      {error && <div data-testid="error-message">{error.message}</div>}
      <button onClick={() => handleError(new Error('Test error'))}>
        Trigger Error
      </button>
      <button onClick={clearError}>Clear Error</button>
    </div>
  );
};

describe('Error Handling Components', () => {
  describe('ErrorBoundary', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should reset error state when Try Again is clicked', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(true);

        return (
          <div>
            <button onClick={() => setShouldThrow(false)}>Fix Error</button>
            <ErrorBoundary>
              <ThrowError shouldThrow={shouldThrow} />
            </ErrorBoundary>
          </div>
        );
      };

      render(<TestComponent />);

      // Error should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Fix the error condition
      await user.click(screen.getByText('Fix Error'));

      // Click Try Again
      await user.click(screen.getByText('Try Again'));

      // Should show the fixed component
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should display custom error message when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error message</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should handle errors in event handlers', async () => {
      const user = userEvent.setup();

      const ComponentWithEventError = () => {
        const handleClick = () => {
          throw new Error('Event handler error');
        };

        return <button onClick={handleClick}>Click me</button>;
      };

      render(
        <ErrorBoundary>
          <ComponentWithEventError />
        </ErrorBoundary>
      );

      // Event handler errors are not caught by error boundaries
      // This should not trigger the error boundary
      await expect(async () => {
        await user.click(screen.getByText('Click me'));
      }).rejects.toThrow('Event handler error');

      // Error boundary should not be triggered
      expect(
        screen.queryByText('Something went wrong')
      ).not.toBeInTheDocument();
    });

    it('should handle nested error boundaries', () => {
      const InnerComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) {
          throw new Error('Inner error');
        }
        return <div>Inner component</div>;
      };

      render(
        <ErrorBoundary fallback={<div>Outer error boundary</div>}>
          <div>
            <ErrorBoundary fallback={<div>Inner error boundary</div>}>
              <InnerComponent shouldThrow={true} />
            </ErrorBoundary>
          </div>
        </ErrorBoundary>
      );

      // Inner error boundary should catch the error
      expect(screen.getByText('Inner error boundary')).toBeInTheDocument();
      expect(
        screen.queryByText('Outer error boundary')
      ).not.toBeInTheDocument();
    });
  });

  describe('Toast Component', () => {
    it('should render success toast', () => {
      render(
        <Toast type="success" message="Operation successful" isVisible={true} />
      );

      expect(screen.getByText('Operation successful')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-green-50');
    });

    it('should render error toast', () => {
      render(
        <Toast type="error" message="Operation failed" isVisible={true} />
      );

      expect(screen.getByText('Operation failed')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-red-50');
    });

    it('should render warning toast', () => {
      render(
        <Toast type="warning" message="Warning message" isVisible={true} />
      );

      expect(screen.getByText('Warning message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-yellow-50');
    });

    it('should render info toast', () => {
      render(<Toast type="info" message="Info message" isVisible={true} />);

      expect(screen.getByText('Info message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveClass('bg-blue-50');
    });

    it('should not render when not visible', () => {
      render(
        <Toast type="success" message="Hidden message" isVisible={false} />
      );

      expect(screen.queryByText('Hidden message')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Toast
          type="success"
          message="Closeable message"
          isVisible={true}
          onClose={onClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should auto-hide after duration', async () => {
      const onClose = vi.fn();

      render(
        <Toast
          type="success"
          message="Auto-hide message"
          isVisible={true}
          onClose={onClose}
          duration={100}
        />
      );

      await waitFor(
        () => {
          expect(onClose).toHaveBeenCalledOnce();
        },
        { timeout: 200 }
      );
    });

    it('should not auto-hide when duration is 0', async () => {
      const onClose = vi.fn();

      render(
        <Toast
          type="success"
          message="Persistent message"
          isVisible={true}
          onClose={onClose}
          duration={0}
        />
      );

      // Wait a bit to ensure it doesn't auto-hide
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should display custom title', () => {
      render(
        <Toast
          type="error"
          title="Custom Title"
          message="Error message"
          isVisible={true}
        />
      );

      expect(screen.getByText('Custom Title')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should handle long messages', () => {
      const longMessage = 'A'.repeat(500);

      render(<Toast type="info" message={longMessage} isVisible={true} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle HTML in messages safely', () => {
      const htmlMessage = '<script>alert("xss")</script>Safe message';

      render(<Toast type="warning" message={htmlMessage} isVisible={true} />);

      // Should render as text, not execute HTML
      expect(screen.getByText(htmlMessage)).toBeInTheDocument();
    });
  });

  describe('LoadingSpinner Component', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render with custom message', () => {
      render(<LoadingSpinner message="Processing data..." />);

      expect(screen.getByText('Processing data...')).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      render(<LoadingSpinner size="large" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-12', 'h-12');
    });

    it('should render small size', () => {
      render(<LoadingSpinner size="small" />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('should render without message when showMessage is false', () => {
      render(<LoadingSpinner showMessage={false} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<LoadingSpinner />);

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render with custom className', () => {
      render(<LoadingSpinner className="custom-class" />);

      const container = screen.getByRole('status').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('ProgressBar Component', () => {
    it('should render with progress value', () => {
      render(<ProgressBar value={50} max={100} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should display percentage', () => {
      render(<ProgressBar value={75} max={100} showPercentage={true} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should handle custom label', () => {
      render(<ProgressBar value={30} max={100} label="Upload progress" />);

      expect(screen.getByText('Upload progress')).toBeInTheDocument();
    });

    it('should handle zero progress', () => {
      render(<ProgressBar value={0} max={100} showPercentage={true} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should handle complete progress', () => {
      render(<ProgressBar value={100} max={100} showPercentage={true} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle progress over maximum', () => {
      render(<ProgressBar value={150} max={100} showPercentage={true} />);

      // Should cap at 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle different color variants', () => {
      const { rerender } = render(
        <ProgressBar value={50} max={100} variant="success" />
      );

      let progressBar = screen
        .getByRole('progressbar')
        .querySelector('[style*="width"]');
      expect(progressBar).toHaveClass('bg-green-500');

      rerender(<ProgressBar value={50} max={100} variant="warning" />);
      progressBar = screen
        .getByRole('progressbar')
        .querySelector('[style*="width"]');
      expect(progressBar).toHaveClass('bg-yellow-500');

      rerender(<ProgressBar value={50} max={100} variant="error" />);
      progressBar = screen
        .getByRole('progressbar')
        .querySelector('[style*="width"]');
      expect(progressBar).toHaveClass('bg-red-500');
    });

    it('should animate progress changes', () => {
      const { rerender } = render(
        <ProgressBar value={25} max={100} animated={true} />
      );

      const progressBar = screen
        .getByRole('progressbar')
        .querySelector('[style*="width"]');
      expect(progressBar).toHaveClass('transition-all');

      rerender(<ProgressBar value={75} max={100} animated={true} />);

      // Progress should update
      expect(progressBar).toHaveStyle('width: 75%');
    });

    it('should handle indeterminate state', () => {
      render(<ProgressBar indeterminate={true} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('useErrorHandler Hook', () => {
    it('should initialize with no error', () => {
      render(<ErrorHandlerTestComponent />);

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should handle error when triggered', async () => {
      const user = userEvent.setup();
      render(<ErrorHandlerTestComponent />);

      await user.click(screen.getByText('Trigger Error'));

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Test error'
      );
    });

    it('should clear error when clearError is called', async () => {
      const user = userEvent.setup();
      render(<ErrorHandlerTestComponent />);

      await user.click(screen.getByText('Trigger Error'));
      expect(screen.getByTestId('error-message')).toBeInTheDocument();

      await user.click(screen.getByText('Clear Error'));
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });

    it('should handle different error types', async () => {
      const user = userEvent.setup();

      const MultiErrorComponent = () => {
        const { error, handleError, clearError } = useErrorHandler();

        return (
          <div>
            {error && <div data-testid="error-message">{error.message}</div>}
            <button onClick={() => handleError(new Error('Standard error'))}>
              Standard Error
            </button>
            <button onClick={() => handleError(new TypeError('Type error'))}>
              Type Error
            </button>
            <button onClick={() => handleError('String error')}>
              String Error
            </button>
            <button onClick={clearError}>Clear Error</button>
          </div>
        );
      };

      render(<MultiErrorComponent />);

      // Test standard Error
      await user.click(screen.getByText('Standard Error'));
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Standard error'
      );

      await user.click(screen.getByText('Clear Error'));

      // Test TypeError
      await user.click(screen.getByText('Type Error'));
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'Type error'
      );

      await user.click(screen.getByText('Clear Error'));

      // Test string error
      await user.click(screen.getByText('String Error'));
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'String error'
      );
    });

    it('should handle async errors', async () => {
      const user = userEvent.setup();

      const AsyncErrorComponent = () => {
        const { error, handleError, clearError } = useErrorHandler();

        const handleAsyncError = async () => {
          try {
            await new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Async error')), 10)
            );
          } catch (err) {
            handleError(err);
          }
        };

        return (
          <div>
            {error && <div data-testid="error-message">{error.message}</div>}
            <button onClick={handleAsyncError}>Trigger Async Error</button>
            <button onClick={clearError}>Clear Error</button>
          </div>
        );
      };

      render(<AsyncErrorComponent />);

      await user.click(screen.getByText('Trigger Async Error'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(
          'Async error'
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work together in error scenarios', async () => {
      const user = userEvent.setup();

      const IntegratedComponent = () => {
        const { error, handleError, clearError } = useErrorHandler();
        const [loading, setLoading] = React.useState(false);
        const [progress, setProgress] = React.useState(0);

        const simulateOperation = async () => {
          setLoading(true);
          setProgress(0);

          try {
            for (let i = 0; i <= 100; i += 10) {
              setProgress(i);
              await new Promise((resolve) => setTimeout(resolve, 10));

              if (i === 50) {
                throw new Error('Operation failed at 50%');
              }
            }
          } catch (err) {
            handleError(err);
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button onClick={simulateOperation}>Start Operation</button>
            <button onClick={clearError}>Clear Error</button>

            {loading && <LoadingSpinner message="Processing..." />}
            {progress > 0 && (
              <ProgressBar value={progress} max={100} showPercentage />
            )}

            <Toast
              type="error"
              message={error?.message || ''}
              isVisible={!!error}
              onClose={clearError}
            />
          </div>
        );
      };

      render(<IntegratedComponent />);

      await user.click(screen.getByText('Start Operation'));

      // Should show loading
      expect(screen.getByText('Processing...')).toBeInTheDocument();

      // Should show progress
      await waitFor(() => {
        expect(screen.getByText(/\d+%/)).toBeInTheDocument();
      });

      // Should show error toast when operation fails
      await waitFor(() => {
        expect(screen.getByText('Operation failed at 50%')).toBeInTheDocument();
      });

      // Should clear error when toast is closed
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(
        screen.queryByText('Operation failed at 50%')
      ).not.toBeInTheDocument();
    });
  });
});
