import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');
  });

  test('should display registration form with all required fields', async ({ page }) => {
    // Check page title and heading
    await expect(page).toHaveTitle(/Infinity Weekends/);
    await expect(page.getByRole('heading', { name: /join infinity weekends/i })).toBeVisible();
    
    // Check all form fields are present
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/company name/i)).toBeVisible();
    await expect(page.getByLabel(/abta\/pts number/i)).toBeVisible();
    await expect(page.getByLabel(/contact email/i)).toBeVisible();
    await expect(page.getByLabel(/website address/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    
    // Check submit button is present but disabled
    const submitButton = page.getByRole('button', { name: /register/i });
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Fill form with invalid data
    await page.getByLabel(/full name/i).fill('A'); // Too short
    await page.getByLabel(/company name/i).fill('B'); // Too short
    await page.getByLabel(/abta\/pts number/i).fill('INVALID'); // Invalid format
    await page.getByLabel(/contact email/i).fill('invalid-email'); // Invalid email
    await page.getByLabel(/website address/i).fill('not-a-url'); // Invalid URL
    await page.getByLabel(/^password/i).fill('123'); // Too short
    await page.getByLabel(/confirm password/i).fill('456'); // Doesn't match
    
    // Clear fields to trigger validation
    await page.getByLabel(/full name/i).clear();
    await page.getByLabel(/company name/i).clear();
    
    // Check validation errors appear
    await expect(page.getByText(/name must be at least 2 characters long/i)).toBeVisible();
    await expect(page.getByText(/company name must be at least 2 characters long/i)).toBeVisible();
    await expect(page.getByText(/abta\/pts number must start with/i)).toBeVisible();
    await expect(page.getByText(/please provide a valid email address/i)).toBeVisible();
    await expect(page.getByText(/please provide a valid http or https website url/i)).toBeVisible();
  });

  test('should enable submit button when form is valid', async ({ page }) => {
    // Fill form with valid data
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/company name/i).fill('Test Travel Agency');
    await page.getByLabel(/abta\/pts number/i).fill('ABTA12345');
    await page.getByLabel(/contact email/i).fill('john@example.com');
    await page.getByLabel(/website address/i).fill('https://www.example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    // Submit button should be enabled
    const submitButton = page.getByRole('button', { name: /register/i });
    await expect(submitButton).toBeEnabled();
  });

  test('should show loading state during submission', async ({ page }) => {
    // Mock the API to delay response
    await page.route('/api/auth/register', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message: 'Registration successful',
            user: {
              id: '123',
              name: 'John Doe',
              companyName: 'Test Travel Agency',
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
    });

    // Fill and submit form
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/company name/i).fill('Test Travel Agency');
    await page.getByLabel(/abta\/pts number/i).fill('ABTA12345');
    await page.getByLabel(/contact email/i).fill('john@example.com');
    await page.getByLabel(/website address/i).fill('https://www.example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    const submitButton = page.getByRole('button', { name: /register/i });
    await submitButton.click();
    
    // Check loading state
    await expect(page.getByText(/registering.../i)).toBeVisible();
    await expect(submitButton).toBeDisabled();
  });

  test('should complete successful registration flow', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/auth/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message: 'Registration successful',
            user: {
              id: '123',
              name: 'John Doe',
              companyName: 'Test Travel Agency',
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
    });

    // Fill and submit form
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/company name/i).fill('Test Travel Agency');
    await page.getByLabel(/abta\/pts number/i).fill('ABTA12345');
    await page.getByLabel(/contact email/i).fill('john@example.com');
    await page.getByLabel(/website address/i).fill('https://www.example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    await page.getByRole('button', { name: /register/i }).click();
    
    // Should redirect to confirmation page
    await expect(page).toHaveURL('/auth/register/confirmation');
    await expect(page.getByRole('heading', { name: /registration submitted/i })).toBeVisible();
    await expect(page.getByText(/thank you for your interest/i)).toBeVisible();
    
    // Check next steps are displayed
    await expect(page.getByText(/what happens next/i)).toBeVisible();
    await expect(page.getByText(/verification/i)).toBeVisible();
    await expect(page.getByText(/email notification/i)).toBeVisible();
    await expect(page.getByText(/access granted/i)).toBeVisible();
    
    // Check action buttons
    await expect(page.getByRole('link', { name: /go to login page/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /return to home/i })).toBeVisible();
  });

  test('should handle registration errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('/api/auth/register', async route => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email address already exists',
          },
        }),
      });
    });

    // Fill and submit form
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/company name/i).fill('Test Travel Agency');
    await page.getByLabel(/abta\/pts number/i).fill('ABTA12345');
    await page.getByLabel(/contact email/i).fill('existing@example.com');
    await page.getByLabel(/website address/i).fill('https://www.example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    
    await page.getByRole('button', { name: /register/i }).click();
    
    // Should show error message
    await expect(page.getByText(/an account with this email address already exists/i)).toBeVisible();
    
    // Should stay on registration page
    await expect(page).toHaveURL('/auth/register');
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check form is still usable on mobile
    await expect(page.getByRole('heading', { name: /join infinity weekends/i })).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
    
    // Fill form on mobile
    await page.getByLabel(/full name/i).fill('John Doe');
    await page.getByLabel(/company name/i).fill('Test Travel Agency');
    
    // Check fields are properly sized
    const nameInput = page.getByLabel(/full name/i);
    const boundingBox = await nameInput.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(200); // Should be reasonably wide
  });

  test('should navigate to login page from registration', async ({ page }) => {
    // Click login link
    await page.getByRole('link', { name: /sign in here/i }).click();
    
    // Should navigate to login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('should validate ABTA/PTS number format in real-time', async ({ page }) => {
    const abtaInput = page.getByLabel(/abta\/pts number/i);
    
    // Type invalid format
    await abtaInput.fill('INVALID');
    await abtaInput.blur();
    
    // Should show validation error
    await expect(page.getByText(/abta\/pts number must start with/i)).toBeVisible();
    
    // Type valid format
    await abtaInput.clear();
    await abtaInput.fill('ABTA12345');
    await abtaInput.blur();
    
    // Error should disappear
    await expect(page.getByText(/abta\/pts number must start with/i)).not.toBeVisible();
  });
});