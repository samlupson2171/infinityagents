import mongoose, { Document, Schema } from 'mongoose';

// Interface for tracking changes made to individual offers
export interface IOfferChange {
  offerId: mongoose.Types.ObjectId;
  action: 'created' | 'updated' | 'failed';
  changes: Record<string, any>;
  previousValues?: Record<string, any>;
  errorMessage?: string;
}

// Interface for import summary statistics
export interface IImportSummary {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  processingTimeMs: number;
}

// Interface for import history document
export interface IImportHistory extends Document {
  importId: string;
  filename: string;
  fileSize: number;
  originalFilename: string;
  importedBy: mongoose.Types.ObjectId;
  importedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rolled-back';
  summary: IImportSummary;
  affectedOffers: IOfferChange[];
  errorMessages: string[];
  warnings: string[];
  rollbackData?: Record<string, any>;
  rollbackId?: string;
  rollbackAt?: Date;
  rollbackBy?: mongoose.Types.ObjectId;
  metadata: {
    fileType: string;
    sheetNames?: string[];
    detectedLayout?: string;
    processingOptions?: Record<string, any>;
  };
}

// Schema for offer changes
const OfferChangeSchema = new Schema({
  offerId: {
    type: Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: ['created', 'updated', 'failed']
  },
  changes: {
    type: Schema.Types.Mixed,
    required: true
  },
  previousValues: {
    type: Schema.Types.Mixed
  },
  errorMessage: {
    type: String,
    trim: true
  }
});

// Schema for import summary
const ImportSummarySchema = new Schema({
  totalProcessed: {
    type: Number,
    required: true,
    min: 0
  },
  created: {
    type: Number,
    required: true,
    min: 0
  },
  updated: {
    type: Number,
    required: true,
    min: 0
  },
  skipped: {
    type: Number,
    required: true,
    min: 0
  },
  failed: {
    type: Number,
    required: true,
    min: 0
  },
  processingTimeMs: {
    type: Number,
    required: true,
    min: 0
  }
});

// Schema for import metadata
const ImportMetadataSchema = new Schema({
  fileType: {
    type: String,
    required: true,
    enum: ['xlsx', 'xls', 'csv']
  },
  sheetNames: [{
    type: String,
    trim: true
  }],
  detectedLayout: {
    type: String,
    enum: ['months-rows', 'months-columns', 'mixed', 'unknown']
  },
  processingOptions: {
    type: Schema.Types.Mixed
  }
});

// Main import history schema
const ImportHistorySchema = new Schema<IImportHistory>(
  {
    importId: {
      type: String,
      required: [true, 'Import ID is required'],
      unique: true,
      trim: true,
      index: true
    },
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      trim: true
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      min: 0
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true
    },
    importedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Importer is required'],
      index: true
    },
    importedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed', 'rolled-back'],
      default: 'pending',
      index: true
    },
    summary: {
      type: ImportSummarySchema,
      required: true
    },
    affectedOffers: {
      type: [OfferChangeSchema],
      default: []
    },
    errorMessages: {
      type: [String],
      default: []
    },
    warnings: {
      type: [String],
      default: []
    },
    rollbackData: {
      type: Schema.Types.Mixed
    },
    rollbackId: {
      type: String,
      trim: true
    },
    rollbackAt: {
      type: Date
    },
    rollbackBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    metadata: {
      type: ImportMetadataSchema,
      required: true
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ImportHistorySchema.index({ importedBy: 1, importedAt: -1 });
ImportHistorySchema.index({ status: 1, importedAt: -1 });
ImportHistorySchema.index({ 'affectedOffers.offerId': 1 });
ImportHistorySchema.index({ rollbackId: 1 });

// Static methods
ImportHistorySchema.statics.findByUser = function (userId: mongoose.Types.ObjectId) {
  return this.find({ importedBy: userId }).sort({ importedAt: -1 });
};

ImportHistorySchema.statics.findByStatus = function (status: string) {
  return this.find({ status }).sort({ importedAt: -1 });
};

ImportHistorySchema.statics.findRecentImports = function (limit: number = 50) {
  return this.find().sort({ importedAt: -1 }).limit(limit);
};

ImportHistorySchema.statics.findByDateRange = function (startDate: Date, endDate: Date) {
  return this.find({
    importedAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ importedAt: -1 });
};

// Instance methods
ImportHistorySchema.methods.markAsCompleted = function (summary: IImportSummary) {
  this.status = 'completed';
  this.summary = summary;
  return this.save();
};

ImportHistorySchema.methods.markAsFailed = function (errors: string[]) {
  this.status = 'failed';
  this.errorMessages = errors;
  return this.save();
};

ImportHistorySchema.methods.addError = function (error: string) {
  this.errorMessages.push(error);
  return this.save();
};

ImportHistorySchema.methods.addWarning = function (warning: string) {
  this.warnings.push(warning);
  return this.save();
};

ImportHistorySchema.methods.rollback = function (rollbackBy: mongoose.Types.ObjectId, rollbackData: Record<string, any>) {
  this.status = 'rolled-back';
  this.rollbackAt = new Date();
  this.rollbackBy = rollbackBy;
  this.rollbackData = rollbackData;
  return this.save();
};

export default mongoose.models.ImportHistory ||
  mongoose.model<IImportHistory>('ImportHistory', ImportHistorySchema);