// Export all models for easy importing
export { default as User } from './User';
export { default as Offer } from './Offer';
export { default as Enquiry } from './Enquiry';
export { default as Quote } from './Quote';
export { default as TrainingMaterial } from './TrainingMaterial';
export { default as ContactInfo } from './ContactInfo';
export { default as Activity } from './Activity';
export { default as ActivityPackage } from './ActivityPackage';
export { default as ImportHistory } from './ImportHistory';
export { default as Destination } from './Destination';
export { default as ContractTemplate } from './ContractTemplate';
export { default as ContractSignature } from './ContractSignature';
export { default as FileStorage } from './FileStorage';

// Export interfaces
export type { IUser } from './User';
export type { IOffer, IFlexiblePricing, IOfferMetadata } from './Offer';
export type { IEnquiry } from './Enquiry';
export type { IQuote } from './Quote';
export type { ITrainingMaterial, IUploadedFile } from './TrainingMaterial';
export type { IContactInfo, ISocialMediaLinks } from './ContactInfo';
export type { IActivity } from './Activity';
export type { IActivityPackage, IPackageActivity } from './ActivityPackage';
export type {
  IImportHistory,
  IOfferChange,
  IImportSummary,
} from './ImportHistory';
export type {
  IDestination,
  IDestinationSection,
  IQuickFacts,
} from './Destination';
export type { IContractTemplate } from './ContractTemplate';
export type { IContractSignature } from './ContractSignature';
export type { IFileStorage } from './FileStorage';

// Export enums
export { ActivityCategory } from './Activity';
