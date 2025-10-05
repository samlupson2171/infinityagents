import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  companyName: string;
  abtaPtsNumber: string;
  contactEmail: string;
  websiteAddress: string;
  password: string;
  isApproved: boolean;
  role: 'agent' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  // Enhanced agency registration fields
  company: string;
  consortia?: string;
  registrationStatus: 'pending' | 'approved' | 'rejected' | 'contracted';
  rejectionReason?: string;
  contractSignedAt?: Date;
  contractVersion?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ABTA/PTS number validation regex
const ABTA_PTS_REGEX = /^(ABTA|PTS)[A-Z0-9]{4,10}$/i;

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    abtaPtsNumber: {
      type: String,
      required: [true, 'ABTA/PTS number is required'],
      unique: true,
      uppercase: true,
      validate: {
        validator: function (value: string) {
          return ABTA_PTS_REGEX.test(value);
        },
        message:
          'ABTA/PTS number must start with ABTA or PTS followed by 4-10 alphanumeric characters',
      },
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    websiteAddress: {
      type: String,
      required: [true, 'Website address is required'],
      validate: {
        validator: function (url: string) {
          try {
            const parsedUrl = new URL(url);
            return (
              parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
            );
          } catch {
            return false;
          }
        },
        message: 'Please provide a valid HTTP or HTTPS website URL',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't include password in queries by default
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['agent', 'admin'],
      default: 'agent',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    // Enhanced agency registration fields
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    consortia: {
      type: String,
      trim: true,
      maxlength: [200, 'Consortia name cannot exceed 200 characters'],
    },
    registrationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'contracted'],
      default: 'pending',
      required: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    contractSignedAt: {
      type: Date,
    },
    contractVersion: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance (contactEmail and abtaPtsNumber already have unique indexes)
UserSchema.index({ isApproved: 1 });
UserSchema.index({ registrationStatus: 1 });
UserSchema.index({ company: 1 });
UserSchema.index({ consortia: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance methods
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.approve = function (approvedBy: mongoose.Types.ObjectId) {
  this.isApproved = true;
  this.registrationStatus = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

UserSchema.methods.reject = function (reason?: string) {
  this.isApproved = false;
  this.registrationStatus = 'rejected';
  this.rejectionReason = reason;
  this.approvedBy = undefined;
  this.approvedAt = undefined;
  return this.save();
};

UserSchema.methods.signContract = function (contractVersion: string) {
  this.registrationStatus = 'contracted';
  this.contractSignedAt = new Date();
  this.contractVersion = contractVersion;
  return this.save();
};

// Static methods
UserSchema.statics.findPendingUsers = function () {
  return this.find({ registrationStatus: 'pending' }).sort({ createdAt: -1 });
};

UserSchema.statics.findApprovedUsers = function () {
  return this.find({ registrationStatus: 'approved' }).sort({ createdAt: -1 });
};

UserSchema.statics.findContractedUsers = function () {
  return this.find({ registrationStatus: 'contracted' }).sort({ createdAt: -1 });
};

UserSchema.statics.findRejectedUsers = function () {
  return this.find({ registrationStatus: 'rejected' }).sort({ createdAt: -1 });
};

UserSchema.statics.findByRegistrationStatus = function (status: string) {
  return this.find({ registrationStatus: status }).sort({ createdAt: -1 });
};

export default mongoose.models.User ||
  mongoose.model<IUser>('User', UserSchema);
