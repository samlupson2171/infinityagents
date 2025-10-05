import mongoose, { Document, Schema } from 'mongoose';

export interface IFileStorage extends Document {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  associatedMaterial?: mongoose.Types.ObjectId;
  isOrphaned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FileStorageSchema = new Schema<IFileStorage>(
  {
    id: {
      type: String,
      required: [true, 'File ID is required'],
      unique: true,
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'Original file name cannot exceed 255 characters'],
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
      trim: true,
      maxlength: [500, 'File path cannot exceed 500 characters'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
      validate: {
        validator: function (mimeType: string) {
          // Validate allowed MIME types for training materials
          const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
          ];
          return allowedTypes.includes(mimeType);
        },
        message:
          'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, PNG, GIF, and WEBP files are allowed.',
      },
    },
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [1, 'File size must be greater than 0'],
      max: [10 * 1024 * 1024, 'File size cannot exceed 10MB'], // 10MB limit
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader is required'],
      index: true,
    },
    associatedMaterial: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingMaterial',
      index: true,
    },
    isOrphaned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
FileStorageSchema.index({ uploadedBy: 1, createdAt: -1 });
FileStorageSchema.index({ associatedMaterial: 1 });
FileStorageSchema.index({ isOrphaned: 1, createdAt: -1 });
FileStorageSchema.index({ mimeType: 1 });

// Static methods
FileStorageSchema.statics.findByMaterial = function (
  materialId: mongoose.Types.ObjectId
) {
  return this.find({ associatedMaterial: materialId, isOrphaned: false }).sort({
    createdAt: -1,
  });
};

FileStorageSchema.statics.findOrphanedFiles = function (
  olderThanDays: number = 7
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return this.find({
    isOrphaned: true,
    createdAt: { $lt: cutoffDate },
  }).sort({ createdAt: -1 });
};

FileStorageSchema.statics.findByUploader = function (
  uploaderId: mongoose.Types.ObjectId
) {
  return this.find({ uploadedBy: uploaderId, isOrphaned: false }).sort({
    createdAt: -1,
  });
};

FileStorageSchema.statics.getTotalSizeByUploader = function (
  uploaderId: mongoose.Types.ObjectId
) {
  return this.aggregate([
    { $match: { uploadedBy: uploaderId, isOrphaned: false } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);
};

// Instance methods
FileStorageSchema.methods.markAsOrphaned = function () {
  this.isOrphaned = true;
  this.associatedMaterial = undefined;
  return this.save();
};

FileStorageSchema.methods.associateWithMaterial = function (
  materialId: mongoose.Types.ObjectId
) {
  this.associatedMaterial = materialId;
  this.isOrphaned = false;
  return this.save();
};

FileStorageSchema.methods.getFileExtension = function () {
  return this.originalName.split('.').pop()?.toLowerCase() || '';
};

FileStorageSchema.methods.isImage = function () {
  return this.mimeType.startsWith('image/');
};

FileStorageSchema.methods.isDocument = function () {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  return documentTypes.includes(this.mimeType);
};

export default mongoose.models.FileStorage ||
  mongoose.model<IFileStorage>('FileStorage', FileStorageSchema);
