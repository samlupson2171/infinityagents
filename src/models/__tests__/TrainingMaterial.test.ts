import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import TrainingMaterial from '../TrainingMaterial';

describe('TrainingMaterial Model', () => {
  const creatorId = new mongoose.Types.ObjectId();

  beforeEach(async () => {
    await TrainingMaterial.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a valid video training material', async () => {
      const materialData = {
        title: 'Introduction to Travel Sales',
        description:
          'A comprehensive video guide to travel sales techniques and best practices.',
        type: 'video' as const,
        contentUrl: 'https://example.com/video/intro-sales',
        createdBy: creatorId,
      };

      const material = new TrainingMaterial(materialData);
      const savedMaterial = await material.save();

      expect(savedMaterial._id).toBeDefined();
      expect(savedMaterial.title).toBe(materialData.title);
      expect(savedMaterial.description).toBe(materialData.description);
      expect(savedMaterial.type).toBe(materialData.type);
      expect(savedMaterial.contentUrl).toBe(materialData.contentUrl);
      expect(savedMaterial.fileUrl).toBeUndefined();
      expect(savedMaterial.isActive).toBe(true);
      expect(savedMaterial.createdBy).toEqual(creatorId);
    });

    it('should create a valid blog training material', async () => {
      const materialData = {
        title: 'Best Practices for Customer Service',
        description:
          'A detailed blog post about providing excellent customer service in travel industry.',
        type: 'blog' as const,
        contentUrl: 'https://example.com/blog/customer-service',
        createdBy: creatorId,
      };

      const material = new TrainingMaterial(materialData);
      const savedMaterial = await material.save();

      expect(savedMaterial.type).toBe('blog');
      expect(savedMaterial.contentUrl).toBe(materialData.contentUrl);
      expect(savedMaterial.fileUrl).toBeUndefined();
    });

    it('should create a valid download training material', async () => {
      const materialData = {
        title: 'Travel Industry Guidelines PDF',
        description:
          'Comprehensive guidelines document for travel industry professionals.',
        type: 'download' as const,
        fileUrl: 'https://example.com/files/guidelines.pdf',
        createdBy: creatorId,
      };

      const material = new TrainingMaterial(materialData);
      const savedMaterial = await material.save();

      expect(savedMaterial.type).toBe('download');
      expect(savedMaterial.fileUrl).toBe(materialData.fileUrl);
      expect(savedMaterial.contentUrl).toBeUndefined();
    });

    it('should validate type enum values', async () => {
      const baseMaterial = {
        title: 'Test Material',
        description: 'Test description for the material',
        contentUrl: 'https://example.com/content',
        createdBy: creatorId,
      };

      const validTypes = ['video', 'blog', 'download'];
      for (const type of validTypes) {
        const material = new TrainingMaterial({
          ...baseMaterial,
          type: type as any,
          ...(type === 'download'
            ? { fileUrl: 'https://example.com/file.pdf', contentUrl: undefined }
            : {}),
        });
        await expect(material.save()).resolves.toBeTruthy();
        await material.deleteOne();
      }

      const invalidMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'invalid' as any,
      });
      await expect(invalidMaterial.save()).rejects.toThrow();
    });

    it('should validate title length constraints', async () => {
      const baseMaterial = {
        description: 'Valid description for the material',
        type: 'video' as const,
        contentUrl: 'https://example.com/content',
        createdBy: creatorId,
      };

      // Too short title
      const shortTitleMaterial = new TrainingMaterial({
        ...baseMaterial,
        title: 'Hi',
      });
      await expect(shortTitleMaterial.save()).rejects.toThrow();

      // Too long title
      const longTitleMaterial = new TrainingMaterial({
        ...baseMaterial,
        title: 'A'.repeat(201),
      });
      await expect(longTitleMaterial.save()).rejects.toThrow();

      // Valid title
      const validMaterial = new TrainingMaterial({
        ...baseMaterial,
        title: 'Valid Material Title',
      });
      await expect(validMaterial.save()).resolves.toBeTruthy();
    });

    it('should validate description length constraints', async () => {
      const baseMaterial = {
        title: 'Valid Material Title',
        type: 'video' as const,
        contentUrl: 'https://example.com/content',
        createdBy: creatorId,
      };

      // Too short description
      const shortDescMaterial = new TrainingMaterial({
        ...baseMaterial,
        description: 'Short',
      });
      await expect(shortDescMaterial.save()).rejects.toThrow();

      // Too long description
      const longDescMaterial = new TrainingMaterial({
        ...baseMaterial,
        description: 'A'.repeat(1001),
      });
      await expect(longDescMaterial.save()).rejects.toThrow();

      // Valid description
      const validMaterial = new TrainingMaterial({
        ...baseMaterial,
        description: 'This is a valid description for the material',
      });
      await expect(validMaterial.save()).resolves.toBeTruthy();
    });

    it('should require contentUrl for video and blog types', async () => {
      const baseMaterial = {
        title: 'Test Material',
        description: 'Test description for the material',
        createdBy: creatorId,
      };

      // Video without contentUrl should fail
      const videoMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'video',
      });
      await expect(videoMaterial.save()).rejects.toThrow();

      // Blog without contentUrl should fail
      const blogMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'blog',
      });
      await expect(blogMaterial.save()).rejects.toThrow();
    });

    it('should require fileUrl for download type', async () => {
      const baseMaterial = {
        title: 'Test Material',
        description: 'Test description for the material',
        createdBy: creatorId,
      };

      // Download without fileUrl should fail
      const downloadMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'download',
      });
      await expect(downloadMaterial.save()).rejects.toThrow();
    });

    it('should validate URL formats', async () => {
      const baseMaterial = {
        title: 'Test Material',
        description: 'Test description for the material',
        createdBy: creatorId,
      };

      // Invalid contentUrl
      const invalidContentUrlMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'video',
        contentUrl: 'not-a-url',
      });
      await expect(invalidContentUrlMaterial.save()).rejects.toThrow();

      // Invalid fileUrl
      const invalidFileUrlMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'download',
        fileUrl: 'not-a-url',
      });
      await expect(invalidFileUrlMaterial.save()).rejects.toThrow();

      // Valid URLs
      const validVideoMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'video',
        contentUrl: 'https://example.com/video',
      });
      await expect(validVideoMaterial.save()).resolves.toBeTruthy();

      const validDownloadMaterial = new TrainingMaterial({
        ...baseMaterial,
        type: 'download',
        fileUrl: 'https://example.com/file.pdf',
      });
      await expect(validDownloadMaterial.save()).resolves.toBeTruthy();
    });

    it('should clear inappropriate URL fields based on type', async () => {
      // Video material should clear fileUrl
      const videoMaterial = new TrainingMaterial({
        title: 'Video Material',
        description: 'Video description',
        type: 'video',
        contentUrl: 'https://example.com/video',
        fileUrl: 'https://example.com/file.pdf', // This should be cleared
        createdBy: creatorId,
      });

      const savedVideoMaterial = await videoMaterial.save();
      expect(savedVideoMaterial.contentUrl).toBe('https://example.com/video');
      expect(savedVideoMaterial.fileUrl).toBeUndefined();

      // Download material should clear contentUrl
      const downloadMaterial = new TrainingMaterial({
        title: 'Download Material',
        description: 'Download description',
        type: 'download',
        contentUrl: 'https://example.com/video', // This should be cleared
        fileUrl: 'https://example.com/file.pdf',
        createdBy: creatorId,
      });

      const savedDownloadMaterial = await downloadMaterial.save();
      expect(savedDownloadMaterial.fileUrl).toBe(
        'https://example.com/file.pdf'
      );
      expect(savedDownloadMaterial.contentUrl).toBeUndefined();
    });

    it('should require all mandatory fields', async () => {
      const requiredFields = ['title', 'description', 'type', 'createdBy'];

      for (const field of requiredFields) {
        const materialData = {
          title: 'Valid Title',
          description: 'Valid description for the material',
          type: 'video',
          contentUrl: 'https://example.com/content',
          createdBy: creatorId,
        };

        delete (materialData as any)[field];
        const material = new TrainingMaterial(materialData);

        await expect(material.save()).rejects.toThrow();
      }
    });
  });

  describe('Instance Methods', () => {
    it('should activate a material correctly', async () => {
      const material = new TrainingMaterial({
        title: 'Test Material',
        description: 'Test description for the material',
        type: 'video',
        contentUrl: 'https://example.com/content',
        isActive: false,
        createdBy: creatorId,
      });

      await material.save();
      await material.activate();

      expect(material.isActive).toBe(true);
    });

    it('should deactivate a material correctly', async () => {
      const material = new TrainingMaterial({
        title: 'Test Material',
        description: 'Test description for the material',
        type: 'video',
        contentUrl: 'https://example.com/content',
        isActive: true,
        createdBy: creatorId,
      });

      await material.save();
      await material.deactivate();

      expect(material.isActive).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should find active materials by type correctly', async () => {
      const videoMaterial = new TrainingMaterial({
        title: 'Video Material',
        description: 'Video description',
        type: 'video',
        contentUrl: 'https://example.com/video',
        isActive: true,
        createdBy: creatorId,
      });

      const blogMaterial = new TrainingMaterial({
        title: 'Blog Material',
        description: 'Blog description',
        type: 'blog',
        contentUrl: 'https://example.com/blog',
        isActive: true,
        createdBy: creatorId,
      });

      const inactiveVideoMaterial = new TrainingMaterial({
        title: 'Inactive Video',
        description: 'Inactive video description',
        type: 'video',
        contentUrl: 'https://example.com/inactive-video',
        isActive: false,
        createdBy: creatorId,
      });

      await videoMaterial.save();
      await blogMaterial.save();
      await inactiveVideoMaterial.save();

      const activeVideos = await TrainingMaterial.findActiveByType('video');
      expect(activeVideos).toHaveLength(1);
      expect(activeVideos[0].title).toBe('Video Material');

      const activeBlogs = await TrainingMaterial.findActiveByType('blog');
      expect(activeBlogs).toHaveLength(1);
      expect(activeBlogs[0].title).toBe('Blog Material');
    });

    it('should find all active materials correctly', async () => {
      const videoMaterial = new TrainingMaterial({
        title: 'Video Material',
        description: 'Video description',
        type: 'video',
        contentUrl: 'https://example.com/video',
        isActive: true,
        createdBy: creatorId,
      });

      const blogMaterial = new TrainingMaterial({
        title: 'Blog Material',
        description: 'Blog description',
        type: 'blog',
        contentUrl: 'https://example.com/blog',
        isActive: true,
        createdBy: creatorId,
      });

      const inactiveMaterial = new TrainingMaterial({
        title: 'Inactive Material',
        description: 'Inactive description',
        type: 'download',
        fileUrl: 'https://example.com/file.pdf',
        isActive: false,
        createdBy: creatorId,
      });

      await videoMaterial.save();
      await blogMaterial.save();
      await inactiveMaterial.save();

      const activeMaterials = await TrainingMaterial.findAllActive();
      expect(activeMaterials).toHaveLength(2);
    });

    it('should find materials by creator correctly', async () => {
      const creator1Id = new mongoose.Types.ObjectId();
      const creator2Id = new mongoose.Types.ObjectId();

      const material1 = new TrainingMaterial({
        title: 'Material by Creator 1',
        description: 'Material description',
        type: 'video',
        contentUrl: 'https://example.com/video',
        createdBy: creator1Id,
      });

      const material2 = new TrainingMaterial({
        title: 'Material by Creator 2',
        description: 'Material description',
        type: 'blog',
        contentUrl: 'https://example.com/blog',
        createdBy: creator2Id,
      });

      await material1.save();
      await material2.save();

      const creator1Materials =
        await TrainingMaterial.findByCreator(creator1Id);
      expect(creator1Materials).toHaveLength(1);
      expect(creator1Materials[0].title).toBe('Material by Creator 1');
    });
  });
});
