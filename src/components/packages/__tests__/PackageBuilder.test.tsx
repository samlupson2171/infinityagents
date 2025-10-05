import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PackageBuilder, {
  usePackageBuilder,
  PackageState,
} from '../PackageBuilder';
import { IActivity, ActivityCategory } from '@/models/Activity';

// Mock activity data
const mockActivity1: IActivity = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Beach Excursion',
  category: ActivityCategory.EXCURSION,
  location: 'Benidorm',
  pricePerPerson: 25.0,
  minPersons: 2,
  maxPersons: 20,
  availableFrom: new Date('2024-01-01'),
  availableTo: new Date('2024-12-31'),
  duration: '4 hours',
  description: 'Enjoy a relaxing day at the beautiful beaches of Benidorm',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '507f1f77bcf86cd799439012',
  isAvailable: () => true,
  isValidForDates: () => true,
} as IActivity;

const mockActivity2: IActivity = {
  _id: '507f1f77bcf86cd799439013',
  name: 'City Tour',
  category: ActivityCategory.CULTURAL,
  location: 'Benidorm',
  pricePerPerson: 35.0,
  minPersons: 1,
  maxPersons: 15,
  availableFrom: new Date('2024-01-01'),
  availableTo: new Date('2024-12-31'),
  duration: '3 hours',
  description: 'Explore the historic city center with a professional guide',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: '507f1f77bcf86cd799439012',
  isAvailable: () => true,
  isValidForDates: () => true,
} as IActivity;

describe('PackageBuilder Component', () => {
  const mockOnPackageChange = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default empty state', () => {
    render(<PackageBuilder />);

    expect(screen.getByText('Package Builder')).toBeInTheDocument();
    expect(screen.getByText('No activities added yet')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Package')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument(); // Number of persons
    expect(screen.getByText('€0.00')).toBeInTheDocument(); // Total cost
  });

  it('renders with initial package data', () => {
    const initialPackage = {
      name: 'Test Package',
      numberOfPersons: 3,
      clientName: 'John Doe',
      notes: 'Special requirements',
    };

    render(<PackageBuilder initialPackage={initialPackage} />);

    expect(screen.getByDisplayValue('Test Package')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Special requirements')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('updates package name', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const nameInput = screen.getByLabelText('Package Name');
    fireEvent.change(nameInput, { target: { value: 'Updated Package' } });

    expect(nameInput).toHaveValue('Updated Package');
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated Package' })
    );
  });

  it('updates client name', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const clientInput = screen.getByLabelText('Client Name (Optional)');
    fireEvent.change(clientInput, { target: { value: 'Jane Smith' } });

    expect(clientInput).toHaveValue('Jane Smith');
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ clientName: 'Jane Smith' })
    );
  });

  it('updates notes', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const notesInput = screen.getByLabelText('Notes (Optional)');
    fireEvent.change(notesInput, { target: { value: 'Test notes' } });

    expect(notesInput).toHaveValue('Test notes');
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ notes: 'Test notes' })
    );
  });

  it('updates number of persons using buttons', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const increaseButton = screen.getByText('+');
    const decreaseButton = screen.getByText('-');

    fireEvent.click(increaseButton);
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfPersons: 2 })
    );

    fireEvent.click(increaseButton);
    fireEvent.click(decreaseButton);
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfPersons: 2 })
    );
  });

  it('prevents number of persons from going below 1', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const decreaseButton = screen.getByText('-');
    expect(decreaseButton).toBeDisabled();

    fireEvent.click(decreaseButton);
    expect(mockOnPackageChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ numberOfPersons: 0 })
    );
  });

  it('updates number of persons using input field', () => {
    render(<PackageBuilder onPackageChange={mockOnPackageChange} />);

    const personsInput = screen.getByLabelText('Number of Persons');
    fireEvent.change(personsInput, { target: { value: '5' } });

    expect(personsInput).toHaveValue(5);
    expect(mockOnPackageChange).toHaveBeenCalledWith(
      expect.objectContaining({ numberOfPersons: 5 })
    );
  });

  it('calls onSave when save button is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);

    const initialPackage = {
      activities: [
        {
          activityId: mockActivity1._id,
          activity: mockActivity1,
          quantity: 1,
          subtotal: 25.0,
        },
      ],
    };

    render(
      <PackageBuilder initialPackage={initialPackage} onSave={mockOnSave} />
    );

    const saveButton = screen.getByText('Save Package');
    fireEvent.click(saveButton);

    expect(saveButton).toHaveTextContent('Saving...');

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          activities: expect.arrayContaining([
            expect.objectContaining({
              activityId: mockActivity1._id,
              quantity: 1,
              subtotal: 25.0,
            }),
          ]),
        })
      );
    });
  });

  it('calls onExport when export button is clicked', async () => {
    mockOnExport.mockResolvedValue(undefined);

    const initialPackage = {
      activities: [
        {
          activityId: mockActivity1._id,
          activity: mockActivity1,
          quantity: 1,
          subtotal: 25.0,
        },
      ],
    };

    render(
      <PackageBuilder initialPackage={initialPackage} onExport={mockOnExport} />
    );

    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);

    expect(exportButton).toHaveTextContent('Exporting...');

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith(
        expect.objectContaining({
          activities: expect.arrayContaining([
            expect.objectContaining({
              activityId: mockActivity1._id,
              quantity: 1,
              subtotal: 25.0,
            }),
          ]),
        })
      );
    });
  });

  it('prevents export when package is empty', async () => {
    render(<PackageBuilder onExport={mockOnExport} />);

    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Cannot export empty package. Please add activities first.'
        )
      ).toBeInTheDocument();
    });
    expect(mockOnExport).not.toHaveBeenCalled();
  });

  it('shows error when trying to save empty package', async () => {
    render(<PackageBuilder onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Package');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Cannot save empty package. Please add activities first.'
        )
      ).toBeInTheDocument();
    });
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('handles save error', async () => {
    const errorMessage = 'Failed to save package';
    mockOnSave.mockRejectedValue(new Error(errorMessage));

    const initialPackage = {
      activities: [
        {
          activityId: mockActivity1._id,
          activity: mockActivity1,
          quantity: 1,
          subtotal: 25.0,
        },
      ],
    };

    render(
      <PackageBuilder initialPackage={initialPackage} onSave={mockOnSave} />
    );

    const saveButton = screen.getByText('Save Package');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('handles export error', async () => {
    const errorMessage = 'Failed to export package';
    mockOnExport.mockRejectedValue(new Error(errorMessage));

    const initialPackage = {
      activities: [
        {
          activityId: mockActivity1._id,
          activity: mockActivity1,
          quantity: 1,
          subtotal: 25.0,
        },
      ],
    };

    render(
      <PackageBuilder initialPackage={initialPackage} onExport={mockOnExport} />
    );

    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('formats currency correctly', () => {
    const initialPackage = {
      activities: [
        {
          activityId: mockActivity1._id,
          activity: mockActivity1,
          quantity: 2,
          subtotal: 50.0,
        },
      ],
      numberOfPersons: 3,
    };

    render(<PackageBuilder initialPackage={initialPackage} />);

    // Check subtotal formatting (text is split across elements)
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === 'Subtotal: €50.00';
      })
    ).toBeInTheDocument();

    // Check total formatting (subtotal * numberOfPersons)
    expect(
      screen.getByText((content, element) => {
        return element?.textContent === 'Total: €150.00';
      })
    ).toBeInTheDocument();

    // Check package total
    expect(screen.getByText('€150.00')).toBeInTheDocument();
  });
});

describe('usePackageBuilder Hook', () => {
  it('initializes with default values', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return null;
    }

    render(<TestComponent />);

    expect(hookResult.packageState).toEqual({
      name: 'New Package',
      activities: [],
      numberOfPersons: 1,
      totalCost: 0,
      clientName: '',
      notes: '',
    });
  });

  it('initializes with provided initial package', () => {
    let hookResult: any;
    const initialPackage = {
      name: 'Test Package',
      numberOfPersons: 2,
      clientName: 'John Doe',
    };

    function TestComponent() {
      hookResult = usePackageBuilder(initialPackage);
      return null;
    }

    render(<TestComponent />);

    expect(hookResult.packageState).toEqual({
      name: 'Test Package',
      activities: [],
      numberOfPersons: 2,
      totalCost: 0,
      clientName: 'John Doe',
      notes: '',
    });
  });

  it('adds activity correctly', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <button onClick={() => hookResult.addActivity(mockActivity1, 2)}>
          Add Activity
        </button>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity'));

    expect(hookResult.packageState.activities).toHaveLength(1);
    expect(hookResult.packageState.activities[0]).toEqual({
      activityId: mockActivity1._id,
      activity: mockActivity1,
      quantity: 2,
      subtotal: 50.0,
    });
    expect(hookResult.packageState.totalCost).toBe(50.0);
  });

  it('updates existing activity when adding duplicate', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button onClick={() => hookResult.addActivity(mockActivity1, 1)}>
            Add Activity 1
          </button>
          <button onClick={() => hookResult.addActivity(mockActivity1, 3)}>
            Add Activity 3
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity 1'));
    fireEvent.click(screen.getByText('Add Activity 3'));

    expect(hookResult.packageState.activities).toHaveLength(1);
    expect(hookResult.packageState.activities[0].quantity).toBe(3);
    expect(hookResult.packageState.activities[0].subtotal).toBe(75.0);
  });

  it('removes activity correctly', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button onClick={() => hookResult.addActivity(mockActivity1, 1)}>
            Add Activity
          </button>
          <button onClick={() => hookResult.removeActivity(mockActivity1._id)}>
            Remove Activity
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity'));
    expect(hookResult.packageState.activities).toHaveLength(1);

    fireEvent.click(screen.getByText('Remove Activity'));
    expect(hookResult.packageState.activities).toHaveLength(0);
    expect(hookResult.packageState.totalCost).toBe(0);
  });

  it('updates activity quantity correctly', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button onClick={() => hookResult.addActivity(mockActivity1, 1)}>
            Add Activity
          </button>
          <button
            onClick={() =>
              hookResult.updateActivityQuantity(mockActivity1._id, 5)
            }
          >
            Update Quantity
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity'));
    fireEvent.click(screen.getByText('Update Quantity'));

    expect(hookResult.packageState.activities[0].quantity).toBe(5);
    expect(hookResult.packageState.activities[0].subtotal).toBe(125.0);
    expect(hookResult.packageState.totalCost).toBe(125.0);
  });

  it('prevents updating quantity below 1', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button onClick={() => hookResult.addActivity(mockActivity1, 1)}>
            Add Activity
          </button>
          <button
            onClick={() =>
              hookResult.updateActivityQuantity(mockActivity1._id, 0)
            }
          >
            Update Quantity to 0
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity'));
    const originalQuantity = hookResult.packageState.activities[0].quantity;

    fireEvent.click(screen.getByText('Update Quantity to 0'));

    expect(hookResult.packageState.activities[0].quantity).toBe(
      originalQuantity
    );
  });

  it('updates number of persons and recalculates total cost', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button onClick={() => hookResult.addActivity(mockActivity1, 2)}>
            Add Activity
          </button>
          <button onClick={() => hookResult.updateNumberOfPersons(3)}>
            Update Persons
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Add Activity'));
    expect(hookResult.packageState.totalCost).toBe(50.0); // 2 * 25 * 1 person

    fireEvent.click(screen.getByText('Update Persons'));
    expect(hookResult.packageState.numberOfPersons).toBe(3);
    expect(hookResult.packageState.totalCost).toBe(150.0); // 2 * 25 * 3 persons
  });

  it('prevents updating persons below 1', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <button onClick={() => hookResult.updateNumberOfPersons(0)}>
          Update Persons to 0
        </button>
      );
    }

    render(<TestComponent />);

    const originalPersons = hookResult.packageState.numberOfPersons;
    fireEvent.click(screen.getByText('Update Persons to 0'));

    expect(hookResult.packageState.numberOfPersons).toBe(originalPersons);
  });

  it('updates package details correctly', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <button
          onClick={() =>
            hookResult.updatePackageDetails({
              name: 'Updated Name',
              clientName: 'Updated Client',
              notes: 'Updated Notes',
            })
          }
        >
          Update Details
        </button>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Update Details'));

    expect(hookResult.packageState.name).toBe('Updated Name');
    expect(hookResult.packageState.clientName).toBe('Updated Client');
    expect(hookResult.packageState.notes).toBe('Updated Notes');
  });

  it('resets package correctly', () => {
    let hookResult: any;

    function TestComponent() {
      hookResult = usePackageBuilder();
      return (
        <div>
          <button
            onClick={() => {
              hookResult.addActivity(mockActivity1, 2);
              hookResult.updateNumberOfPersons(3);
              hookResult.updatePackageDetails({ name: 'Test Package' });
            }}
          >
            Setup Package
          </button>
          <button onClick={() => hookResult.resetPackage()}>
            Reset Package
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Setup Package'));
    fireEvent.click(screen.getByText('Reset Package'));

    expect(hookResult.packageState).toEqual({
      name: 'New Package',
      activities: [],
      numberOfPersons: 1,
      totalCost: 0,
      clientName: '',
      notes: '',
    });
  });
});
