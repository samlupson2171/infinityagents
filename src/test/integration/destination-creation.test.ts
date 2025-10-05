import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { connectToDatabase } from '@/lib/mongodb';
import Destination from '@/models/Destination';
import { POST } from '@/app/api/admin/destinations/route';
import { NextRequest } from 'next/server';

// Mock next-auth
const mockSession = {
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'admin@test.com',
    name: 'Admin User',
    role: 'admin'
  }
};

// Mock getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession))
}));

describe('Destination Creation Integration Test', () => {
  beforeAll(async () => {
    await connectToDatabase();
  });

  afterAll(async () => {
    // Clean up test data
    await Destination.deleteMany({ name: { $regex: /^Test/ } });
  });

  it('should create a new destination successfully', async () => {
    const destinationData = {
      name: 'Test Integration Destination',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A beautiful test destination for our integration testing suite to verify functionality.',
      slug: 'test-integration-destination'
    };

    const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
      method: 'POST',
      body: JSON.stringify(destinationData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.message).toBe('Destination created successfully');
    expect(data.destination).toBeDefined();
    expect(data.destination.name).toBe(destinationData.name);
    expect(data.destination.country).toBe(destinationData.country);
    expect(data.destination.region).toBe(destinationData.region);
    expect(data.destination.description).toBe(destinationData.description);
    expect(data.destination.slug).toBe(destinationData.slug);

    // Verify it was actually saved to the database
    const savedDestination = await Destination.findById(data.destination._id);
    expect(savedDestination).toBeDefined();
    expect(savedDestination?.name).toBe(destinationData.name);
  });

  it('should prevent duplicate slugs', async () => {
    // First create a destination
    const firstDestination = {
      name: 'Test First Destination',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A test destination to create first for duplicate testing purposes.',
      slug: 'test-duplicate-slug'
    };

    const firstRequest = new NextRequest('http://localhost:3000/api/admin/destinations', {
      method: 'POST',
      body: JSON.stringify(firstDestination),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    await POST(firstRequest);

    // Now try to create another with the same slug
    const destinationData = {
      name: 'Test Duplicate Destination',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A test destination to verify duplicate slug prevention works correctly.',
      slug: 'test-duplicate-slug' // Same slug as first destination
    };

    const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
      method: 'POST',
      body: JSON.stringify(destinationData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('A destination with this slug already exists');
  });

  it('should validate required fields', async () => {
    const incompleteData = {
      name: 'Test Incomplete Destination',
      // Missing country, region, and description
    };

    const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
      method: 'POST',
      body: JSON.stringify(incompleteData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Missing required fields');
    expect(data.missingFields).toContain('country');
    expect(data.missingFields).toContain('region');
    expect(data.missingFields).toContain('description');
  });

  it('should create default sections when not provided', async () => {
    const destinationData = {
      name: 'Test Sections Destination',
      country: 'Spain',
      region: 'Costa Blanca',
      description: 'A test destination to verify that default sections are created properly.',
      slug: 'test-sections-destination'
    };

    const request = new NextRequest('http://localhost:3000/api/admin/destinations', {
      method: 'POST',
      body: JSON.stringify(destinationData),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    
    // Verify default sections were created
    const savedDestination = await Destination.findById(data.destination._id);
    expect(savedDestination?.sections).toBeDefined();
    expect(savedDestination?.sections.overview.title).toBe('Overview');
    expect(savedDestination?.sections.accommodation.title).toBe('Accommodation');
    expect(savedDestination?.sections.attractions.title).toBe('Attractions');
    expect(savedDestination?.sections.beaches.title).toBe('Beaches');
    expect(savedDestination?.sections.nightlife.title).toBe('Nightlife');
    expect(savedDestination?.sections.dining.title).toBe('Dining');
    expect(savedDestination?.sections.practical.title).toBe('Practical Information');
  });
});