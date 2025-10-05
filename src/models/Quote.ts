import mongoose, { Document, Schema } from 'mongoose';

export interface IQuote extends Document {
  // Reference to original enquiry
  enquiryId: mongoose.Types.ObjectId;
  
  // Quote details
  leadName: string;
  hotelName: string;
  numberOfPeople: number;
  numberOfRooms: number;
  numberOfNights: number;
  arrivalDate: Date;
  isSuperPackage: boolean;
  whatsIncluded: string;
  transferIncluded: boolean;
  activitiesIncluded: string;
  totalPrice: number;
  currency: string; // Default: 'GBP'
  
  // Quote metadata
  version: number; // For version history
  status: 'draft' | 'sent' | 'updated';
  createdBy: mongoose.Types.ObjectId; // Admin who created
  createdAt: Date;
  updatedAt: Date;
  
  // Email tracking
  emailSent: boolean;
  emailSentAt?: Date;
  emailDeliveryStatus?: 'pending' | 'delivered' | 'failed';
  emailMessageId?: string;
  
  // Notes and Comments
  internalNotes?: string;
  
  // Booking Interest Tracking
  bookingInterest?: {
    expressed: boolean;
    expressedAt?: Date;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    bookingUrgency?: 'immediately' | 'this-week' | 'next-week' | 'within-month' | 'just-interested';
    additionalRequests?: string;
  };
}

const QuoteSchema = new Schema<IQuote>({
  enquiryId: {
    type: Schema.Types.ObjectId,
    ref: 'Enquiry',
    required: true,
    index: true
  },
  
  // Lead Information
  leadName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Accommodation Details
  hotelName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  
  numberOfRooms: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },
  
  numberOfNights: {
    type: Number,
    required: true,
    min: 1,
    max: 30
  },
  
  arrivalDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(date: Date) {
        return date > new Date();
      },
      message: 'Arrival date must be in the future'
    }
  },
  
  // Package Details
  isSuperPackage: {
    type: Boolean,
    default: false
  },
  
  whatsIncluded: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  transferIncluded: {
    type: Boolean,
    default: false
  },
  
  activitiesIncluded: {
    type: String,
    maxlength: 1000
  },
  
  // Pricing
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
    max: 1000000
  },
  
  currency: {
    type: String,
    default: 'GBP',
    enum: ['GBP', 'EUR', 'USD']
  },
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  
  status: {
    type: String,
    enum: ['draft', 'sent', 'updated'],
    default: 'draft'
  },
  
  // Audit Trail
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Email Tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  
  emailSentAt: Date,
  
  emailDeliveryStatus: {
    type: String,
    enum: ['pending', 'delivered', 'failed'],
    default: 'pending'
  },
  
  emailMessageId: String,
  
  // Notes and Comments
  internalNotes: {
    type: String,
    maxlength: 1000
  },
  
  // Booking Interest Tracking
  bookingInterest: {
    expressed: {
      type: Boolean,
      default: false
    },
    expressedAt: Date,
    contactName: {
      type: String,
      maxlength: 100
    },
    contactEmail: {
      type: String,
      maxlength: 200
    },
    contactPhone: {
      type: String,
      maxlength: 50
    },
    bookingUrgency: {
      type: String,
      enum: ['immediately', 'this-week', 'next-week', 'within-month', 'just-interested']
    },
    additionalRequests: {
      type: String,
      maxlength: 1000
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
QuoteSchema.index({ enquiryId: 1, version: -1 });
QuoteSchema.index({ createdBy: 1, createdAt: -1 });
QuoteSchema.index({ status: 1, createdAt: -1 });
QuoteSchema.index({ emailDeliveryStatus: 1 });
QuoteSchema.index({ 'bookingInterest.expressed': 1, 'bookingInterest.expressedAt': -1 });

// Virtual for formatted price
QuoteSchema.virtual('formattedPrice').get(function() {
  const currencySymbols: { [key: string]: string } = {
    'GBP': '£',
    'EUR': '€',
    'USD': '$'
  };
  
  const symbol = currencySymbols[this.currency] || this.currency;
  return `${symbol}${this.totalPrice.toLocaleString()}`;
});

// Virtual for quote reference
QuoteSchema.virtual('quoteReference').get(function() {
  return `Q${this._id.toString().slice(-8).toUpperCase()}`;
});

// Ensure virtual fields are serialized
QuoteSchema.set('toJSON', { virtuals: true });
QuoteSchema.set('toObject', { virtuals: true });

export default mongoose.models.Quote || mongoose.model<IQuote>('Quote', QuoteSchema);