// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - TYPES
// ============================================================

export interface ExecutiveDashboard {
  summary: DashboardSummary;
  upcomingJobs: UpcomingJob[];
  quickStats: QuickStats;
}

export interface DashboardSummary {
  todaysJobs: number;
  jobsAwaitingAssignment: number;
  engineersOnDuty: number;
  engineersTravelling: number;
  reportsPending: number;
  reportsInQA: number;
  completedToday: number;
  revenueToday: number;
  monthlyRevenue: number;
  averageRating: number;
  customerSatisfaction: number;
  cancelledToday: number;
  qualityAlerts: number;
}

export interface QuickStats {
  totalEngineers: number;
  totalBookings: number;
  totalRevenue: number;
  avgInspectionTime: number;
}

export interface UpcomingJob {
  id: string;
  reference: string;
  customerName: string;
  vehicle: string;
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  engineerId: string | null;
  county: string;
}

export interface Engineer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl?: string;
  role: EngineerRole;
  skills: string[];
  vehicleTypes: string[];
  certifications: any[];
  yearsExperience: number;
  inspectionCount: number;
  averageRating: number;
  isAvailable: boolean;
  location: {
    county?: string;
    town?: string;
    latitude?: number;
    longitude?: number;
  };
  performance: {
    onTimeRate: number;
    qualityScore: number;
    avgInspectionTime: number;
  };
}

export type EngineerRole = 
  | 'lead_engineer'
  | 'senior_inspector'
  | 'junior_inspector'
  | 'electrical_specialist'
  | 'body_specialist'
  | 'commercial_specialist'
  | 'motorcycle_specialist'
  | 'qa_reviewer';

export interface Booking {
  id: string;
  reference: string;
  customerName: string;
  vehicle: string;
  registration?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: BookingStatus;
  price: number;
  engineerId?: string;
  county?: string;
  town?: string;
}

export type BookingStatus = 
  | 'booked'
  | 'confirmed'
  | 'inspector_assigned'
  | 'travelling'
  | 'inspection_started'
  | 'inspection_complete'
  | 'report_generated'
  | 'customer_reviewed'
  | 'closed'
  | 'cancelled'
  | 'no_show';

export interface ReportVersion {
  id: string;
  reportId: string;
  versionNumber: number;
  status: ReportStatus;
  content: any;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  sentVia?: string;
  corrections?: ReportCorrection[];
}

export type ReportStatus = 
  | 'draft'
  | 'engineer_complete'
  | 'qa_review'
  | 'corrections_requested'
  | 'approved'
  | 'sent'
  | 'archived';

export interface ReportCorrection {
  id: string;
  section: string;
  issue: string;
  suggestion?: string;
  status: 'pending' | 'fixed' | 'rejected';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  companyName?: string;
  totalInspections: number;
  totalSpent: number;
  lastInspectionDate?: string;
  averageRating: number;
  isActive: boolean;
}

export type CustomerType = 
  | 'private_buyer'
  | 'dealer'
  | 'auction'
  | 'fleet'
  | 'insurance'
  | 'corporate'
  | 'other';

export interface BusinessAnalytics {
  overview: AnalyticsOverview;
  jobs: JobsAnalytics;
  revenue: RevenueAnalytics;
  engineers: EngineersAnalytics;
  customers: CustomersAnalytics;
  quality: QualityAnalytics;
}

export interface AnalyticsOverview {
  period: string;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  grossRevenue: number;
  averageJobValue: number;
  revenueGrowth: number;
  jobGrowth: number;
}

export interface JobsAnalytics {
  completedJobs: number;
  averageInspectionTime: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byType: Array<{ type: string; count: number; revenue: number }>;
  byCounty: Array<{ county: string; count: number }>;
  trend: Array<{ day: string; current: number; previous: number }>;
}

export interface RevenueAnalytics {
  grossRevenue: number;
  netRevenue: number;
  averageJobValue: number;
  revenueByType: Record<string, number>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  comparison: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
}

export interface EngineersAnalytics {
  totalEngineers: number;
  utilizationRate: number;
  topPerformers: Array<{
    id: string;
    name: string;
    role: string;
    completedInspections: number;
    averageRating: number;
    qualityScore: number;
  }>;
  workloadDistribution: Array<{
    engineerId: string;
    name: string;
    jobsAssigned: number;
    percentage: number;
  }>;
}

export interface CustomersAnalytics {
  newCustomers: number;
  repeatCustomers: number;
  averageRating: number;
  customerByType: Array<{
    type: string;
    count: number;
    totalSpent: number;
  }>;
}

export interface QualityAnalytics {
  averageScore: number;
  reportsApproved: number;
  reportsRejected: number;
  approvalRate: number;
}

export interface FinancialOverview {
  period: string;
  summary: {
    grossRevenue: number;
    commissionPaid: number;
    commissionRate: number;
    netRevenue: number;
    pendingPayments: number;
    completedSettlements: number;
    pendingSettlements: number;
    pendingSettlementAmount: number;
  };
  breakdown: {
    byInspectionType: Record<string, { count: number; revenue: number }>;
    byPaymentStatus: { paid: number; pending: number };
  };
  settlements: Array<{
    id: string;
    reference: string;
    amount: number;
    status: string;
    periodStart: string;
    periodEnd: string;
  }>;
}

export interface ScheduleDay {
  date: string;
  dayName: string;
  jobsCount: number;
  totalRevenue: number;
  jobs: Booking[];
}

export interface WeeklySchedule {
  startDate: string;
  endDate: string;
  days: ScheduleDay[];
  totalJobs: number;
  totalRevenue: number;
}

// Constants
export const ENGINEER_ROLES: Record<EngineerRole, string> = {
  lead_engineer: 'Lead Engineer',
  senior_inspector: 'Senior Inspector',
  junior_inspector: 'Junior Inspector',
  electrical_specialist: 'Electrical Specialist',
  body_specialist: 'Body Specialist',
  commercial_specialist: 'Commercial Specialist',
  motorcycle_specialist: 'Motorcycle Specialist',
  qa_reviewer: 'QA Reviewer',
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  booked: 'New Request',
  confirmed: 'Accepted',
  inspector_assigned: 'Engineer Assigned',
  travelling: 'Travelling',
  inspection_started: 'In Progress',
  inspection_complete: 'Inspection Complete',
  report_generated: 'Report Ready',
  customer_reviewed: 'Delivered',
  closed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  engineer_complete: 'Engineer Complete',
  qa_review: 'Quality Review',
  corrections_requested: 'Corrections Requested',
  approved: 'Approved',
  sent: 'Sent to Customer',
  archived: 'Archived',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  private_buyer: 'Private Buyer',
  dealer: 'Dealer',
  auction: 'Auction Buyer',
  fleet: 'Fleet Customer',
  insurance: 'Insurance Company',
  corporate: 'Corporate',
  other: 'Other',
};
