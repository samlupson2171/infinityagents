import mongoose, { Document, Schema } from 'mongoose';

// Legacy pricing interface for backward compatibility
export interface IPricing {
  month: string;
  hotel: {
    twoNights: number;
    threeNights: number;
    fourNights: number;
  };
  selfCatering: {
    twoNights: number;
    threeNights: number;
    fourNights: number;
  };
}

// Enhanced flexible pricing interface
export interface IFlexiblePricing {
  month: string;
  accommodationType: string;
  nights: number;
  pax: number;
  price: number;
  currency: string;
  isAvailable: boolean;
  specialPeriod?: string; // e.g., "Easter", "Peak Season"
  validFrom?: Date;
  validTo?: Date;
  notes?: string;
}

// Enhanced offer metadata interface
export interface IOfferMetadata {
  currency: string;
  season: string;
  lastUpdated: Date;
  importSource?: string;
  version: number;
  originalFilename?: string;
  importId?: string;
}

export interface IOffer extends Document {
  title: string;
  description: string;
  destination: string;
  resortName?: string;
  inclusions: string[];
  exclusions?: string[];
  // Legacy pricing for backward compatibility
  pricing?: IPricing[];
  // New flexible pricing structure
  flexiblePricing?: IFlexiblePricing[];
  metadata: IOfferMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

// Legacy pricing schema for backward compatibility
const PricingSchema = new Schema({
  month: {
    type: String,
    required: true,
    enum: [
      'January',
      'February',
      'March',
      'April',
      'Easter (18–21 Apr)',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  },
  hotel: {
    twoNights: { type: Number, required: true, min: 0 },
    threeNights: { type: Number, required: true, min: 0 },
    fourNights: { type: Number, required: true, min: 0 },
  },
  selfCatering: {
    twoNights: { type: Number, required: true, min: 0 },
    threeNights: { type: Number, required: true, min: 0 },
    fourNights: { type: Number, required: true, min: 0 },
  },
});

// Enhanced flexible pricing schema
const FlexiblePricingSchema = new Schema({
  month: {
    type: String,
    required: true,
    enum: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
      'Easter (18–21 Apr)', 'Peak Season', 'Off Season'
    ]
  },
  accommodationType: {
    type: String,
    required: true,
    enum: ['Hotel', 'Self-Catering', 'Apartment', 'Villa', 'Hostel', 'Resort']
  },
  nights: {
    type: Number,
    required: true,
    min: 1,
    max: 14
  },
  pax: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['EUR', 'GBP', 'USD'],
    default: 'EUR'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  specialPeriod: {
    type: String,
    trim: true
  },
  validFrom: {
    type: Date
  },
  validTo: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
});

// Offer metadata schema
const OfferMetadataSchema = new Schema({
  currency: {
    type: String,
    required: true,
    enum: ['EUR', 'GBP', 'USD'],
    default: 'EUR'
  },
  season: {
    type: String,
    required: true,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  importSource: {
    type: String,
    trim: true
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  originalFilename: {
    type: String,
    trim: true
  },
  importId: {
    type: String,
    trim: true
  }
});

const OfferSchema = new Schema<IOffer>(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters long'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters long'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    destination: {
      type: String,
      required: [true, 'Destination is required'],
      trim: true,
      enum: ['Benidorm', 'Albufeira'],
    },
    resortName: {
      type: String,
      trim: true,
      maxlength: [100, 'Resort name cannot exceed 100 characters'],
    },
    inclusions: {
      type: [String],
      required: [true, 'At least one inclusion is required'],
      validate: {
        validator: function (inclusions: string[]) {
          return (
            inclusions.length > 0 &&
            inclusions.every(
              (inclusion) =>
                inclusion.trim().length >= 3 && inclusion.trim().length <= 200
            )
          );
        },
        message: 'Each inclusion must be between 3 and 200 characters',
      },
    },
    exclusions: {
      type: [String],
      validate: {
        validator: function (exclusions: string[]) {
          return exclusions.every(
            (exclusion) =>
              exclusion.trim().length >= 3 && exclusion.trim().length <= 200
          );
        },
        message: 'Each exclusion must be between 3 and 200 characters',
      },
    },
    // Legacy pricing for backward compatibility
    pricing: {
      type: [PricingSchema],
      validate: {
        validator: function (this: IOffer, pricing: IPricing[]) {
          // Either legacy pricing or flexible pricing must be provided
          return pricing.length > 0 || (this.flexiblePricing && this.flexiblePricing.length > 0);
        },
        message: 'Either pricing or flexiblePricing information is required',
      },
    },
    // New flexible pricing structure
    flexiblePricing: {
      type: [FlexiblePricingSchema],
      validate: {
        validator: function (this: IOffer, flexiblePricing: IFlexiblePricing[]) {
          // Either legacy pricing or flexible pricing must be provided
          return flexiblePricing.length > 0 || (this.pricing && this.pricing.length > 0);
        },
        message: 'Either pricing or flexiblePricing information is required',
      },
    },
    metadata: {
      type: OfferMetadataSchema,
      required: [true, 'Metadata is required'],
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
OfferSchema.index({ isActive: 1, createdAt: -1 });
OfferSchema.index({ createdBy: 1 });
OfferSchema.index({ destination: 1, isActive: 1 });
OfferSchema.index({ resortName: 1, destination: 1 });
OfferSchema.index({ 'metadata.importId': 1 });
OfferSchema.index({ 'metadata.lastUpdated': -1 });

// Static methods
OfferSchema.statics.findActiveOffers = function () {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

OfferSchema.statics.findOffersByCreator = function (
  creatorId: mongoose.Types.ObjectId
) {
  return this.find({ createdBy: creatorId }).sort({ createdAt: -1 });
};

// Instance methods
OfferSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

OfferSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

export default mongoose.models.Offer ||
  mongoose.model<IOffer>('Offer', OfferSchema);
