import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivitiesUpload from '../ActivitiesUpload';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

describe('ActivitiesUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should render upload interface correctly', () => {
    render(<ActivitiesUpload />);

    expect(screen.getByText('Activities CSV Upload')).toBeInTheDocument();
    expect(
      screen.getByText('Upload activities in bulk using CSV files')
    ).toBeInTheDocument();
    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    expect(screen.getByText('Download Sample CSV')).toBeInTheDocument();
  });

  it('should show file details when file is selected', async () => {
    const user = userEvent.setup();
    render(<ActivitiesUpload />);

    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);

    expect(screen.getByText('test.csv')).toBeInTheDocument();
    expect(screen.getByText('Upload Activities')).toBeInTheDocument();
    expect(screen.getByText('Choose Different File')).toBeInTheDocument();
  });

  it('should handle successful upload', async () => {
    const user = userEvent.setup();
    const mockOnUploadComplete = vi.fn();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          summary: {
            totalRows: 5,
            validRows: 4,
            errorRows: 1,
            created: 3,
            updated: 1,
          },
          errors: [
            {
              line: 3,
              field: 'name',
              value: '',
              message: 'Name is required',
            },
          ],
        },
      }),
    });

    render(<ActivitiesUpload onUploadComplete={mockOnUploadComplete} />);

    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByText('Upload Activities'));

    await waitFor(() => {
      expect(screen.getByText('Upload Successful!')).toBeInTheDocument();
    });

    expect(screen.getByText('5')).toBeInTheDocument(); // Total rows
    expect(screen.getByText('4')).toBeInTheDocument(); // Valid rows
    expect(screen.getByText('3')).toBeInTheDocument(); // Created
    expect(screen.getByText('1')).toBeInTheDocument(); // Updated/Error rows
    expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
    expect(screen.getByText(/Line 3:.*Name is required/)).toBeInTheDocument();

    expect(mockOnUploadComplete).toHaveBeenCalledOnce();
  });

  it('should handle upload failure', async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSV validation failed',
        },
        data: {
          summary: {
            totalRows: 1,
            validRows: 0,
            errorRows: 1,
            created: 0,
            updated: 0,
          },
          errors: [
            {
              line: 1,
              field: 'headers',
              value: '',
              message: 'Missing required headers',
            },
          ],
        },
      }),
    });

    render(<ActivitiesUpload />);

    const file = new File(['invalid,headers'], 'invalid.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByText('Upload Activities'));

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    });

    expect(screen.getByText('CSV validation failed')).toBeInTheDocument();
    expect(screen.getByText('Validation Errors:')).toBeInTheDocument();
    expect(
      screen.getByText(/Line 1:.*Missing required headers/)
    ).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ActivitiesUpload />);

    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByText('Upload Activities'));

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Failed to upload file. Please check your connection and try again.'
      )
    ).toBeInTheDocument();
  });

  it('should show loading state during upload', async () => {
    const user = userEvent.setup();

    // Mock a delayed response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  data: {
                    summary: {
                      totalRows: 1,
                      validRows: 1,
                      errorRows: 0,
                      created: 1,
                      updated: 0,
                    },
                  },
                }),
              }),
            100
          )
        )
    );

    render(<ActivitiesUpload />);

    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByText('Upload Activities'));

    expect(screen.getByText('Uploading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Upload Successful!')).toBeInTheDocument();
    });
  });

  it('should reset file selection', async () => {
    const user = userEvent.setup();
    render(<ActivitiesUpload />);

    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });
    const input = screen.getByRole('textbox', {
      hidden: true,
    }) as HTMLInputElement;

    await user.upload(input, file);
    expect(screen.getByText('test.csv')).toBeInTheDocument();

    await user.click(screen.getByText('Choose Different File'));

    expect(screen.getByText('Drop your CSV file here')).toBeInTheDocument();
    expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
  });

  it('should handle drag and drop', async () => {
    render(<ActivitiesUpload />);

    const dropZone = screen.getByText('Drop your CSV file here').closest('div');
    const file = new File(['test,csv,content'], 'test.csv', {
      type: 'text/csv',
    });

    // Simulate drag over
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    // Simulate drop
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText('test.csv')).toBeInTheDocument();
  });

  it('should reject non-CSV files in drag and drop', async () => {
    render(<ActivitiesUpload />);

    const dropZone = screen.getByText('Drop your CSV file here').closest('div');
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    expect(screen.getByText('Please select a CSV file')).toBeInTheDocument();
  });

  it('should download sample CSV', async () => {
    const user = userEvent.setup();

    // Mock URL.createObjectURL and related methods
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
    });

    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<ActivitiesUpload />);

    await user.click(screen.getByText('Download Sample CSV'));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('sample-activities.csv');
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should display CSV format requirements', () => {
    render(<ActivitiesUpload />);

    expect(screen.getByText('CSV Format Requirements')).toBeInTheDocument();
    expect(screen.getByText('Required Headers:')).toBeInTheDocument();
    expect(screen.getByText(/name.*Activity name/)).toBeInTheDocument();
    expect(screen.getByText(/category.*excursion, show/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Activities with the same name and location will be updated/
      )
    ).toBeInTheDocument();
  });
});
