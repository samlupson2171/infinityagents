import mongoose, { Document, Schema } from 'mongoose';

export interface IUploadedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface ITrainingMaterial extends Document {
  title: string;
  description: string;
  type: 'video' | 'blog' | 'download';

  // Video content (unchanged)
  contentUrl?: string;

  // Rich content for blog materials
  richContent?: string;
  richContentImages?: string[]; // Array of image file IDs

  // File uploads for download materials
  uploadedFiles?: IUploadedFile[];

  // Legacy support (deprecated)
  fileUrl?: string; // For backward compatibility

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const UploadedFileSchema = new Schema<IUploadedFile>(
  {
    id: { type: String, required: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TrainingMaterialSchema = new Schema<ITrainingMaterial>(
  {
    title: {
      type: String,
      required: [true, 'Training material title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Training material description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      required: [true, 'Training material type is required'],
      enum: {
        values: ['video', 'blog', 'download'],
        message: 'Type must be video, blog, or download',
      },
    },

    // Video content (unchanged)
    contentUrl: {
      type: String,
      validate: {
        validator: function (this: ITrainingMaterial, url: string) {
          // Content URL is required for video type only (blog now uses richContent)
          if (this.type === 'video' && !url) {
            return false;
          }
          // If URL is provided, it should be valid
          if (url) {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          }
          return true;
        },
        message:
          'Content URL is required for video type and must be a valid URL',
      },
    },

    // Rich content for blog materials
    richContent: {
      type: String,
      validate: {
        validator: function (this: ITrainingMaterial, content: string) {
          // Rich content is required for blog type (unless legacy contentUrl exists)
          if (this.type === 'blog' && !content && !this.contentUrl) {
            return false;
          }
          return true;
        },
        message: 'Rich content is required for blog type materials',
      },
    },
    richContentImages: [{ type: String }], // File IDs for embedded images

    // File uploads for download materials
    uploadedFiles: [UploadedFileSchema],

    // Legacy support (deprecated)
    fileUrl: {
      type: String,
      validate: {
        validator: function (this: ITrainingMaterial, url: string) {
          // File URL is required for download type only if no uploaded files
          if (
            this.type === 'download' &&
            !url &&
            (!this.uploadedFiles || this.uploadedFiles.length === 0)
          ) {
            return false;
          }
          // If URL is provided, it should be valid
          if (url) {
            try {
              new URL(url);
              return true;
            } catch {
              return false;
            }
          }
          return true;
        },
        message: 'File URL or uploaded files are required for download type',
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
TrainingMaterialSchema.index({ type: 1, isActive: 1, createdAt: -1 });
TrainingMaterialSchema.index({ createdBy: 1 });
TrainingMaterialSchema.index({ isActive: 1 });

// Pre-save validation to ensure proper content fields based on type
TrainingMaterialSchema.pre('save', function (next) {
  if (this.type === 'video') {
    if (!this.contentUrl) {
      return next(new Error('Content URL is required for video type'));
    }
    // Clear blog and download specific fields for video type
    this.richContent = undefined;
    this.richContentImages = undefined;
    this.uploadedFiles = undefined;
    this.fileUrl = undefined;
  } else if (this.type === 'blog') {
    // Blog type requires either richContent (new) or contentUrl (legacy)
    if (!this.richContent && !this.contentUrl) {
      return next(
        new Error('Rich content or content URL is required for blog type')
      );
    }
    // Clear download specific fields for blog type
    this.uploadedFiles = undefined;
    this.fileUrl = undefined;
  } else if (this.type === 'download') {
    // Download type requires either uploadedFiles (new) or fileUrl (legacy)
    if (
      (!this.uploadedFiles || this.uploadedFiles.length === 0) &&
      !this.fileUrl
    ) {
      return next(
        new Error('Uploaded files or file URL is required for download type')
      );
    }
    // Clear video and blog specific fields for download type
    this.contentUrl = undefined;
    this.richContent = undefined;
    this.richContentImages = undefined;
  }
  next();
});

// Static methods
TrainingMaterialSchema.statics.findActiveByType = function (
  type: 'video' | 'blog' | 'download'
) {
  return this.find({ type, isActive: true }).sort({ createdAt: -1 });
};

TrainingMaterialSchema.statics.findAllActive = function () {
  return this.find({ isActive: true }).sort({ type: 1, createdAt: -1 });
};

TrainingMaterialSchema.statics.findByCreator = function (
  creatorId: mongoose.Types.ObjectId
) {
  return this.find({ createdBy: creatorId }).sort({ createdAt: -1 });
};

// Instance methods
TrainingMaterialSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

TrainingMaterialSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

export default mongoose.models.TrainingMaterial ||
  mongoose.model<ITrainingMaterial>('TrainingMaterial', TrainingMaterialSchema);
