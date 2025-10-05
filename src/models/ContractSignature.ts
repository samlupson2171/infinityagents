import mongoose, { Document, Schema } from 'mongoose';

export interface IContractSignature extends Document {
  userId: mongoose.Types.ObjectId;
  contractTemplateId: mongoose.Types.ObjectId;
  signedAt: Date;
  signature: string; // Digital signature data or acceptance confirmation
  ipAddress: string;
  userAgent: string;
  signatureType: 'digital' | 'checkbox' | 'electronic';
  
  // Audit trail fields
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  isValidSignature(): boolean;
  getAuditTrail(): object;
}

export interface IContractSignatureModel extends mongoose.Model<IContractSignature> {
  // Static methods
  findByUser(userId: mongoose.Types.ObjectId): Promise<IContractSignature[]>;
  findByContract(contractTemplateId: mongoose.Types.ObjectId): Promise<IContractSignature[]>;
  findUserContractSignature(userId: mongoose.Types.ObjectId, contractTemplateId: mongoose.Types.ObjectId): Promise<IContractSignature | null>;
  createSignature(
    userId: mongoose.Types.ObjectId,
    contractTemplateId: mongoose.Types.ObjectId,
    signature: string,
    signatureType: 'digital' | 'checkbox' | 'electronic',
    ipAddress: string,
    userAgent: string
  ): Promise<IContractSignature>;
  getSignatureStats(): Promise<object>;
}

const ContractSignatureSchema = new Schema<IContractSignature>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    contractTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'ContractTemplate',
      required: [true, 'Contract template ID is required'],
    },
    signedAt: {
      type: Date,
      required: [true, 'Signed date is required'],
      default: Date.now,
    },
    signature: {
      type: String,
      required: [true, 'Signature is required'],
      minlength: [1, 'Signature cannot be empty'],
      maxlength: [10000, 'Signature data cannot exceed 10,000 characters'],
    },
    ipAddress: {
      type: String,
      required: [true, 'IP address is required'],
      validate: {
        validator: function (value: string) {
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(value) || ipv6Regex.test(value);
        },
        message: 'Please provide a valid IP address',
      },
    },
    userAgent: {
      type: String,
      required: [true, 'User agent is required'],
      trim: true,
      maxlength: [1000, 'User agent cannot exceed 1,000 characters'],
    },
    signatureType: {
      type: String,
      enum: ['digital', 'checkbox', 'electronic'],
      required: [true, 'Signature type is required'],
      default: 'checkbox',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance and uniqueness
ContractSignatureSchema.index({ userId: 1, contractTemplateId: 1 }, { unique: true }); // One signature per user per contract
ContractSignatureSchema.index({ userId: 1 });
ContractSignatureSchema.index({ contractTemplateId: 1 });
ContractSignatureSchema.index({ signedAt: -1 });
ContractSignatureSchema.index({ signatureType: 1 });
ContractSignatureSchema.index({ createdAt: -1 });

// Instance methods
ContractSignatureSchema.methods.isValidSignature = function (): boolean {
  // Basic validation - signature exists and is not empty
  if (!this.signature || this.signature.trim().length === 0) {
    return false;
  }
  
  // Additional validation based on signature type
  switch (this.signatureType) {
    case 'checkbox':
      // For checkbox acceptance, signature should be 'accepted' or similar
      return ['accepted', 'agreed', 'true', '1'].includes(this.signature.toLowerCase());
    
    case 'digital':
      // For digital signatures, should be base64 encoded data or similar
      return this.signature.length > 10; // Basic length check
    
    case 'electronic':
      // For electronic signatures, should contain some meaningful data
      return this.signature.length > 5;
    
    default:
      return false;
  }
};

ContractSignatureSchema.methods.getAuditTrail = function (): object {
  return {
    userId: this.userId,
    contractTemplateId: this.contractTemplateId,
    signedAt: this.signedAt,
    signatureType: this.signatureType,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    isValid: this.isValidSignature(),
  };
};

// Static methods
ContractSignatureSchema.statics.findByUser = function (userId: mongoose.Types.ObjectId): Promise<IContractSignature[]> {
  return this.find({ userId })
    .populate('contractTemplateId', 'version title effectiveDate')
    .sort({ signedAt: -1 });
};

ContractSignatureSchema.statics.findByContract = function (contractTemplateId: mongoose.Types.ObjectId): Promise<IContractSignature[]> {
  return this.find({ contractTemplateId })
    .populate('userId', 'name email company')
    .sort({ signedAt: -1 });
};

ContractSignatureSchema.statics.findUserContractSignature = function (
  userId: mongoose.Types.ObjectId,
  contractTemplateId: mongoose.Types.ObjectId
): Promise<IContractSignature | null> {
  return this.findOne({ userId, contractTemplateId })
    .populate('contractTemplateId', 'version title effectiveDate')
    .populate('userId', 'name email company');
};

ContractSignatureSchema.statics.createSignature = async function (
  userId: mongoose.Types.ObjectId,
  contractTemplateId: mongoose.Types.ObjectId,
  signature: string,
  signatureType: 'digital' | 'checkbox' | 'electronic',
  ipAddress: string,
  userAgent: string
): Promise<IContractSignature> {
  // Check if signature already exists
  const existingSignature = await this.findOne({ userId, contractTemplateId });
  if (existingSignature) {
    throw new Error('User has already signed this contract version');
  }
  
  // Validate contract template exists and is active
  const ContractTemplate = mongoose.model('ContractTemplate');
  const contractTemplate = await ContractTemplate.findById(contractTemplateId);
  if (!contractTemplate) {
    throw new Error('Contract template not found');
  }
  
  // Create new signature
  const newSignature = new this({
    userId,
    contractTemplateId,
    signature,
    signatureType,
    ipAddress,
    userAgent,
    signedAt: new Date(),
  });
  
  // Validate signature before saving
  if (!newSignature.isValidSignature()) {
    throw new Error('Invalid signature format for the specified signature type');
  }
  
  return newSignature.save();
};

ContractSignatureSchema.statics.getSignatureStats = async function (): Promise<object> {
  const totalSignatures = await this.countDocuments();
  const signaturesByType = await this.aggregate([
    {
      $group: {
        _id: '$signatureType',
        count: { $sum: 1 },
      },
    },
  ]);
  
  const recentSignatures = await this.countDocuments({
    signedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
  });
  
  const signaturesByContract = await this.aggregate([
    {
      $group: {
        _id: '$contractTemplateId',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'contracttemplates',
        localField: '_id',
        foreignField: '_id',
        as: 'contract',
      },
    },
    {
      $unwind: '$contract',
    },
    {
      $project: {
        contractVersion: '$contract.version',
        contractTitle: '$contract.title',
        signatureCount: '$count',
      },
    },
  ]);
  
  return {
    totalSignatures,
    signaturesByType: signaturesByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
    recentSignatures,
    signaturesByContract,
  };
};

// Pre-save middleware
ContractSignatureSchema.pre('save', async function (next) {
  // Update user's contract status when signature is created
  if (this.isNew) {
    try {
      const User = mongoose.model('User');
      const ContractTemplate = mongoose.model('ContractTemplate');
      
      const contractTemplate = await ContractTemplate.findById(this.contractTemplateId);
      if (contractTemplate) {
        await User.findByIdAndUpdate(this.userId, {
          registrationStatus: 'contracted',
          contractSignedAt: this.signedAt,
          contractVersion: contractTemplate.version,
        });
      }
    } catch (error) {
      console.error('Error updating user contract status:', error);
      // Don't fail the signature save if user update fails
    }
  }
  
  next();
});

export default mongoose.models.ContractSignature ||
  mongoose.model<IContractSignature, IContractSignatureModel>('ContractSignature', ContractSignatureSchema);