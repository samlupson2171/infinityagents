import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISettings extends Document {
  key: string;
  value: any;
  category: string;
  description?: string;
  isEncrypted: boolean;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettingsModel extends Model<ISettings> {
  getByKey(key: string): Promise<ISettings | null>;
  getByCategory(category: string): Promise<ISettings[]>;
  setEmailSettings(settings: any, updatedBy: mongoose.Types.ObjectId): Promise<ISettings[]>;
  getEmailSettings(): Promise<any>;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: {
      type: String,
      required: [true, 'Settings key is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Settings key cannot exceed 100 characters'],
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, 'Settings value is required'],
    },
    category: {
      type: String,
      required: [true, 'Settings category is required'],
      trim: true,
      maxlength: [50, 'Category cannot exceed 50 characters'],
      enum: ['email', 'system', 'security', 'ui', 'notifications'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Updated by user is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
SettingsSchema.index({ key: 1 });
SettingsSchema.index({ category: 1 });

// Static methods
SettingsSchema.statics.getByKey = function (key: string) {
  return this.findOne({ key });
};

SettingsSchema.statics.getByCategory = function (category: string) {
  return this.find({ category }).sort({ key: 1 });
};

SettingsSchema.statics.setEmailSettings = function (settings: any, updatedBy: mongoose.Types.ObjectId) {
  const emailSettings = [
    { key: 'email.smtp.host', value: settings.smtpHost, description: 'SMTP server hostname' },
    { key: 'email.smtp.port', value: settings.smtpPort, description: 'SMTP server port' },
    { key: 'email.smtp.user', value: settings.smtpUser, description: 'SMTP username' },
    { key: 'email.smtp.password', value: settings.smtpPassword, description: 'SMTP password', isEncrypted: true },
    { key: 'email.from.address', value: settings.fromEmail, description: 'Default from email address' },
    { key: 'email.from.name', value: settings.fromName, description: 'Default from name' },
    { key: 'email.tls.enabled', value: settings.enableTLS, description: 'Enable TLS/SSL encryption' },
  ];

  return Promise.all(
    emailSettings.map(setting =>
      this.findOneAndUpdate(
        { key: setting.key },
        {
          ...setting,
          category: 'email',
          updatedBy,
        },
        { upsert: true, new: true }
      )
    )
  );
};

SettingsSchema.statics.getEmailSettings = async function () {
  const settings = await this.find({ category: 'email' });
  const emailConfig: any = {};

  settings.forEach((setting: any) => {
    const keyParts = setting.key.split('.');
    if (keyParts[0] === 'email') {
      switch (setting.key) {
        case 'email.smtp.host':
          emailConfig.smtpHost = setting.value;
          break;
        case 'email.smtp.port':
          emailConfig.smtpPort = setting.value;
          break;
        case 'email.smtp.user':
          emailConfig.smtpUser = setting.value;
          break;
        case 'email.smtp.password':
          emailConfig.smtpPassword = setting.value;
          break;
        case 'email.from.address':
          emailConfig.fromEmail = setting.value;
          break;
        case 'email.from.name':
          emailConfig.fromName = setting.value;
          break;
        case 'email.tls.enabled':
          emailConfig.enableTLS = setting.value;
          break;
      }
    }
  });

  return emailConfig;
};

export default (mongoose.models.Settings as ISettingsModel) ||
  mongoose.model<ISettings, ISettingsModel>('Settings', SettingsSchema);