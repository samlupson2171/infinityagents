import mongoose, { Document, Schema } from 'mongoose';

export interface IPackageActivity {
  activityId: mongoose.Types.ObjectId;
  quantity: number;
  subtotal: number;
}

export interface IActivityPackage extends Document {
  name: string;
  activities: IPackageActivity[];
  totalCost: number;
  numberOfPersons: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'finalized';
  clientName?: string;
  notes?: string;
  calculateTotalCost(): number;
  addActivity(
    activityId: mongoose.Types.ObjectId,
    quantity: number,
    pricePerPerson: number
  ): void;
  removeActivity(activityId: mongoose.Types.ObjectId): void;
  updateActivityQuantity(
    activityId: mongoose.Types.ObjectId,
    quantity: number,
    pricePerPerson: number
  ): void;
}

const PackageActivitySchema = new Schema(
  {
    activityId: {
      type: Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'Activity ID is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: function (quantity: number) {
          return Number.isInteger(quantity) && quantity >= 1;
        },
        message: 'Quantity must be a positive integer',
      },
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: [0, 'Subtotal must be a positive number'],
      validate: {
        validator: function (subtotal: number) {
          return Number.isFinite(subtotal) && subtotal >= 0;
        },
        message: 'Subtotal must be a valid positive number',
      },
    },
  },
  { _id: false }
);

const ActivityPackageSchema = new Schema<IActivityPackage>(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      minlength: [3, 'Package name must be at least 3 characters long'],
      maxlength: [200, 'Package name cannot exceed 200 characters'],
    },
    activities: {
      type: [PackageActivitySchema],
      default: [],
      validate: {
        validator: function (activities: IPackageActivity[]) {
          // Check for duplicate activities
          const activityIds = activities.map((a) => a.activityId.toString());
          return activityIds.length === new Set(activityIds).size;
        },
        message: 'Duplicate activities are not allowed in a package',
      },
    },
    totalCost: {
      type: Number,
      required: [true, 'Total cost is required'],
      min: [0, 'Total cost must be a positive number'],
      default: 0,
      validate: {
        validator: function (total: number) {
          return Number.isFinite(total) && total >= 0;
        },
        message: 'Total cost must be a valid positive number',
      },
    },
    numberOfPersons: {
      type: Number,
      required: [true, 'Number of persons is required'],
      min: [1, 'Number of persons must be at least 1'],
      default: 1,
      validate: {
        validator: function (persons: number) {
          return Number.isInteger(persons) && persons >= 1;
        },
        message: 'Number of persons must be a positive integer',
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
    },
    clientName: {
      type: String,
      trim: true,
      maxlength: [200, 'Client name cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for optimal query performance
ActivityPackageSchema.index({ createdBy: 1, status: 1 }); // User packages by status
ActivityPackageSchema.index({ createdBy: 1, createdAt: -1 }); // User packages by date
ActivityPackageSchema.index({ status: 1, createdAt: -1 }); // All packages by status and date

// Pre-save middleware to calculate total cost
ActivityPackageSchema.pre('save', function (next) {
  this.totalCost = this.calculateTotalCost();
  next();
});

// Instance methods
ActivityPackageSchema.methods.calculateTotalCost = function (): number {
  return this.activities.reduce((total: number, activity: IPackageActivity) => {
    return total + activity.subtotal * this.numberOfPersons;
  }, 0);
};

ActivityPackageSchema.methods.addActivity = function (
  activityId: mongoose.Types.ObjectId,
  quantity: number,
  pricePerPerson: number
): void {
  // Check if activity already exists in package
  const existingIndex = this.activities.findIndex(
    (a: IPackageActivity) => a.activityId.toString() === activityId.toString()
  );

  const subtotal = quantity * pricePerPerson;

  if (existingIndex >= 0) {
    // Update existing activity
    this.activities[existingIndex].quantity = quantity;
    this.activities[existingIndex].subtotal = subtotal;
  } else {
    // Add new activity
    this.activities.push({
      activityId,
      quantity,
      subtotal,
    });
  }

  this.totalCost = this.calculateTotalCost();
};

ActivityPackageSchema.methods.removeActivity = function (
  activityId: mongoose.Types.ObjectId
): void {
  this.activities = this.activities.filter(
    (a: IPackageActivity) => a.activityId.toString() !== activityId.toString()
  );
  this.totalCost = this.calculateTotalCost();
};

ActivityPackageSchema.methods.updateActivityQuantity = function (
  activityId: mongoose.Types.ObjectId,
  quantity: number,
  pricePerPerson: number
): void {
  const activityIndex = this.activities.findIndex(
    (a: IPackageActivity) => a.activityId.toString() === activityId.toString()
  );

  if (activityIndex >= 0) {
    this.activities[activityIndex].quantity = quantity;
    this.activities[activityIndex].subtotal = quantity * pricePerPerson;
    this.totalCost = this.calculateTotalCost();
  }
};

ActivityPackageSchema.methods.finalize = function () {
  this.status = 'finalized';
  return this.save();
};

ActivityPackageSchema.methods.revertToDraft = function () {
  this.status = 'draft';
  return this.save();
};

// Static methods
ActivityPackageSchema.statics.findByUser = function (
  userId: mongoose.Types.ObjectId,
  status?: string
) {
  const query: any = { createdBy: userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ActivityPackageSchema.statics.findDraftPackages = function (
  userId: mongoose.Types.ObjectId
) {
  return this.find({ createdBy: userId, status: 'draft' }).sort({
    createdAt: -1,
  });
};

ActivityPackageSchema.statics.findFinalizedPackages = function (
  userId: mongoose.Types.ObjectId
) {
  return this.find({ createdBy: userId, status: 'finalized' }).sort({
    createdAt: -1,
  });
};

export default mongoose.models.ActivityPackage ||
  mongoose.model<IActivityPackage>('ActivityPackage', ActivityPackageSchema);
