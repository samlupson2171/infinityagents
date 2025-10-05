import mongoose, { Document, Schema } from 'mongoose';

export enum ActivityCategory {
  EXCURSION = 'excursion',
  SHOW = 'show',
  TRANSPORT = 'transport',
  DINING = 'dining',
  ADVENTURE = 'adventure',
  CULTURAL = 'cultural',
  NIGHTLIFE = 'nightlife',
  SHOPPING = 'shopping',
}

export interface IActivity extends Document {
  name: string;
  category: ActivityCategory;
  location: string;
  pricePerPerson: number;
  minPersons: number;
  maxPersons: number;
  availableFrom: Date;
  availableTo: Date;
  duration: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
  isAvailable(): boolean;
  isValidForDates(startDate: Date, endDate: Date): boolean;
}

const ActivitySchema = new Schema<IActivity>(
  {
    name: {
      type: String,
      required: [true, 'Activity name is required'],
      trim: true,
      minlength: [3, 'Activity name must be at least 3 characters long'],
      maxlength: [200, 'Activity name cannot exceed 200 characters'],
    },
    category: {
      type: String,
      required: [true, 'Activity category is required'],
      enum: Object.values(ActivityCategory),
      lowercase: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters long'],
      maxlength: [100, 'Location cannot exceed 100 characters'],
    },
    pricePerPerson: {
      type: Number,
      required: [true, 'Price per person is required'],
      min: [0, 'Price per person must be a positive number'],
      validate: {
        validator: function (price: number) {
          return Number.isFinite(price) && price >= 0;
        },
        message: 'Price per person must be a valid positive number',
      },
    },
    minPersons: {
      type: Number,
      required: [true, 'Minimum persons is required'],
      min: [1, 'Minimum persons must be at least 1'],
      validate: {
        validator: function (min: number) {
          return Number.isInteger(min) && min >= 1;
        },
        message: 'Minimum persons must be a positive integer',
      },
    },
    maxPersons: {
      type: Number,
      required: [true, 'Maximum persons is required'],
      min: [1, 'Maximum persons must be at least 1'],
      validate: {
        validator: function (max: number) {
          return Number.isInteger(max) && max >= this.minPersons;
        },
        message:
          'Maximum persons must be greater than or equal to minimum persons',
      },
    },
    availableFrom: {
      type: Date,
      required: [true, 'Available from date is required'],
      validate: {
        validator: function (date: Date) {
          return date instanceof Date && !isNaN(date.getTime());
        },
        message: 'Available from must be a valid date',
      },
    },
    availableTo: {
      type: Date,
      required: [true, 'Available to date is required'],
      validate: {
        validator: function (date: Date) {
          return (
            date instanceof Date &&
            !isNaN(date.getTime()) &&
            date >= this.availableFrom
          );
        },
        message: 'Available to date must be after available from date',
      },
    },
    duration: {
      type: String,
      required: [true, 'Duration is required'],
      trim: true,
      minlength: [1, 'Duration must be specified'],
      maxlength: [50, 'Duration cannot exceed 50 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
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

// Indexes for optimal query performance
ActivitySchema.index({ name: 'text', description: 'text' }); // Text search
ActivitySchema.index({ location: 1, category: 1, isActive: 1 }); // Filtering
ActivitySchema.index({ availableFrom: 1, availableTo: 1 }); // Date range queries
ActivitySchema.index({ pricePerPerson: 1 }); // Price filtering
ActivitySchema.index({ isActive: 1, createdAt: -1 }); // Admin listing
ActivitySchema.index({ createdBy: 1 }); // Creator queries

// Compound index for duplicate detection (name + location)
ActivitySchema.index({ name: 1, location: 1 }, { unique: true });

// Instance methods
ActivitySchema.methods.isAvailable = function (): boolean {
  const now = new Date();
  return this.isActive && this.availableFrom <= now && this.availableTo >= now;
};

ActivitySchema.methods.isValidForDates = function (
  startDate: Date,
  endDate: Date
): boolean {
  return this.availableFrom <= startDate && this.availableTo >= endDate;
};

ActivitySchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

ActivitySchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

// Static methods
ActivitySchema.statics.findActiveActivities = function () {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

ActivitySchema.statics.findByLocation = function (location: string) {
  return this.find({ location: new RegExp(location, 'i'), isActive: true });
};

ActivitySchema.statics.findByCategory = function (category: ActivityCategory) {
  return this.find({ category, isActive: true });
};

ActivitySchema.statics.findAvailableForDates = function (
  startDate: Date,
  endDate: Date
) {
  return this.find({
    isActive: true,
    availableFrom: { $lte: startDate },
    availableTo: { $gte: endDate },
  });
};

ActivitySchema.statics.searchActivities = function (searchTerm: string) {
  return this.find({
    $text: { $search: searchTerm },
    isActive: true,
  }).sort({ score: { $meta: 'textScore' } });
};

export default mongoose.models.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema);
