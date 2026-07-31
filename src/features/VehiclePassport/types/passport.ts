// ============================================================
// KAYAD DIGITAL VEHICLE PASSPORT - TYPES
// ============================================================

export interface VehiclePassport {
  id: string;
  passportNumber: string;
  vin?: string;
  chassisNumber?: string;
  engineNumber?: string;
  registrationNumber?: string;
  make: string;
  model: string;
  trim?: string;
  year?: number;
  bodyType?: string;
  colour?: string;
  countryOfOrigin?: string;
  engineCapacity?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  vehicleCategory?: string;
  status: 'active' | 'inactive' | 'write_off' | 'exported';
  isVerified: boolean;
  verificationLevel: 'basic' | 'standard' | 'premium';
  
  // Trust Scores
  trustScore: number;
  inspectionScore: number;
  maintenanceScore: number;
  ownershipScore: number;
  documentationScore: number;
  
  // Related Data
  badges: VerificationBadge[];
  timeline: TimelineEvent[];
  ownership: OwnershipRecord[];
  inspections: InspectionRecord[];
  services: ServiceRecord[];
  accidents: AccidentRecord[];
  auctions: AuctionRecord[];
  finances: FinanceRecord[];
  marketplace: MarketplaceRecord[];
  documents: DocumentRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface PublicVehiclePassport {
  passportId: string;
  passportNumber: string;
  status: string;
  vehicle: {
    make: string;
    model: string;
    year?: number;
    vin: string;
    registration?: string;
  };
  latestInspection?: {
    date: string;
    grade: string;
    score: number;
    provider: string;
  };
  ownership?: {
    type: string;
    verified: boolean;
  };
  trustScore: number;
  badges: { code: string; name: string }[];
  timelineSummary: TimelineEventSummary[];
  documentCount: number;
  createdAt: string;
}

export interface VerificationBadge {
  id: string;
  passportId: string;
  badgeCode: string;
  badgeName: string;
  badgeDescription?: string;
  criteriaMet?: Record<string, any>;
  awardedAt: string;
  awardedBy?: string;
  isActive: boolean;
  expiresAt?: string;
}

export type TimelineEventType = 
  | 'import'
  | 'registration'
  | 'listing'
  | 'inspection'
  | 'auction_listed'
  | 'auction_sold'
  | 'ownership_transfer'
  | 'finance_approved'
  | 'insurance_inspection'
  | 'service_record'
  | 'maintenance'
  | 'accident'
  | 'recall'
  | 'warranty'
  | 'roadworthy_certificate';

export interface TimelineEvent {
  id: string;
  passportId: string;
  eventType: TimelineEventType;
  eventCategory?: string;
  eventTitle: string;
  eventDescription?: string;
  eventDate: string;
  eventTime?: string;
  isVerified: boolean;
  verifiedSource?: string;
  referenceNumber?: string;
  evidenceUrls?: string[];
  documents?: string[];
  relatedInspectionId?: string;
  relatedAuctionId?: string;
  relatedListingId?: string;
  relatedServiceId?: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: string;
}

export interface TimelineEventSummary {
  id: string;
  eventType: TimelineEventType;
  eventTitle: string;
  eventDate: string;
  isVerified: boolean;
  verifiedSource?: string;
}

export interface OwnershipRecord {
  id: string;
  ownershipNumber: number;
  ownershipStart: string;
  ownershipEnd?: string;
  ownershipType: 'dealer' | 'corporate' | 'private' | 'fleet' | 'government' | 'auction';
  ownerDisplayName: string;
  isCurrent: boolean;
  isVerified: boolean;
  transferMethod?: string;
}

export interface InspectionRecord {
  id: string;
  inspectionId?: string;
  inspectionDate: string;
  inspectionType: string;
  providerId?: string;
  providerName?: string;
  overallScore: number;
  overallGrade: string;
  mechanicalScore?: number;
  safetyScore?: number;
  bodyScore?: number;
  interiorScore?: number;
  electricalScore?: number;
  criticalDefects?: number;
  majorDefects?: number;
  minorDefects?: number;
  reportVerificationCode?: string;
}

export interface ServiceRecord {
  id: string;
  serviceDate: string;
  serviceType: string;
  serviceTitle: string;
  workshopName?: string;
  workshopVerified?: boolean;
  mileageAtService?: number;
  serviceCost?: number;
  currency?: string;
  invoiceNumber?: string;
  isVerified?: boolean;
}

export interface AccidentRecord {
  id: string;
  accidentDate: string;
  accidentType: 'minor' | 'moderate' | 'major' | 'structural' | 'write_off';
  description?: string;
  location?: string;
  policeReportNumber?: string;
  insuranceClaimNumber?: string;
  impactZones?: string[];
  hasStructuralDamage?: boolean;
  repairStatus?: string;
  repairCompletionDate?: string;
  estimatedDamage?: number;
  isVerified?: boolean;
}

export interface AuctionRecord {
  id: string;
  auctionDate: string;
  auctionOrganizer?: string;
  organizerVerified?: boolean;
  auctionType?: string;
  lotNumber?: string;
  reserveMet?: boolean;
  sold?: boolean;
  sellingPrice?: number;
  currency?: string;
  winningBidderDisplay?: string;
  inspectionId?: string;
  isVerified?: boolean;
}

export interface FinanceRecord {
  id: string;
  eventDate: string;
  eventType: string;
  financialInstitution?: string;
  institutionVerified?: boolean;
  loanAmount?: number;
  currency?: string;
  loanTermMonths?: number;
  isActive?: boolean;
  clearanceDate?: string;
  isVerified?: boolean;
}

export interface MarketplaceRecord {
  id: string;
  listingId?: string;
  listingDate?: string;
  listingPrice?: number;
  currency?: string;
  eventType: string;
  eventDate: string;
  viewCount?: number;
  saveCount?: number;
  inquiryCount?: number;
  inspectionRequests?: number;
  soldPrice?: number;
  soldDate?: string;
  isVerified?: boolean;
}

export interface DocumentRecord {
  id: string;
  passportId: string;
  documentType: string;
  documentTitle: string;
  documentDescription?: string;
  fileUrl?: string;
  fileType?: string;
  isVerified?: boolean;
  visibility: 'public' | 'private' | 'restricted';
  createdAt: string;
}

// Badge Definitions
export const BADGE_DEFINITIONS: Record<string, { name: string; description: string; icon: string }> = {
  verified_identity: { name: 'Verified Identity', description: 'Vehicle identity verified', icon: 'Shield' },
  verified_ownership: { name: 'Verified Ownership', description: 'Ownership history verified', icon: 'UserCheck' },
  verified_inspection: { name: 'Verified Inspection', description: 'Inspected by KAYAD certified provider', icon: 'ClipboardCheck' },
  verified_dealer: { name: 'Verified Dealer', description: 'Sold through verified dealer', icon: 'Building2' },
  verified_auction: { name: 'Verified Auction', description: 'Auction history verified', icon: 'Gavel' },
  verified_service: { name: 'Verified Service', description: 'Service history verified', icon: 'Wrench' },
  verified_finance: { name: 'Verified Finance', description: 'Finance history verified', icon: 'DollarSign' },
  verified_documentation: { name: 'Verified Documentation', description: 'All documents verified', icon: 'FileCheck' },
};

// Event Type Labels
export const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  import: 'Imported',
  registration: 'Registered',
  listing: 'Listed on Marketplace',
  inspection: 'Inspected',
  auction_listed: 'Auction Listed',
  auction_sold: 'Auction Sold',
  ownership_transfer: 'Ownership Transferred',
  finance_approved: 'Finance Approved',
  insurance_inspection: 'Insurance Inspection',
  service_record: 'Service Record',
  maintenance: 'Maintenance',
  accident: 'Accident',
  recall: 'Recall Notice',
  warranty: 'Warranty',
  roadworthy_certificate: 'Roadworthy Certificate',
};

// Event Type Icons (Lucide icon names)
export const EVENT_TYPE_ICONS: Record<TimelineEventType, string> = {
  import: 'Plane',
  registration: 'FileText',
  listing: 'ShoppingCart',
  inspection: 'ClipboardCheck',
  auction_listed: 'Gavel',
  auction_sold: 'Gavel',
  ownership_transfer: 'ArrowRightLeft',
  finance_approved: 'DollarSign',
  insurance_inspection: 'Shield',
  service_record: 'Wrench',
  maintenance: 'Settings',
  accident: 'AlertTriangle',
  recall: 'AlertCircle',
  warranty: 'Award',
  roadworthy_certificate: 'CheckCircle',
};
