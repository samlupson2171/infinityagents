import '@testing-library/jest-dom';
import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';

// Mock environment variables for testing
process.env.MONGODB_URI = 'mongodb://localhost:27017/infinity-weekends-test';

beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
});

afterEach(async () => {
  // Clean up test data after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close database connection after all tests
  await mongoose.connection.close();
});
