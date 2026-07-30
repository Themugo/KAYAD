// Dealer Business Center Types

export interface DealerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  logo?: string;
  coverImage?: string;
  description: string;
  branches: DealerBranch[];
  openingHours: OpeningHours[];
  contacts: DealerContact[];
  photos: string[];
  videos: string[];
  certifications: Certification[];
  awards: Award[];
  verifiedStatus: 'pending' | 'verified' | 'rejected';
  socialLinks: SocialLinks;
  mapLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  subscription: SubscriptionInfo;
}

export interface DealerBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  isMain: boolean;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface DealerContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate?: string;
  documentUrl?: string;
}

export interface Award {
  id: string;
  name: string;
  issuedBy: string;
  year: number;
  description?: string;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

export interface SubscriptionInfo {
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled';
  renewalDate: string;
  features: string[];
  listingsUsed: number;
  listingsLimit: number;
}

// Inventory Types
export interface DealerVehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
  transmission: 'Automatic' | 'Manual';
  color: string;
  condition: 'New' | 'Used' | 'Certified Pre-Owned';
  status: 'Active' | 'Draft' | 'Pending Review' | 'Sold' | 'Archived' | 'Expired';
  stockStatus: 'In Stock' | 'Reserved' | 'Sold';
  images: string[];
  location: string;
  county: string;
  viewsCount: number;
  savesCount: number;
  inquiriesCount: number;
  ntsaTimsVerified: boolean;
  createdAt: string;
  updatedAt: string;
  auctionEnabled: boolean;
  auctionId?: string;
  financingAvailable: boolean;
}

// Lead Types
export interface DealerLead {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  source: 'Website' | 'Phone Call' | 'WhatsApp' | 'Walk-in' | 'Referral' | 'Social Media';
  status: 'New' | 'Hot' | 'Viewed' | 'Negotiating' | 'Reserved' | 'Won' | 'Lost' | 'Archived';
  assignedStaffId?: string;
  assignedStaffName?: string;
  followUpDate?: string;
  notes: string[];
  createdAt: string;
  lastContactAt?: string;
}

// Staff Types
export type StaffRole = 
  | 'Dealer Owner'
  | 'Sales Manager'
  | 'Sales Executive'
  | 'Inventory Manager'
  | 'Finance Officer'
  | 'Auction Coordinator'
  | 'Marketing Officer'
  | 'Customer Support';

export interface StaffPermissions {
  inventory: { view: boolean; edit: boolean; create: boolean; delete: boolean };
  leads: { view: boolean; edit: boolean; assign: boolean };
  auctions: { view: boolean; create: boolean; manage: boolean };
  financing: { view: boolean; manage: boolean };
  staff: { view: boolean; manage: boolean };
  reports: { view: boolean; generate: boolean; export: boolean };
  marketing: { view: boolean; manage: boolean };
  settings: { view: boolean; edit: boolean };
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  avatar?: string;
  permissions: StaffPermissions;
  isActive: boolean;
  joinedAt: string;
  lastActiveAt?: string;
}

// Test Drive Types
export interface TestDrive {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  scheduledDate: string;
  scheduledTime: string;
  staffId: string;
  staffName: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No Show';
  feedback?: string;
  rating?: number;
  notes?: string;
  createdAt: string;
}

// Inspection Types
export interface DealerInspection {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  customerName: string;
  inspectorName?: string;
  requestedAt: string;
  scheduledTime?: string;
  status: 'Requested' | 'Booked' | 'In Progress' | 'Completed' | 'Cancelled';
  overallScore?: number;
  reportUrl?: string;
  reportSummary?: string;
  mechanicNotes?: string;
}

// Finance Types
export interface FinanceLead {
  id: string;
  leadId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId: string;
  vehicleTitle: string;
  vehiclePrice: number;
  loanAmount: number;
  downPayment: number;
  tenureMonths: number;
  bankId: string;
  bankName: string;
  status: 'Application' | 'Documents Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Disbursed';
  requiredDocuments: string[];
  applicationHistory: FinanceHistoryEntry[];
  createdAt: string;
}

export interface FinanceHistoryEntry {
  date: string;
  action: string;
  description: string;
  performedBy?: string;
}

export interface BankPartner {
  id: string;
  name: string;
  logo: string;
  interestRateMin: number;
  interestRateMax: number;
  maxTenure: number;
  processingTime: string;
}

// Auction Types
export interface DealerAuction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImage: string;
  startingPrice: number;
  reservePrice?: number;
  currentBid?: number;
  bidCount: number;
  participantCount: number;
  startTime: string;
  endTime: string;
  status: 'Upcoming' | 'Active' | 'Ended' | 'Cancelled';
  winnerName?: string;
  winnerPhone?: string;
  revenue: number;
  fees: number;
  netRevenue: number;
}

// Message Types
export interface DealerMessage {
  id: string;
  threadId: string;
  type: 'Buyer Chat' | 'Auction Enquiry' | 'Inspection Request' | 'Finance Question' | 'Support' | 'Internal Note';
  subject: string;
  senderName: string;
  senderPhone: string;
  senderEmail?: string;
  content: string;
  isRead: boolean;
  isArchived: boolean;
  vehicleId?: string;
  vehicleTitle?: string;
  relatedId?: string;
  createdAt: string;
}

// Analytics Types
export interface DealerAnalytics {
  vehiclesSold: number;
  conversionRate: number;
  leadResponseTime: number;
  avgDaysInStock: number;
  mostViewedVehicles: AnalyticsVehicle[];
  mostEnquiredVehicles: AnalyticsVehicle[];
  financeConversion: number;
  inspectionConversion: number;
  auctionSuccess: number;
  revenueData: RevenueDataPoint[];
  inventoryTrends: InventoryTrend[];
  leadSources: LeadSource[];
  salesFunnel: SalesFunnelStage[];
}

export interface AnalyticsVehicle {
  id: string;
  title: string;
  count: number;
  image: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  target?: number;
}

export interface InventoryTrend {
  month: string;
  inStock: number;
  sold: number;
  new: number;
}

export interface LeadSource {
  source: string;
  count: number;
  percentage: number;
}

export interface SalesFunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

// Document Types
export interface DealerDocument {
  id: string;
  type: 'Vehicle' | 'Ownership' | 'Inspection' | 'Finance' | 'Customer Agreement' | 'Internal';
  vehicleId?: string;
  vehicleTitle?: string;
  customerName?: string;
  name: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Report Types
export interface ReportConfig {
  type: 'Inventory' | 'Sales' | 'Leads' | 'Auction' | 'Finance' | 'Marketing' | 'Performance';
  format: 'PDF' | 'Excel' | 'CSV';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
}

// Notification Types
export interface DealerNotification {
  id: string;
  type: 'Enquiry' | 'Approval' | 'Inspection' | 'Finance' | 'Auction' | 'Sale' | 'Alert' | 'Subscription';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// Marketing Types
export interface MarketingCampaign {
  id: string;
  type: 'Featured Listing' | 'Promotion' | 'Homepage Campaign' | 'Dealer Spotlight' | 'Seasonal' | 'Lead Campaign';
  title: string;
  status: 'Active' | 'Scheduled' | 'Ended' | 'Draft';
  startDate: string;
  endDate?: string;
  vehicleIds: string[];
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
}

// Quick Action Types
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

// KPI Card Types
export interface KpiCard {
  id: string;
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color: string;
}
