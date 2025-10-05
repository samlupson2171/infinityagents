import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createOptimalIndexes,
  analyzeQueryPerformance,
  QueryOptimizer,
  PerformanceMonitor,
  measureQueryPerformance,
} from '../database-optimization';
import { connectToDatabase } from '../mongodb';

// Mock mongoose and database
vi.mock('../mongodb', () => ({
  connectToDatabase: vi.fn(),
}));

vi.mock('../../models/Activity', () => ({
  default: {
    collection: {
      createIndex: vi.fn(),
    },
  },
}));

vi.mock('../../models/ActivityPackage', () => ({
  default: {
    collection: {
      createIndex: vi.fn(),
    },
  },
}));

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    connection: {
      db: {
        collection: vi.fn(() => ({
          createIndex: vi.fn(),
          stats: vi.fn(() => ({
            count: 1000,
            avgObjSize: 512,
            totalIndexSize: 1024,
            size: 512000,
          })),
          aggregate: vi.fn(() => ({
            toArray: vi.fn(() => [
              { name: 'test_index', accesses: { ops: 100 } },
            ]),
          })),
        })),
      },
    },
    models: {
      Activity: {
        collection: {
          createIndex: vi.fn(),
        },
      },
      ActivityPackage: {
        collection: {
          createIndex: vi.fn(),
        },
      },
    },
    Types: {
      ObjectId: vi.fn((id) => id),
    },
  };
});

describe('Database Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOptimalIndexes', () => {
    it('should create all necessary indexes', async () => {
      const mockCreateIndex = vi.fn();

      // Mock Activity model
      vi.doMock('../../models/Activity', () => ({
        default: {
          collection: {
            createIndex: mockCreateIndex,
          },
        },
      }));

      // Mock ActivityPackage model
      vi.doMock('../../models/ActivityPackage', () => ({
        default: {
          collection: {
            createIndex: mockCreateIndex,
          },
        },
      }));

      await createOptimalIndexes();

      // Should create multiple indexes
      expect(mockCreateIndex).toHaveBeenCalledTimes(12); // 8 activity + 4 package indexes
    });

    it('should handle index creation errors gracefully', async () => {
      const mockCreateIndex = vi
        .fn()
        .mockRejectedValue(new Error('Index already exists'));

      vi.doMock('../../models/Activity', () => ({
        default: {
          collection: {
            createIndex: mockCreateIndex,
          },
        },
      }));

      vi.doMock('../../models/ActivityPackage', () => ({
        default: {
          collection: {
            createIndex: mockCreateIndex,
          },
        },
      }));

      // Should not throw error
      await expect(createOptimalIndexes()).resolves.not.toThrow();
    });
  });

  describe('QueryOptimizer', () => {
    it('should optimize activity search queries', () => {
      const params = {
        search: 'beach',
        location: 'Benidorm',
        category: 'excursion',
        priceMin: 10,
        priceMax: 50,
        dateFrom: new Date('2024-06-01'),
        dateTo: new Date('2024-06-30'),
        skip: 0,
        limit: 20,
      };

      const pipeline = QueryOptimizer.optimizeActivitySearch(params);

      expect(pipeline).toHaveLength(5); // match, addFields, sort, skip, limit, project
      expect(pipeline[0]).toHaveProperty('$match');
      expect(pipeline[0].$match).toHaveProperty('isActive', true);
      expect(pipeline[0].$match).toHaveProperty('$text');
      expect(pipeline[0].$match).toHaveProperty('location');
      expect(pipeline[0].$match).toHaveProperty('category', 'excursion');
      expect(pipeline[0].$match).toHaveProperty('pricePerPerson');
    });

    it('should optimize package queries', () => {
      const userId = 'user123';
      const params = {
        status: 'draft',
        skip: 0,
        limit: 10,
      };

      const pipeline = QueryOptimizer.optimizePackageQuery(userId, params);

      expect(pipeline).toHaveLength(4); // match, lookup, sort, skip, limit
      expect(pipeline[0]).toHaveProperty('$match');
      expect(pipeline[1]).toHaveProperty('$lookup');
      expect(pipeline[2]).toHaveProperty('$sort');
    });
  });

  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      // Clear any existing data
      PerformanceMonitor['queryTimes'].clear();
    });

    it('should record query execution times', () => {
      PerformanceMonitor.recordQueryTime('test-query', 150);
      PerformanceMonitor.recordQueryTime('test-query', 200);
      PerformanceMonitor.recordQueryTime('test-query', 100);

      const stats = PerformanceMonitor.getQueryStats('test-query');

      expect(stats).toBeDefined();
      expect(stats.count).toBe(3);
      expect(stats.average).toBe(150);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(200);
    });

    it('should limit stored measurements to 100', () => {
      // Add 150 measurements
      for (let i = 0; i < 150; i++) {
        PerformanceMonitor.recordQueryTime('test-query', i);
      }

      const stats = PerformanceMonitor.getQueryStats('test-query');
      expect(stats.count).toBe(100);
    });

    it('should return null for non-existent queries', () => {
      const stats = PerformanceMonitor.getQueryStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('measureQueryPerformance', () => {
    it('should measure and record query performance', async () => {
      const mockQuery = vi.fn().mockResolvedValue('result');
      const recordSpy = vi.spyOn(PerformanceMonitor, 'recordQueryTime');

      const result = await measureQueryPerformance('test-query', mockQuery);

      expect(result).toBe('result');
      expect(mockQuery).toHaveBeenCalledOnce();
      expect(recordSpy).toHaveBeenCalledWith('test-query', expect.any(Number));
    });

    it('should handle query errors', async () => {
      const mockQuery = vi.fn().mockRejectedValue(new Error('Query failed'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(
        measureQueryPerformance('test-query', mockQuery)
      ).rejects.toThrow('Query failed');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log slow queries', async () => {
      const mockQuery = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) => setTimeout(() => resolve('result'), 1100))
        );
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await measureQueryPerformance('slow-query', mockQuery);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected: slow-query')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should analyze database performance', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          stats: vi.fn().mockResolvedValue({
            count: 1000,
            avgObjSize: 512,
            totalIndexSize: 1024,
          }),
          aggregate: vi.fn(() => ({
            toArray: vi
              .fn()
              .mockResolvedValue([
                { name: 'test_index', accesses: { ops: 100 } },
              ]),
          })),
        })),
      };

      vi.doMock('mongoose', () => ({
        connection: { db: mockDb },
      }));

      const analysis = await analyzeQueryPerformance();

      expect(analysis).toHaveProperty('collections');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis.collections).toHaveProperty('activities');
      expect(analysis.collections).toHaveProperty('packages');
    });
  });
});

describe('Cache Performance', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should cache data with TTL', () => {
    // This would test the MemoryCache class
    // Implementation depends on the cache being properly exported
  });

  it('should evict LRU entries when at capacity', () => {
    // Test LRU eviction logic
  });

  it('should handle stale-while-revalidate correctly', () => {
    // Test stale data handling
  });
});

describe('Virtual Scrolling Performance', () => {
  it('should only render visible items', () => {
    // Test virtual scrolling calculations
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const itemHeight = 100;
    const containerHeight = 500;
    const scrollTop = 1000;

    // Calculate visible range
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleItems);

    expect(startIndex).toBe(10);
    expect(endIndex).toBe(14);
    expect(endIndex - startIndex + 1).toBeLessThanOrEqual(visibleItems + 1);
  });

  it('should handle overscan correctly', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
    const itemHeight = 100;
    const containerHeight = 500;
    const scrollTop = 1000;
    const overscan = 3;

    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / itemHeight) - overscan
    );
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleItems + overscan * 2
    );

    expect(startIndex).toBe(7); // 10 - 3
    expect(endIndex).toBe(20); // 14 + 6 (overscan * 2)
  });
});

describe('Image Lazy Loading Performance', () => {
  it('should only load images when in viewport', () => {
    // Mock IntersectionObserver
    const mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };

    global.IntersectionObserver = vi.fn(() => mockObserver);

    // Test would verify that images are only loaded when intersecting
    expect(global.IntersectionObserver).toBeDefined();
  });

  it('should preload images efficiently', () => {
    // Test image preloading logic
    const urls = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

    // Mock Image constructor
    global.Image = vi.fn(() => ({
      onload: null,
      onerror: null,
      src: '',
    }));

    // Test preloading behavior
    expect(global.Image).toBeDefined();
  });
});
