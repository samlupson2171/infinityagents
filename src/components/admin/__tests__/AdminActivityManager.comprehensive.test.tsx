import React from 'react';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminActivityManager from '../AdminActivityManager';
import { ActivityCategory } from '@/models/Activity';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as Mock;

// Mock data
const mockActivities = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Beach Excursion',
    category: ActivityCategory.EXCURSION,
    location: 'Benidorm',
    pricePerPerson: 25.0,
    minPersons: 2,
    maxPersons: 20,
    availableFrom: '2025-06-01T00:00:00.000Z',
    availableTo: '2025-09-30T00:00:00.000Z',
    duration: '4 hours',
    description: 'A wonderful beach excursion with guided tour',
    isActive: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    createdBy: {
      _id: '507f1f77bcf86cd799439012',
      name: 'Admin User',
      email: 'admin@example.com',
    },
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'Mountain Hike',
    category: ActivityCategory.ADVENTURE,
    location: 'Albufeira',
    pricePerPerson: 35.0,
    minPersons: 4,
    maxPersons: 15,
    availableFrom: '2025-05-01T00:00:00.000Z',
    availableTo: '2025-10-31T00:00:00.000Z',
    duration: '6 hours',
    description: 'Challenging mountain hike with scenic views',
    isActive: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    createdBy: {
      _id: '507f1f77bcf86cd799439014',
      name: 'Another Admin',
      email: 'admin2@example.com',
    },
  },
];

const mockLocations = ['Benidorm', 'Albufeira', 'Valencia'];
const mockCategories = [
  { value: 'excursion', label: 'Excursions', icon: '🏖️' },
  { value: 'adventure', label: 'Adventure Sports', icon: '🏔️' },
  { value: 'cultural', label: 'Cultural Tours', icon: '🏛️' },
];

describe('AdminActivityManager Component - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful API responses by default
    mockFetch.mockImplementation((url: string, options?: any) => {
      const method = options?.method || 'GET';

      if (url.includes('/api/activities/locations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockLocations }),
        });
      }

      if (url.includes('/api/activities/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: mockCategories }),
        });
      }

      if (url.includes('/api/admin/activities') && method === 'GET') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                activities: mockActivities,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 2,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false,
                },
              },
            }),
        });
      }

      if (url.includes('/api/admin/activities') && method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { modifiedCount: 1 },
            }),
        });
      }

      if (url.includes('/api/admin/activities/') && method === 'PUT') {
        const updatedActivity = {
          ...mockActivities[0],
          name: 'Updated Activity',
        };
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: updatedActivity,
            }),
        });
      }

      if (url.includes('/api/admin/activities/') && method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              message: 'Activity deleted successfully',
            }),
        });
      }

      return Promise.reject(new Error('Unknown URL'));
    });
  });

  describe('Initial Rendering and Data Loading', () => {
    it('should render the admin interface correctly', async () => {
      render(<AdminActivityManager />);

      expect(screen.getByText('Activity Management')).toBeInTheDocument();
      expect(
        screen.getByText('Manage all activities in the system')
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Search activities...')
      ).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByText('All Locations')).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });

    it('should load and display activities', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
        expect(screen.getByText('Mountain Hike')).toBeInTheDocument();
      });

      expect(screen.getByText('2 activities found')).toBeInTheDocument();
    });

    it('should load filter options', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
        expect(screen.getByText('Albufeira')).toBeInTheDocument();
        expect(screen.getByText('🏖️ Excursions')).toBeInTheDocument();
        expect(screen.getByText('🏔️ Adventure Sports')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      // Mock delayed response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      success: true,
                      data: {
                        activities: [],
                        pagination: {
                          page: 1,
                          limit: 20,
                          total: 0,
                          totalPages: 0,
                          hasNext: false,
                          hasPrev: false,
                        },
                      },
                    }),
                }),
              100
            )
          )
      );

      render(<AdminActivityManager />);

      expect(screen.getByText('Loading activities...')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Server error' },
            }),
        })
      );

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load activities')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should handle search input', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      const searchInput = screen.getByPlaceholderText('Search activities...');
      await user.type(searchInput, 'beach');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=beach'),
          expect.any(Object)
        );
      });
    });

    it('should handle status filter', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'active');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('status=active'),
          expect.any(Object)
        );
      });
    });

    it('should handle location filter', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Benidorm')).toBeInTheDocument();
      });

      const locationSelect = screen.getByDisplayValue('All Locations');
      await user.selectOptions(locationSelect, 'Benidorm');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('location=Benidorm'),
          expect.any(Object)
        );
      });
    });

    it('should handle category filter', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('🏖️ Excursions')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Categories');
      await user.selectOptions(categorySelect, 'excursion');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('category=excursion'),
          expect.any(Object)
        );
      });
    });

    it('should handle date range filters', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      const dateFromInput = screen.getByLabelText('Available From');
      const dateToInput = screen.getByLabelText('Available To');

      await user.type(dateFromInput, '2025-06-01');
      await user.type(dateToInput, '2025-09-30');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('dateFrom=2025-06-01'),
          expect.any(Object)
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('dateTo=2025-09-30'),
          expect.any(Object)
        );
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      // Set some filters first
      const searchInput = screen.getByPlaceholderText('Search activities...');
      await user.type(searchInput, 'test');

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'active');

      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      expect(statusSelect).toHaveValue('');
    });
  });

  describe('Activity Table Display', () => {
    it('should display activity information correctly', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Check all columns are displayed
      expect(screen.getByText('Benidorm')).toBeInTheDocument();
      expect(screen.getByText('€25.00')).toBeInTheDocument();
      expect(screen.getByText('2 - 20')).toBeInTheDocument();
      expect(screen.getByText('4 hours')).toBeInTheDocument();
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('should show activity status correctly', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Active activity should show green status
      const activeRow = screen.getByText('Beach Excursion').closest('tr');
      expect(within(activeRow!).getByText('Active')).toBeInTheDocument();

      // Inactive activity should show red status
      const inactiveRow = screen.getByText('Mountain Hike').closest('tr');
      expect(within(inactiveRow!).getByText('Inactive')).toBeInTheDocument();
    });

    it('should handle sorting', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Click on Name column header to sort
      const nameHeader = screen.getByText('Name');
      await user.click(nameHeader);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=name&sortOrder=asc'),
          expect.any(Object)
        );
      });

      // Click again to reverse sort
      await user.click(nameHeader);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('sortBy=name&sortOrder=desc'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should select individual activities', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      const firstActivityCheckbox = checkboxes[1]; // Skip "select all" checkbox

      await user.click(firstActivityCheckbox);

      expect(firstActivityCheckbox).toBeChecked();
      expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('should select all activities', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      expect(screen.getByText('2 selected')).toBeInTheDocument();

      // All individual checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.slice(1).forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it('should perform bulk activate operation', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Select activities
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      // Perform bulk activate
      const bulkActionsButton = screen.getByText('Bulk Actions');
      await user.click(bulkActionsButton);

      const activateButton = screen.getByText('Activate Selected');
      await user.click(activateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/activities'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'activate',
              activityIds: expect.arrayContaining([
                '507f1f77bcf86cd799439011',
                '507f1f77bcf86cd799439013',
              ]),
            }),
          })
        );
      });
    });

    it('should perform bulk deactivate operation', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Select first activity
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Perform bulk deactivate
      const bulkActionsButton = screen.getByText('Bulk Actions');
      await user.click(bulkActionsButton);

      const deactivateButton = screen.getByText('Deactivate Selected');
      await user.click(deactivateButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/activities'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'deactivate',
              activityIds: ['507f1f77bcf86cd799439011'],
            }),
          })
        );
      });
    });

    it('should perform bulk delete operation with confirmation', async () => {
      const user = userEvent.setup();

      // Mock window.confirm
      const mockConfirm = vi.fn(() => true);
      Object.defineProperty(window, 'confirm', { value: mockConfirm });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Select first activity
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Perform bulk delete
      const bulkActionsButton = screen.getByText('Bulk Actions');
      await user.click(bulkActionsButton);

      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete 1 selected activities? This action cannot be undone.'
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/activities'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'delete',
              activityIds: ['507f1f77bcf86cd799439011'],
            }),
          })
        );
      });
    });

    it('should cancel bulk delete when user declines confirmation', async () => {
      const user = userEvent.setup();

      // Mock window.confirm to return false
      const mockConfirm = vi.fn(() => false);
      Object.defineProperty(window, 'confirm', { value: mockConfirm });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Select first activity
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Attempt bulk delete
      const bulkActionsButton = screen.getByText('Bulk Actions');
      await user.click(bulkActionsButton);

      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalled();

      // Should not make API call
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/activities'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('delete'),
        })
      );
    });

    it('should disable bulk actions when no activities are selected', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const bulkActionsButton = screen.getByText('Bulk Actions');
      expect(bulkActionsButton).toBeDisabled();
    });
  });

  describe('Individual Activity Actions', () => {
    it('should open edit modal when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      expect(screen.getByText('Edit Activity')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Beach Excursion')).toBeInTheDocument();
    });

    it('should save activity changes', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Open edit modal
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Modify activity name
      const nameInput = screen.getByDisplayValue('Beach Excursion');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Beach Excursion');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            '/api/admin/activities/507f1f77bcf86cd799439011'
          ),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Beach Excursion'),
          })
        );
      });
    });

    it('should validate activity form', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Open edit modal
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      // Clear required field
      const nameInput = screen.getByDisplayValue('Beach Excursion');
      await user.clear(nameInput);

      // Try to save
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      expect(screen.getByText('Activity name is required')).toBeInTheDocument();
    });

    it('should delete individual activity with confirmation', async () => {
      const user = userEvent.setup();

      // Mock window.confirm
      const mockConfirm = vi.fn(() => true);
      Object.defineProperty(window, 'confirm', { value: mockConfirm });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Are you sure you want to delete "Beach Excursion"? This action cannot be undone.'
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(
            '/api/admin/activities/507f1f77bcf86cd799439011'
          ),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });

    it('should toggle activity status', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Find the toggle button for the active activity
      const activeRow = screen.getByText('Beach Excursion').closest('tr');
      const toggleButton = within(activeRow!).getByRole('button', {
        name: /toggle/i,
      });

      await user.click(toggleButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/admin/activities'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              action: 'deactivate',
              activityIds: ['507f1f77bcf86cd799439011'],
            }),
          })
        );
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination controls', async () => {
      const user = userEvent.setup();

      // Mock response with pagination
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/admin/activities')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: {
                  activities: mockActivities,
                  pagination: {
                    page: 1,
                    limit: 20,
                    total: 50,
                    totalPages: 3,
                    hasNext: true,
                    hasPrev: false,
                  },
                },
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] }),
        });
      });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
        expect(screen.getByText('50 total activities')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      expect(nextButton).not.toBeDisabled();

      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();

      // Click next page
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should handle page size changes', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const pageSizeSelect = screen.getByDisplayValue('20');
      await user.selectOptions(pageSizeSelect, '50');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=50'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle bulk operation errors', async () => {
      const user = userEvent.setup();

      // Mock error response for bulk operation
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (
          options?.method === 'POST' &&
          url.includes('/api/admin/activities')
        ) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                success: false,
                error: {
                  code: 'BULK_OPERATION_FAILED',
                  message: 'Failed to update activities',
                },
              }),
          });
        }
        // Return success for other requests
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                activities: mockActivities,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 2,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false,
                },
              },
            }),
        });
      });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Select and try to activate
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const bulkActionsButton = screen.getByText('Bulk Actions');
      await user.click(bulkActionsButton);

      const activateButton = screen.getByText('Activate Selected');
      await user.click(activateButton);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to update activities')
        ).toBeInTheDocument();
      });
    });

    it('should handle individual activity update errors', async () => {
      const user = userEvent.setup();

      // Mock error response for individual update
      mockFetch.mockImplementation((url: string, options?: any) => {
        if (options?.method === 'PUT') {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Invalid activity data',
                },
              }),
          });
        }
        // Return success for other requests
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                activities: mockActivities,
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 2,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false,
                },
              },
            }),
        });
      });

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      // Open edit modal and try to save
      const editButtons = screen.getAllByText('Edit');
      await user.click(editButtons[0]);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid activity data')).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(
          screen.getByText('Failed to load activities')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      expect(screen.getByRole('searchbox')).toHaveAttribute(
        'aria-label',
        'Search activities'
      );
      expect(screen.getByRole('table')).toHaveAttribute(
        'aria-label',
        'Activities table'
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).toHaveAttribute(
        'aria-label',
        'Select all activities'
      );
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('Beach Excursion')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search activities...');

      // Tab to search input
      await user.tab();
      expect(searchInput).toHaveFocus();

      // Type in search
      await user.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      const user = userEvent.setup();
      render(<AdminActivityManager />);

      const searchInput = screen.getByPlaceholderText('Search activities...');

      // Type multiple characters quickly
      await user.type(searchInput, 'beach');

      // Should not make multiple API calls immediately
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial load calls

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('search=beach'),
            expect.any(Object)
          );
        },
        { timeout: 1000 }
      );
    });

    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockActivities[0],
        _id: `activity-${i}`,
        name: `Activity ${i}`,
      }));

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                activities: largeDataset.slice(0, 20), // Only return first page
                pagination: {
                  page: 1,
                  limit: 20,
                  total: 1000,
                  totalPages: 50,
                  hasNext: true,
                  hasPrev: false,
                },
              },
            }),
        })
      );

      render(<AdminActivityManager />);

      await waitFor(() => {
        expect(screen.getByText('1000 total activities')).toBeInTheDocument();
      });

      // Should only render 20 activities (pagination)
      const activityRows = screen.getAllByRole('row');
      expect(activityRows).toHaveLength(21); // 20 activities + header row
    });
  });
});
