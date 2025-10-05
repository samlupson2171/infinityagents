import mongoose, { Document, Schema } from 'mongoose';

export interface IContractTemplate extends Document {
  version: string;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
  effectiveDate: Date;
  updatedAt: Date;
  
  // Instance methods
  activate(): Promise<IContractTemplate>;
  deactivate(): Promise<IContractTemplate>;
  createNewVersion(newContent: string, newTitle: string, createdBy: mongoose.Types.ObjectId): Promise<IContractTemplate>;
}

export interface IContractTemplateModel extends mongoose.Model<IContractTemplate> {
  // Static methods
  findActiveTemplate(): Promise<IContractTemplate | null>;
  findByVersion(version: string): Promise<IContractTemplate | null>;
  getVersionHistory(): Promise<IContractTemplate[]>;
  createFirstVersion(title: string, content: string, createdBy: mongoose.Types.ObjectId): Promise<IContractTemplate>;
}

const ContractTemplateSchema = new Schema<IContractTemplate>(
  {
    version: {
      type: String,
      required: [true, 'Version is required'],
      unique: true,
      trim: true,
      validate: {
        validator: function (value: string) {
          // Version format: v1.0, v1.1, v2.0, etc.
          return /^v\d+\.\d+$/.test(value);
        },
        message: 'Version must be in format v1.0, v1.1, v2.0, etc.',
      },
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      minlength: [100, 'Contract content must be at least 100 characters long'],
      maxlength: [50000, 'Contract content cannot exceed 50,000 characters'],
    },
    isActive: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required'],
    },
    effectiveDate: {
      type: Date,
      required: [true, 'Effective date is required'],
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ContractTemplateSchema.index({ version: 1 });
ContractTemplateSchema.index({ isActive: 1 });
ContractTemplateSchema.index({ effectiveDate: -1 });
ContractTemplateSchema.index({ createdAt: -1 });

// Ensure only one active template at a time
ContractTemplateSchema.index({ isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

// Instance methods
ContractTemplateSchema.methods.activate = async function (): Promise<IContractTemplate> {
  // Deactivate all other templates first
  const Model = this.constructor as IContractTemplateModel;
  await Model.updateMany({ isActive: true }, { isActive: false });
  
  // Activate this template
  this.isActive = true;
  return this.save();
};

ContractTemplateSchema.methods.deactivate = async function (): Promise<IContractTemplate> {
  this.isActive = false;
  return this.save();
};

ContractTemplateSchema.methods.createNewVersion = async function (
  newContent: string,
  newTitle: string,
  createdBy: mongoose.Types.ObjectId
): Promise<IContractTemplate> {
  // Parse current version to increment
  const currentVersionMatch = this.version.match(/^v(\d+)\.(\d+)$/);
  if (!currentVersionMatch) {
    throw new Error('Invalid current version format');
  }
  
  const major = parseInt(currentVersionMatch[1]);
  const minor = parseInt(currentVersionMatch[2]);
  
  // Increment minor version (major version increments would be handled manually)
  const newVersion = `v${major}.${minor + 1}`;
  
  // Create new template version
  const NewTemplate = this.constructor as IContractTemplateModel;
  const newTemplate = new NewTemplate({
    version: newVersion,
    title: newTitle,
    content: newContent,
    createdBy,
    effectiveDate: new Date(),
    isActive: false, // New versions start inactive
  });
  
  return newTemplate.save();
};

// Static methods
ContractTemplateSchema.statics.findActiveTemplate = function (): Promise<IContractTemplate | null> {
  return this.findOne({ isActive: true }).populate('createdBy', 'name email');
};

ContractTemplateSchema.statics.findByVersion = function (version: string): Promise<IContractTemplate | null> {
  return this.findOne({ version }).populate('createdBy', 'name email');
};

ContractTemplateSchema.statics.getVersionHistory = function (): Promise<IContractTemplate[]> {
  return this.find({})
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name email');
};

ContractTemplateSchema.statics.createFirstVersion = async function (
  title: string,
  content: string,
  createdBy: mongoose.Types.ObjectId
): Promise<IContractTemplate> {
  // Check if any templates exist
  const existingCount = await this.countDocuments();
  if (existingCount > 0) {
    throw new Error('Contract templates already exist. Use createNewVersion instead.');
  }
  
  const firstTemplate = new this({
    version: 'v1.0',
    title,
    content,
    createdBy,
    effectiveDate: new Date(),
    isActive: true, // First template is automatically active
  });
  
  return firstTemplate.save();
};

// Pre-save middleware for validation
ContractTemplateSchema.pre('save', async function (next) {
  // If setting this template as active, ensure no other template is active
  if (this.isModified('isActive') && this.isActive) {
    const Model = this.constructor as IContractTemplateModel;
    await Model.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    );
  }
  
  next();
});

export default mongoose.models.ContractTemplate ||
  mongoose.model<IContractTemplate, IContractTemplateModel>('ContractTemplate', ContractTemplateSchema);