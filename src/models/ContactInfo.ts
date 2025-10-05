import mongoose, { Document, Schema } from 'mongoose';

export interface ISocialMediaLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface IContactInfo extends Document {
  generalEnquiriesPhone: string;
  emergencyPhone: string;
  email: string;
  website: string;
  socialMediaLinks: ISocialMediaLinks;
  updatedAt: Date;
  updatedBy: mongoose.Types.ObjectId;
}

const SocialMediaLinksSchema = new Schema<ISocialMediaLinks>(
  {
    facebook: {
      type: String,
      validate: {
        validator: function (url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/(www\.)?facebook\.com\//.test(url);
        },
        message: 'Facebook URL must be a valid Facebook profile or page URL',
      },
    },
    instagram: {
      type: String,
      validate: {
        validator: function (url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/(www\.)?instagram\.com\//.test(url);
        },
        message: 'Instagram URL must be a valid Instagram profile URL',
      },
    },
    twitter: {
      type: String,
      validate: {
        validator: function (url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//.test(url);
        },
        message: 'Twitter URL must be a valid Twitter/X profile URL',
      },
    },
    linkedin: {
      type: String,
      validate: {
        validator: function (url: string) {
          if (!url) return true; // Optional field
          return /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\//.test(url);
        },
        message: 'LinkedIn URL must be a valid LinkedIn profile or company URL',
      },
    },
  },
  { _id: false }
);

const ContactInfoSchema = new Schema<IContactInfo>(
  {
    generalEnquiriesPhone: {
      type: String,
      required: [true, 'General enquiries phone number is required'],
      validate: {
        validator: function (phone: string) {
          // UK phone number validation (basic)
          return /^(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{10,11})$/.test(
            phone.replace(/\s/g, '')
          );
        },
        message: 'Please provide a valid UK phone number',
      },
    },
    emergencyPhone: {
      type: String,
      required: [true, 'Emergency phone number is required'],
      validate: {
        validator: function (phone: string) {
          // UK phone number validation (basic)
          return /^(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{10,11})$/.test(
            phone.replace(/\s/g, '')
          );
        },
        message: 'Please provide a valid UK emergency phone number',
      },
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      validate: {
        validator: function (email: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        },
        message: 'Please provide a valid email address',
      },
    },
    website: {
      type: String,
      required: [true, 'Website URL is required'],
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
    socialMediaLinks: {
      type: SocialMediaLinksSchema,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updater is required'],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Ensure only one contact info document exists
ContactInfoSchema.index({}, { unique: true });

// Static methods
ContactInfoSchema.statics.getContactInfo = async function () {
  let contactInfo = await this.findOne();
  if (!contactInfo) {
    // Create default contact info if none exists
    contactInfo = new this({
      generalEnquiriesPhone: '+44 20 1234 5678',
      emergencyPhone: '+44 20 1234 5679',
      email: 'info@infinityweekends.co.uk',
      website: 'https://infinityweekends.co.uk',
      socialMediaLinks: {},
      updatedBy: new mongoose.Types.ObjectId(), // Temporary ID, should be replaced with actual admin ID
    });
    await contactInfo.save();
  }
  return contactInfo;
};

ContactInfoSchema.statics.updateContactInfo = function (
  updates: Partial<IContactInfo>,
  updatedBy: mongoose.Types.ObjectId
) {
  return this.findOneAndUpdate(
    {},
    { ...updates, updatedBy, updatedAt: new Date() },
    { new: true, upsert: true, runValidators: true }
  );
};

// Instance methods
ContactInfoSchema.methods.updateSocialMedia = function (
  socialMediaUpdates: Partial<ISocialMediaLinks>
) {
  this.socialMediaLinks = { ...this.socialMediaLinks, ...socialMediaUpdates };
  return this.save();
};

export default mongoose.models.ContactInfo ||
  mongoose.model<IContactInfo>('ContactInfo', ContactInfoSchema);
