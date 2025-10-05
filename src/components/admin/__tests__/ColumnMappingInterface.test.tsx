import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ColumnMappingInterface from '../ColumnMappingInterface';

// Mock the ColumnMapper
vi.mock('@/lib/column-mapper', () => ({
  ColumnMapper: vi.fn().mockImplementation(() => ({
    suggestMappings: vi.fn().mockReturnValue([
      {
        mapping: {
          excelColumn: 'Month',
          systemField: 'month',
          dataType: 'string',
          required: true,
          confidence: 0.9
        },
        reasons: ['Column name matches month pattern'],
        alternatives: []
      },
      {
        mapping: {
          excelColumn: 'Price',
          systemField: 'price',
          dataType: 'currency',
          required: true,
          confidence: 0.8
        },
        reasons: ['Column name matches price pattern'],
        alternatives: []
      }
    ]),
    validateMappings: vi.fn().mockReturnValue({
      isValid: true,
      errors: []
    })
  }))
}));

describe('ColumnMappingInterface', () => {
  const mockOnMappingChange = vi.fn();
  const mockOnValidationChange = vi.fn();

  const defaultProps = {
    headers: ['Month', 'Price', 'Description'],
    onMappingChange: mockOnMappingChange,
    onValidationChange: mockOnValidationChange
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render column mapping interface', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    expect(screen.getByText('Column Mapping')).toBeInTheDocument();
    expect(screen.getByText('Map Excel columns to system fields. Required fields are marked with *.')).toBeInTheDocument();
  });

  it('should display Excel columns in table', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should show system field dropdowns', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
    
    // Check that system fields are available in dropdown
    fireEvent.click(selects[0]);
    expect(screen.getByText('Month *')).toBeInTheDocument();
    expect(screen.getByText('Price *')).toBeInTheDocument();
  });

  it('should apply suggestions automatically', async () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockOnMappingChange).toHaveBeenCalled();
    });

    // Check that suggestions were applied
    const mappings = mockOnMappingChange.mock.calls[0][0];
    expect(mappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          excelColumn: 'Month',
          systemField: 'month'
        }),
        expect.objectContaining({
          excelColumn: 'Price',
          systemField: 'price'
        })
      ])
    );
  });

  it('should handle manual mapping changes', async () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const selects = screen.getAllByRole('combobox');
    
    // Change the first dropdown to a different field
    fireEvent.change(selects[0], { target: { value: 'description' } });
    
    await waitFor(() => {
      expect(mockOnMappingChange).toHaveBeenCalled();
    });
  });

  it('should show confidence levels', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('(90%)')).toBeInTheDocument();
  });

  it('should display sample data when provided', () => {
    const sampleData = [
      ['January', '150', 'Resort description'],
      ['February', '160', 'Another description'],
      ['March', '170', 'Third description']
    ];

    render(
      <ColumnMappingInterface 
        {...defaultProps} 
        sampleData={sampleData}
      />
    );
    
    expect(screen.getByText('January, February, March')).toBeInTheDocument();
    expect(screen.getByText('150, 160, 170')).toBeInTheDocument();
  });

  it('should show validation errors', () => {
    const mockValidateWithErrors = vi.fn().mockReturnValue({
      isValid: false,
      errors: ['Required field "month" is not mapped']
    });

    // Mock the ColumnMapper to return validation errors
    vi.mocked(require('@/lib/column-mapper').ColumnMapper).mockImplementation(() => ({
      suggestMappings: vi.fn().mockReturnValue([]),
      validateMappings: mockValidateWithErrors
    }));

    render(<ColumnMappingInterface {...defaultProps} />);
    
    expect(screen.getByText('Mapping Errors')).toBeInTheDocument();
    expect(screen.getByText('Required field "month" is not mapped')).toBeInTheDocument();
  });

  it('should handle apply all suggestions button', async () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const applyButton = screen.getByText('Apply All Suggestions');
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockOnMappingChange).toHaveBeenCalled();
    });
  });

  it('should handle clear all button', async () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const clearButton = screen.getByText('Clear All');
    fireEvent.click(clearButton);
    
    await waitFor(() => {
      expect(mockOnMappingChange).toHaveBeenCalled();
    });

    // Check that mappings were cleared
    const lastCall = mockOnMappingChange.mock.calls[mockOnMappingChange.mock.calls.length - 1];
    const mappings = lastCall[0];
    expect(mappings).toEqual([]);
  });

  it('should toggle suggestions visibility', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const toggleButton = screen.getByText('Hide Suggestions');
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Show Suggestions')).toBeInTheDocument();
    expect(screen.queryByText('Suggestions')).not.toBeInTheDocument();
  });

  it('should show mapping summary', () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    expect(screen.getByText(/Mapped:/)).toBeInTheDocument();
    expect(screen.getByText(/Required fields:/)).toBeInTheDocument();
  });

  it('should handle initial mappings prop', () => {
    const initialMappings = [
      {
        excelColumn: 'Month',
        systemField: 'month',
        dataType: 'string' as const,
        required: true,
        confidence: 1.0
      }
    ];

    render(
      <ColumnMappingInterface 
        {...defaultProps} 
        initialMappings={initialMappings}
      />
    );
    
    // Should use initial mappings instead of generating suggestions
    expect(mockOnMappingChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          excelColumn: 'Month',
          systemField: 'month'
        })
      ])
    );
  });

  it('should update data type when system field changes', async () => {
    render(<ColumnMappingInterface {...defaultProps} />);
    
    const systemFieldSelects = screen.getAllByRole('combobox');
    const dataTypeSelects = screen.getAllByRole('combobox');
    
    // Find the system field select (first select in each row)
    const firstSystemFieldSelect = systemFieldSelects[0];
    
    // Change to price field
    fireEvent.change(firstSystemFieldSelect, { target: { value: 'price' } });
    
    await waitFor(() => {
      // The data type should automatically change to currency
      const mappings = mockOnMappingChange.mock.calls[mockOnMappingChange.mock.calls.length - 1][0];
      const priceMapping = mappings.find((m: any) => m.systemField === 'price');
      expect(priceMapping?.dataType).toBe('currency');
    });
  });

  it('should highlight required fields that are not mapped', () => {
    const mockValidateWithMissingRequired = vi.fn().mockReturnValue({
      isValid: false,
      errors: ['Required field "month" is not mapped']
    });

    vi.mocked(require('@/lib/column-mapper').ColumnMapper).mockImplementation(() => ({
      suggestMappings: vi.fn().mockReturnValue([]),
      validateMappings: mockValidateWithMissingRequired
    }));

    render(<ColumnMappingInterface {...defaultProps} />);
    
    // Should show validation error
    expect(screen.getByText('Mapping Errors')).toBeInTheDocument();
  });
});