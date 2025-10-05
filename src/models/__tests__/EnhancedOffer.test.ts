import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import Offer, { IOffer, IFlexiblePricing, IOfferMetadata } from '../Offer';
import ImportHistory, { IImportHistory, IImportSummary } from '../ImportHistory';
import User from '../User';

describe('Enhanced Offer Model', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a test user with all required fields
    const testUser = new User({
      name: 'Test User',
      companyName: 'Test Company Ltd',
      abtaPtsNumber: 'ABTA12345',
      contactEmail: 'test@example.com',
      websiteAddress: 'https://www.testcompany.com',
      password: 'hashedpassword123',
      role: 'admin',
      isApproved: true
    });
    await testUser.save();
    testUserId = testUser._id;
  });

  describe('Flexible Pricing Structure', () => {
    it('should create offer with flexible pricing', async () => {
      const flexiblePricing: IFlexiblePricing[] = [
        {
          month: 'January',
          accommodationType: 'Hotel',
          nights: 3,
          pax: 2,
          price: 299,
          currency: 'EUR',
          isAvailable: true
        },
        {
          month: 'January',
          accommodationType: 'Self-Catering',
          nights: 3,
          pax: 4,
          price: 399,
          currency: 'EUR',
          isAvailable: true,
          specialPeriod: 'New Year',
          notes: 'Special New Year package'
        }
      ];

      const metadata: IOfferMetadata = {
        currency: 'EUR',
        season: '2025',
        lastUpdated: new Date(),
        importSource: 'test',
        version: 1
      };

      const offer = new Offer({
        title: 'Test Resort Package',
        description: 'A test resort package with flexible pricing',
        destination: 'Benidorm',
        resortName: 'Test Resort',
        inclusions: ['Accommodation', 'Breakfast'],
        exclusions: ['Flights', 'Insurance'],
        flexiblePricing,
        metadata,
        createdBy: testUserId
      });

      const savedOffer = await offer.save();

      expect(savedOffer.flexiblePricing).toHaveLength(2);
      expect(savedOffer.flexiblePricing![0].accommodationType).toBe('Hotel');
      expect(savedOffer.flexiblePricing![1].specialPeriod).toBe('New Year');
      expect(savedOffer.metadata.currency).toBe('EUR');
      expect(savedOffer.resortName).toBe('Test Resort');
      expect(savedOffer.exclusions).toHaveLength(2);
    });

    it('should validate flexible pricing constraints', async () => {
      const invalidPricing: IFlexiblePricing[] = [
        {
          month: 'January',
          accommodationType: 'InvalidType' as any,
          nights: 25, // Invalid: max 14
          pax: 0, // Invalid: min 1
          price: -100, // Invalid: min 0
          currency: 'INVALID' as any,
          isAvailable: true
        }
      ];

      const metadata: IOfferMetadata = {
        currency: 'EUR',
        season: '2025',
        lastUpdated: new Date(),
        version: 1
      };

      const offer = new Offer({
        title: 'Invalid Offer',
        description: 'An offer with invalid pricing',
        destination: 'Benidorm',
        inclusions: ['Test'],
        flexiblePricing: invalidPricing,
        metadata,
        createdBy: testUserId
      });

      await expect(offer.save()).rejects.toThrow();
    });

    it('should allow legacy pricing for backward compatibility', async () => {
      const legacyPricing = [
        {
          month: 'January',
          hotel: {
            twoNights: 199,
            threeNights: 299,
            fourNights: 399
          },
          selfCatering: {
            twoNights: 149,
            threeNights: 249,
            fourNights: 349
          }
        }
      ];

      const metadata: IOfferMetadata = {
        currency: 'EUR',
        season: '2025',
        lastUpdated: new Date(),
        version: 1
      };

      const offer = new Offer({
        title: 'Legacy Offer',
        description: 'An offer with legacy pricing',
        destination: 'Benidorm',
        inclusions: ['Test'],
        pricing: legacyPricing,
        metadata,
        createdBy: testUserId
      });

      const savedOffer = await offer.save();
      expect(savedOffer.pricing).toHaveLength(1);
      expect(savedOffer.pricing![0].hotel.threeNights).toBe(299);
    });
  });

  describe('Metadata and Versioning', () => {
    it('should track import metadata', async () => {
      const metadata: IOfferMetadata = {
        currency: 'EUR',
        season: '2025',
        lastUpdated: new Date(),
        importSource: 'excel-import',
        version: 2,
        originalFilename: 'benidorm-2025.xlsx',
        importId: 'import-123'
      };

      const offer = new Offer({
        title: 'Imported Offer',
        description: 'An offer imported from Excel',
        destination: 'Benidorm',
        inclusions: ['Test'],
        flexiblePricing: [{
          month: 'January',
          accommodationType: 'Hotel',
          nights: 3,
          pax: 2,
          price: 299,
          currency: 'EUR',
          isAvailable: true
        }],
        metadata,
        createdBy: testUserId
      });

      const savedOffer = await offer.save();
      expect(savedOffer.metadata.importSource).toBe('excel-import');
      expect(savedOffer.metadata.originalFilename).toBe('benidorm-2025.xlsx');
      expect(savedOffer.metadata.version).toBe(2);
    });
  });
});

describe('Import History Model', () => {
  let testUserId: mongoose.Types.ObjectId;

  beforeEach(async () => {
    // Create a test user with all required fields
    const testUser = new User({
      name: 'Test User 2',
      companyName: 'Test Company Ltd 2',
      abtaPtsNumber: 'ABTA54321',
      contactEmail: 'testuser@example.com',
      websiteAddress: 'https://www.testuser.com',
      password: 'hashedpassword123',
      role: 'admin',
      isApproved: true
    });
    await testUser.save();
    testUserId = testUser._id;
  });

  it('should create import history record', async () => {
    const summary: IImportSummary = {
      totalProcessed: 10,
      created: 8,
      updated: 2,
      skipped: 0,
      failed: 0,
      processingTimeMs: 5000
    };

    const importHistory = new ImportHistory({
      importId: 'import-test-123',
      filename: 'test-offers.xlsx',
      fileSize: 1024000,
      originalFilename: 'Benidorm Offers 2025.xlsx',
      importedBy: testUserId,
      status: 'completed',
      summary,
      affectedOffers: [
        {
          offerId: new mongoose.Types.ObjectId(),
          action: 'created',
          changes: { title: 'New Offer' }
        }
      ],
      errorMessages: [],
      warnings: ['Some minor warnings'],
      metadata: {
        fileType: 'xlsx',
        sheetNames: ['Sheet1', 'Pricing'],
        detectedLayout: 'months-rows'
      }
    });

    const savedHistory = await importHistory.save();

    expect(savedHistory.importId).toBe('import-test-123');
    expect(savedHistory.status).toBe('completed');
    expect(savedHistory.summary.created).toBe(8);
    expect(savedHistory.affectedOffers).toHaveLength(1);
    expect(savedHistory.metadata.fileType).toBe('xlsx');
  });

  it('should use instance methods correctly', async () => {
    const importHistory = new ImportHistory({
      importId: 'import-test-456',
      filename: 'test.xlsx',
      fileSize: 1024,
      originalFilename: 'test.xlsx',
      importedBy: testUserId,
      status: 'pending',
      summary: {
        totalProcessed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        processingTimeMs: 0
      },
      affectedOffers: [],
      errorMessages: [],
      warnings: [],
      metadata: {
        fileType: 'xlsx'
      }
    });

    await importHistory.save();

    // Test markAsCompleted
    const summary: IImportSummary = {
      totalProcessed: 5,
      created: 5,
      updated: 0,
      skipped: 0,
      failed: 0,
      processingTimeMs: 2000
    };

    await importHistory.markAsCompleted(summary);
    expect(importHistory.status).toBe('completed');
    expect(importHistory.summary.created).toBe(5);

    // Test addError
    await importHistory.addError('Test error message');
    expect(importHistory.errorMessages).toContain('Test error message');

    // Test addWarning
    await importHistory.addWarning('Test warning message');
    expect(importHistory.warnings).toContain('Test warning message');
  });

  it('should use static methods correctly', async () => {
    // Create test import histories
    const history1 = new ImportHistory({
      importId: 'import-1',
      filename: 'test1.xlsx',
      fileSize: 1024,
      originalFilename: 'test1.xlsx',
      importedBy: testUserId,
      status: 'completed',
      summary: { totalProcessed: 1, created: 1, updated: 0, skipped: 0, failed: 0, processingTimeMs: 1000 },
      affectedOffers: [],
      errorMessages: [],
      warnings: [],
      metadata: { fileType: 'xlsx' }
    });

    const history2 = new ImportHistory({
      importId: 'import-2',
      filename: 'test2.xlsx',
      fileSize: 2048,
      originalFilename: 'test2.xlsx',
      importedBy: testUserId,
      status: 'failed',
      summary: { totalProcessed: 0, created: 0, updated: 0, skipped: 0, failed: 1, processingTimeMs: 500 },
      affectedOffers: [],
      errorMessages: ['Import failed'],
      warnings: [],
      metadata: { fileType: 'xlsx' }
    });

    await history1.save();
    await history2.save();

    // Test findByUser
    const userImports = await ImportHistory.findByUser(testUserId);
    expect(userImports).toHaveLength(2);

    // Test findByStatus
    const completedImports = await ImportHistory.findByStatus('completed');
    expect(completedImports).toHaveLength(1);
    expect(completedImports[0].importId).toBe('import-1');

    const failedImports = await ImportHistory.findByStatus('failed');
    expect(failedImports).toHaveLength(1);
    expect(failedImports[0].importId).toBe('import-2');

    // Test findRecentImports
    const recentImports = await ImportHistory.findRecentImports(10);
    expect(recentImports).toHaveLength(2);
  });
});