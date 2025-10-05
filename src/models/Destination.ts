import mongoose, { Document, Schema } from 'mongoose';

// Destination section interface
export interface IDestinationSection {
  title: string;
  content: string; // Rich HTML content
  images?: string[];
  highlights?: string[];
  tips?: string[];
  lastModified: Date;
  aiGenerated: boolean;
}

// File upload interface
export interface IDestinationFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'pdf' | 'excel' | 'image' | 'document';
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  description?: string;
  isPublic: boolean;
}

// Quick facts interface
export interface IQuickFacts {
  population?: string;
  language?: string;
  currency?: string;
  timeZone?: string;
  airport?: string;
  flightTime?: string;
  climate?: string;
  bestTime?: string;
}

// Publishing history entry interface
export interface IPublishingHistoryEntry {
  action: 'published' | 'unpublished' | 'archived' | 'scheduled' | 'approved' | 'rejected';
  timestamp: Date;
  performedBy: mongoose.Types.ObjectId;
  previousStatus?: 'draft' | 'published' | 'archived';
  newStatus: 'draft' | 'published' | 'archived';
  scheduledFor?: Date;
  comment?: string;
  version?: number;
}

// Approval workflow interface
export interface IApprovalWorkflow {
  isRequired: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'not_required';
  requestedBy?: mongoose.Types.ObjectId;
  requestedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  comments?: string;
  approvalLevel: 'editor' | 'admin' | 'super_admin';
}

// Main destination interface
export interface IDestination extends Document {
  // Basic Information
  name: string;
  slug: string;
  country: string;
  region: string;
  description: string;
  
  // SEO and Metadata
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  
  // Visual Elements
  heroImage?: string;
  galleryImages?: string[];
  gradientColors: string;
  
  // Content Sections
  sections: {
    overview: IDestinationSection;
    accommodation: IDestinationSection;
    attractions: IDestinationSection;
    beaches: IDestinationSection;
    nightlife: IDestinationSection;
    dining: IDestinationSection;
    practical: IDestinationSection;
  };
  
  // Quick Information
  quickFacts: IQuickFacts;
  
  // Publishing and Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  scheduledPublishAt?: Date;
  
  // Publishing History and Workflow
  publishingHistory: IPublishingHistoryEntry[];
  approvalWorkflow: IApprovalWorkflow;
  version: number;
  previousVersions?: {
    version: number;
    data: Partial<IDestination>;
    savedAt: Date;
    savedBy: mongoose.Types.ObjectId;
  }[];
  
  // AI Generation Metadata
  aiGenerated: boolean;
  aiGenerationPrompt?: string;
  aiGenerationDate?: Date;
  
  // File Uploads
  files: IDestinationFile[];
  
  // Relations
  relatedOffers?: mongoose.Types.ObjectId[];
  relatedActivities?: mongoose.Types.ObjectId[];
  relatedDestinations?: mongoose.Types.ObjectId[];
  
  // Audit Fields
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  publish(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  unpublish(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  archive(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  schedulePublish(date: Date, userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  requestApproval(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  approveContent(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  rejectContent(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination>;
  saveVersion(userId: mongoose.Types.ObjectId): Promise<IDestination>;
  rollbackToVersion(version: number, userId: mongoose.Types.ObjectId): Promise<IDestination>;
  generateSlug(): string;
}

// Destination section schema
const DestinationSectionSchema = new Schema<IDestinationSection>({
  title: {
    type: String,
    required: [true, 'Section title is required'],
    trim: true,
    minlength: [2, 'Section title must be at least 2 characters long'],
    maxlength: [100, 'Section title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Section content is required'],
    trim: true,
    minlength: [10, 'Section content must be at least 10 characters long'],
    maxlength: [10000, 'Section content cannot exceed 10000 characters']
  },
  images: [{
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url);
      },
      message: 'Image must be a valid URL ending with jpg, jpeg, png, webp, or gif'
    }
  }],
  highlights: [{
    type: String,
    trim: true,
    minlength: [3, 'Highlight must be at least 3 characters long'],
    maxlength: [200, 'Highlight cannot exceed 200 characters']
  }],
  tips: [{
    type: String,
    trim: true,
    minlength: [5, 'Tip must be at least 5 characters long'],
    maxlength: [300, 'Tip cannot exceed 300 characters']
  }],
  lastModified: {
    type: Date,
    default: Date.now
  },
  aiGenerated: {
    type: Boolean,
    default: false
  }
});

// Publishing history entry schema
const PublishingHistoryEntrySchema = new Schema<IPublishingHistoryEntry>({
  action: {
    type: String,
    enum: ['published', 'unpublished', 'archived', 'scheduled', 'approved', 'rejected'],
    required: [true, 'Action is required']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: [true, 'Timestamp is required']
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Performer is required']
  },
  previousStatus: {
    type: String,
    enum: ['draft', 'published', 'archived']
  },
  newStatus: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    required: [true, 'New status is required']
  },
  scheduledFor: {
    type: Date
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  version: {
    type: Number
  }
});

// Approval workflow schema
const ApprovalWorkflowSchema = new Schema<IApprovalWorkflow>({
  isRequired: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'not_required'],
    default: 'not_required'
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  requestedAt: {
    type: Date
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comments cannot exceed 1000 characters']
  },
  approvalLevel: {
    type: String,
    enum: ['editor', 'admin', 'super_admin'],
    default: 'admin'
  }
});

// File upload schema
const DestinationFileSchema = new Schema<IDestinationFile>({
  id: {
    type: String,
    required: [true, 'File ID is required'],
    unique: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'excel', 'image', 'document'],
    required: [true, 'File type is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [1, 'File size must be greater than 0']
  },
  url: {
    type: String,
    required: [true, 'File URL is required'],
    trim: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required']
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    required: [true, 'Upload date is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isPublic: {
    type: Boolean,
    default: true
  }
});

// Quick facts schema
const QuickFactsSchema = new Schema<IQuickFacts>({
  population: {
    type: String,
    trim: true,
    maxlength: [50, 'Population cannot exceed 50 characters']
  },
  language: {
    type: String,
    trim: true,
    maxlength: [100, 'Language cannot exceed 100 characters']
  },
  currency: {
    type: String,
    trim: true,
    maxlength: [50, 'Currency cannot exceed 50 characters']
  },
  timeZone: {
    type: String,
    trim: true,
    maxlength: [50, 'Time zone cannot exceed 50 characters']
  },
  airport: {
    type: String,
    trim: true,
    maxlength: [100, 'Airport cannot exceed 100 characters']
  },
  flightTime: {
    type: String,
    trim: true,
    maxlength: [50, 'Flight time cannot exceed 50 characters']
  },
  climate: {
    type: String,
    trim: true,
    maxlength: [200, 'Climate cannot exceed 200 characters']
  },
  bestTime: {
    type: String,
    trim: true,
    maxlength: [200, 'Best time cannot exceed 200 characters']
  }
});

// Main destination schema
const DestinationSchema = new Schema<IDestination>({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Destination name is required'],
    trim: true,
    minlength: [2, 'Destination name must be at least 2 characters long'],
    maxlength: [100, 'Destination name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(slug: string) {
        if (!slug) return true; // Allow empty slug for auto-generation
        return /^[a-z0-9-]+$/.test(slug);
      },
      message: 'Slug can only contain lowercase letters, numbers, and hyphens'
    }
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
    minlength: [2, 'Country must be at least 2 characters long'],
    maxlength: [100, 'Country cannot exceed 100 characters']
  },
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
    minlength: [2, 'Region must be at least 2 characters long'],
    maxlength: [100, 'Region cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [50, 'Description must be at least 50 characters long'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // SEO and Metadata
  metaTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'Meta title cannot exceed 60 characters for optimal SEO']
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'Meta description cannot exceed 160 characters for optimal SEO']
  },
  keywords: [{
    type: String,
    trim: true,
    minlength: [2, 'Keyword must be at least 2 characters long'],
    maxlength: [50, 'Keyword cannot exceed 50 characters']
  }],
  
  // Visual Elements
  heroImage: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url);
      },
      message: 'Hero image must be a valid URL ending with jpg, jpeg, png, webp, or gif'
    }
  },
  galleryImages: [{
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(url);
      },
      message: 'Gallery image must be a valid URL ending with jpg, jpeg, png, webp, or gif'
    }
  }],
  gradientColors: {
    type: String,
    required: [true, 'Gradient colors are required'],
    default: 'from-blue-600 to-orange-500',
    validate: {
      validator: function(gradient: string) {
        return /^from-\w+-\d{3} to-\w+-\d{3}$/.test(gradient);
      },
      message: 'Gradient colors must be in Tailwind CSS format (e.g., "from-blue-600 to-orange-500")'
    }
  },
  
  // Content Sections
  sections: {
    overview: {
      type: DestinationSectionSchema,
      required: [true, 'Overview section is required']
    },
    accommodation: {
      type: DestinationSectionSchema,
      required: [true, 'Accommodation section is required']
    },
    attractions: {
      type: DestinationSectionSchema,
      required: [true, 'Attractions section is required']
    },
    beaches: {
      type: DestinationSectionSchema,
      required: [true, 'Beaches section is required']
    },
    nightlife: {
      type: DestinationSectionSchema,
      required: [true, 'Nightlife section is required']
    },
    dining: {
      type: DestinationSectionSchema,
      required: [true, 'Dining section is required']
    },
    practical: {
      type: DestinationSectionSchema,
      required: [true, 'Practical section is required']
    }
  },
  
  // Quick Information
  quickFacts: {
    type: QuickFactsSchema,
    required: [true, 'Quick facts are required']
  },
  
  // Publishing and Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    required: [true, 'Status is required']
  },
  publishedAt: {
    type: Date
  },
  scheduledPublishAt: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        if (!date) return true; // Optional field
        return date > new Date();
      },
      message: 'Scheduled publish date must be in the future'
    }
  },
  
  // Publishing History and Workflow
  publishingHistory: {
    type: [PublishingHistoryEntrySchema],
    default: []
  },
  approvalWorkflow: {
    type: ApprovalWorkflowSchema,
    default: () => ({
      isRequired: false,
      status: 'not_required',
      approvalLevel: 'admin'
    })
  },
  version: {
    type: Number,
    default: 1,
    min: [1, 'Version must be at least 1']
  },
  previousVersions: [{
    version: {
      type: Number,
      required: true
    },
    data: {
      type: Schema.Types.Mixed
    },
    savedAt: {
      type: Date,
      default: Date.now
    },
    savedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  
  // AI Generation Metadata
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiGenerationPrompt: {
    type: String,
    trim: true,
    maxlength: [1000, 'AI generation prompt cannot exceed 1000 characters']
  },
  aiGenerationDate: {
    type: Date
  },
  
  // File Uploads
  files: {
    type: [DestinationFileSchema],
    default: []
  },
  
  // Relations
  relatedOffers: [{
    type: Schema.Types.ObjectId,
    ref: 'Offer'
  }],
  relatedActivities: [{
    type: Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  relatedDestinations: [{
    type: Schema.Types.ObjectId,
    ref: 'Destination'
  }],
  
  // Audit Fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Last modifier is required']
  }
}, {
  timestamps: true
});

// Indexes for performance optimization (slug already has unique: true in schema)
DestinationSchema.index({ status: 1, publishedAt: -1 });
DestinationSchema.index({ country: 1, region: 1 });
DestinationSchema.index({ createdBy: 1 });
DestinationSchema.index({ lastModifiedBy: 1 });
DestinationSchema.index({ scheduledPublishAt: 1 });
DestinationSchema.index({ aiGenerated: 1 });
DestinationSchema.index({ 'quickFacts.country': 1 });
DestinationSchema.index({ keywords: 1 });
DestinationSchema.index({ 'approvalWorkflow.status': 1 });
DestinationSchema.index({ 'approvalWorkflow.requestedBy': 1 });
DestinationSchema.index({ 'approvalWorkflow.reviewedBy': 1 });
DestinationSchema.index({ version: 1 });
DestinationSchema.index({ 'publishingHistory.timestamp': -1 });

// Text search index for name, description, and content
DestinationSchema.index({
  name: 'text',
  description: 'text',
  'sections.overview.content': 'text',
  'sections.accommodation.content': 'text',
  'sections.attractions.content': 'text',
  'sections.beaches.content': 'text',
  'sections.nightlife.content': 'text',
  'sections.dining.content': 'text',
  'sections.practical.content': 'text'
});

// Pre-save middleware to generate slug if not provided
DestinationSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.generateSlug();
  }
  
  // Update lastModified for sections when content changes
  if (this.isModified('sections')) {
    const now = new Date();
    Object.keys(this.sections).forEach(sectionKey => {
      if (this.isModified(`sections.${sectionKey}`)) {
        this.sections[sectionKey as keyof typeof this.sections].lastModified = now;
      }
    });
  }
  
  // Initialize approval workflow if not set
  if (!this.approvalWorkflow) {
    this.approvalWorkflow = {
      isRequired: false,
      status: 'not_required',
      approvalLevel: 'admin'
    };
  }
  
  // Initialize publishing history if not set
  if (!this.publishingHistory) {
    this.publishingHistory = [];
  }
  
  next();
});

// Instance methods
DestinationSchema.methods.publish = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  const previousStatus = this.status;
  this.status = 'published';
  this.publishedAt = new Date();
  this.scheduledPublishAt = undefined;
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'published',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus,
    newStatus: 'published',
    comment,
    version: this.version
  });
  
  // Reset approval workflow
  this.approvalWorkflow.status = 'not_required';
  
  return this.save();
};

DestinationSchema.methods.unpublish = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  const previousStatus = this.status;
  this.status = 'draft';
  this.publishedAt = undefined;
  this.scheduledPublishAt = undefined;
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'unpublished',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus,
    newStatus: 'draft',
    comment,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.archive = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  const previousStatus = this.status;
  this.status = 'archived';
  this.publishedAt = undefined;
  this.scheduledPublishAt = undefined;
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'archived',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus,
    newStatus: 'archived',
    comment,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.schedulePublish = async function(date: Date, userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  if (date <= new Date()) {
    throw new Error('Scheduled publish date must be in the future');
  }
  
  const previousStatus = this.status;
  this.scheduledPublishAt = date;
  this.status = 'draft';
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'scheduled',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus,
    newStatus: 'draft',
    scheduledFor: date,
    comment,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.requestApproval = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  this.approvalWorkflow = {
    isRequired: true,
    status: 'pending',
    requestedBy: userId,
    requestedAt: new Date(),
    comments: comment,
    approvalLevel: this.approvalWorkflow.approvalLevel || 'admin'
  };
  
  return this.save();
};

DestinationSchema.methods.approveContent = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  this.approvalWorkflow.status = 'approved';
  this.approvalWorkflow.reviewedBy = userId;
  this.approvalWorkflow.reviewedAt = new Date();
  if (comment) {
    this.approvalWorkflow.comments = comment;
  }
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'approved',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus: this.status,
    newStatus: this.status,
    comment,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.rejectContent = function(userId: mongoose.Types.ObjectId, comment?: string): Promise<IDestination> {
  this.approvalWorkflow.status = 'rejected';
  this.approvalWorkflow.reviewedBy = userId;
  this.approvalWorkflow.reviewedAt = new Date();
  if (comment) {
    this.approvalWorkflow.comments = comment;
  }
  
  // Add to publishing history
  this.publishingHistory.push({
    action: 'rejected',
    timestamp: new Date(),
    performedBy: userId,
    previousStatus: this.status,
    newStatus: this.status,
    comment,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.saveVersion = function(userId: mongoose.Types.ObjectId): Promise<IDestination> {
  // Save current state as a previous version
  const currentData = this.toObject();
  delete currentData._id;
  delete currentData.__v;
  delete currentData.previousVersions;
  
  if (!this.previousVersions) {
    this.previousVersions = [];
  }
  
  this.previousVersions.push({
    version: this.version,
    data: currentData,
    savedAt: new Date(),
    savedBy: userId
  });
  
  // Increment version
  this.version += 1;
  
  return this.save();
};

DestinationSchema.methods.rollbackToVersion = async function(version: number, userId: mongoose.Types.ObjectId): Promise<IDestination> {
  const targetVersion = this.previousVersions?.find(v => v.version === version);
  if (!targetVersion) {
    throw new Error(`Version ${version} not found`);
  }
  
  // Save current state before rollback
  await this.saveVersion(userId);
  
  // Restore data from target version
  const versionData = targetVersion.data;
  Object.keys(versionData).forEach(key => {
    if (key !== 'version' && key !== 'previousVersions' && key !== 'publishingHistory') {
      (this as any)[key] = versionData[key];
    }
  });
  
  // Add rollback entry to history
  this.publishingHistory.push({
    action: 'published', // Rollback is essentially a publish action
    timestamp: new Date(),
    performedBy: userId,
    previousStatus: this.status,
    newStatus: this.status,
    comment: `Rolled back to version ${version}`,
    version: this.version
  });
  
  return this.save();
};

DestinationSchema.methods.generateSlug = function(): string {
  return this.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
};

// Static methods
DestinationSchema.statics.findPublished = function() {
  return this.find({ status: 'published' }).sort({ publishedAt: -1 });
};

DestinationSchema.statics.findDrafts = function() {
  return this.find({ status: 'draft' }).sort({ updatedAt: -1 });
};

DestinationSchema.statics.findArchived = function() {
  return this.find({ status: 'archived' }).sort({ updatedAt: -1 });
};

DestinationSchema.statics.findByCountry = function(country: string) {
  return this.find({ country: new RegExp(country, 'i'), status: 'published' });
};

DestinationSchema.statics.findByRegion = function(region: string) {
  return this.find({ region: new RegExp(region, 'i'), status: 'published' });
};

DestinationSchema.statics.findScheduledForPublishing = function() {
  return this.find({
    status: 'draft',
    scheduledPublishAt: { $lte: new Date() }
  });
};

DestinationSchema.statics.searchDestinations = function(query: string) {
  return this.find(
    { $text: { $search: query }, status: 'published' },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

DestinationSchema.statics.findPendingApproval = function() {
  return this.find({ 'approvalWorkflow.status': 'pending' })
    .populate('approvalWorkflow.requestedBy', 'name email')
    .sort({ 'approvalWorkflow.requestedAt': -1 });
};

DestinationSchema.statics.findByApprovalStatus = function(status: string) {
  return this.find({ 'approvalWorkflow.status': status })
    .populate('approvalWorkflow.requestedBy', 'name email')
    .populate('approvalWorkflow.reviewedBy', 'name email')
    .sort({ 'approvalWorkflow.requestedAt': -1 });
};

DestinationSchema.statics.findWithPublishingHistory = function(destinationId: string) {
  return this.findById(destinationId)
    .populate('publishingHistory.performedBy', 'name email')
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email');
};

export default mongoose.models.Destination ||
  mongoose.model<IDestination>('Destination', DestinationSchema);