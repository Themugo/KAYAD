/**
 * Auction Readiness & Compliance Engine
 * Validates auction completeness before publication
 */

import type { AuctionSession, Vehicle } from '../types';

// ============================================================
// Types
// ============================================================

export type ReadinessSeverity = 'critical' | 'warning' | 'info';

export interface ReadinessCheck {
  id: string;
  label: string;
  description: string;
  section: ReadinessSection;
  severity: ReadinessSeverity;
  isComplete: boolean;
  isRequired: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

export interface ReadinessSection {
  id: string;
  title: string;
  icon: string;
  order: number;
}

export interface ReadinessResult {
  totalChecks: number;
  completedChecks: number;
  score: number; // 0-100
  sections: {
    section: ReadinessSection;
    checks: ReadinessCheck[];
    completedCount: number;
    totalCount: number;
  }[];
  criticalIssues: ReadinessCheck[];
  warnings: ReadinessCheck[];
  isPublishable: boolean;
  nextAction?: {
    label: string;
    section: string;
  };
}

// ============================================================
// Sections Definition
// ============================================================

export const READINESS_SECTIONS: ReadinessSection[] = [
  { id: 'organizer', title: 'Organizer Verification', icon: 'shield-check', order: 1 },
  { id: 'vehicle', title: 'Vehicle Information', icon: 'car', order: 2 },
  { id: 'media', title: 'Media Quality', icon: 'camera', order: 3 },
  { id: 'viewing', title: 'Viewing Arrangements', icon: 'eye', order: 4 },
  { id: 'inspection', title: 'Inspection Status', icon: 'clipboard-check', order: 5 },
  { id: 'bid_security', title: 'Bid Security', icon: 'lock', order: 6 },
  { id: 'auction_settings', title: 'Auction Settings', icon: 'settings', order: 7 },
  { id: 'fulfilment', title: 'Winner Fulfilment', icon: 'trophy', order: 8 },
];

// ============================================================
// Check Definitions
// ============================================================

export interface AuctionReadinessData {
  // Organizer Verification
  organizerVerified: boolean;
  businessProfileComplete: boolean;
  contactInfoVerified: boolean;
  paymentAccountsVerified: boolean;
  licensesUploaded: boolean;
  identityVerified: boolean;

  // Vehicle Information
  vehicleOwnershipVerified: boolean;
  vehicleDescriptionComplete: boolean;
  vinRecorded: boolean;
  registrationComplete: boolean;
  reservePriceConfigured: boolean;
  openingBidConfigured: boolean;
  bidIncrementDefined: boolean;

  // Media Quality
  minPhotosUploaded: boolean;
  interiorPhotos: boolean;
  exteriorPhotos: boolean;
  engineBayPhotos: boolean;
  dashboardPhotos: boolean;
  tyresPhotos: boolean;
  videoUploaded?: boolean;

  // Viewing Arrangements
  viewingDatesConfigured: boolean;
  viewingHoursSet: boolean;
  viewingLocationConfirmed: boolean;
  viewingInstructionsPublished: boolean;

  // Inspection Status
  inspectionReportAvailable: boolean;
  inspectionBookingAvailable: boolean;

  // Bid Security
  bidSecurityAmountConfigured: boolean;
  paymentRecipientConfirmed: boolean;
  bankDetailsVerified: boolean;
  refundPolicyPublished: boolean;
  paymentVerificationMethodConfigured: boolean;

  // Auction Settings
  auctionDateSet: boolean;
  startTimeSet: boolean;
  endTimeSet: boolean;
  auctionRulesAccepted: boolean;
  termsAccepted: boolean;
  buyNowConfigured?: boolean;
  autoBidConfigured?: boolean;

  // Winner Fulfilment
  winningPaymentInstructionsPublished: boolean;
  collectionLocationConfirmed: boolean;
  ownershipTransferDefined: boolean;
  buyerDocumentsListed: boolean;
}

// ============================================================
// Helpers
// ============================================================

export function getDefaultReadinessData(): AuctionReadinessData {
  return {
    organizerVerified: false,
    businessProfileComplete: false,
    contactInfoVerified: false,
    paymentAccountsVerified: false,
    licensesUploaded: false,
    identityVerified: false,
    vehicleOwnershipVerified: false,
    vehicleDescriptionComplete: false,
    vinRecorded: false,
    registrationComplete: false,
    reservePriceConfigured: false,
    openingBidConfigured: false,
    bidIncrementDefined: false,
    minPhotosUploaded: false,
    interiorPhotos: false,
    exteriorPhotos: false,
    engineBayPhotos: false,
    dashboardPhotos: false,
    tyresPhotos: false,
    viewingDatesConfigured: false,
    viewingHoursSet: false,
    viewingLocationConfirmed: false,
    viewingInstructionsPublished: false,
    inspectionReportAvailable: false,
    inspectionBookingAvailable: false,
    bidSecurityAmountConfigured: false,
    paymentRecipientConfirmed: false,
    bankDetailsVerified: false,
    refundPolicyPublished: false,
    paymentVerificationMethodConfigured: false,
    auctionDateSet: false,
    startTimeSet: false,
    endTimeSet: false,
    auctionRulesAccepted: false,
    termsAccepted: false,
    winningPaymentInstructionsPublished: false,
    collectionLocationConfirmed: false,
    ownershipTransferDefined: false,
    buyerDocumentsListed: false,
  };
}

// ============================================================
// Validation Logic
// ============================================================

export function validateAuctionReadiness(
  session: Partial<AuctionSession>,
  vehicle: Partial<Vehicle>,
  data: Partial<AuctionReadinessData>
): ReadinessResult {
  const sections = READINESS_SECTIONS.map(section => {
    const checks = getChecksForSection(section.id, session, vehicle, data);
    const completedCount = checks.filter(c => c.isComplete).length;
    return {
      section,
      checks,
      completedCount,
      totalCount: checks.length,
    };
  });

  const allChecks = sections.flatMap(s => s.checks);
  const completedChecks = allChecks.filter(c => c.isComplete).length;
  const totalChecks = allChecks.length;
  const score = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

  const criticalIssues = allChecks.filter(c => c.severity === 'critical' && !c.isComplete);
  const warnings = allChecks.filter(c => c.severity === 'warning' && !c.isComplete);
  const isPublishable = criticalIssues.length === 0;

  // Find next action
  let nextAction: ReadinessResult['nextAction'];
  if (!isPublishable) {
    const firstCritical = criticalIssues[0];
    if (firstCritical) {
      nextAction = {
        label: firstCritical.actionLabel || `Complete: ${firstCritical.label}`,
        section: firstCritical.section.title,
      };
    }
  }

  return {
    totalChecks,
    completedChecks,
    score,
    sections,
    criticalIssues,
    warnings,
    isPublishable,
    nextAction,
  };
}

function getChecksForSection(
  sectionId: string,
  session: Partial<AuctionSession>,
  vehicle: Partial<Vehicle>,
  data: Partial<AuctionReadinessData>
): ReadinessCheck[] {
  switch (sectionId) {
    case 'organizer':
      return [
        {
          id: 'org-verified',
          label: 'Organization Verified',
          description: 'Your organization identity has been verified by KAYAD',
          section: READINESS_SECTIONS[0],
          severity: 'critical',
          isComplete: data.organizerVerified || session.organizer?.isVerified || false,
          isRequired: true,
        },
        {
          id: 'business-profile',
          label: 'Business Profile Complete',
          description: 'All required business information has been added to your profile',
          section: READINESS_SECTIONS[0],
          severity: 'critical',
          isComplete: data.businessProfileComplete || !!session.organizer?.profileUrl,
          isRequired: true,
        },
        {
          id: 'contact-info',
          label: 'Contact Information Verified',
          description: 'Phone, email and address have been verified',
          section: READINESS_SECTIONS[0],
          severity: 'critical',
          isComplete: data.contactInfoVerified || !!(session.organizer?.phone && session.organizer?.email),
          isRequired: true,
        },
        {
          id: 'payment-accounts',
          label: 'Payment Accounts Verified',
          description: 'Your payment receiving accounts have been verified',
          section: READINESS_SECTIONS[0],
          severity: 'critical',
          isComplete: data.paymentAccountsVerified || !!session.organizer?.paymentDetails,
          isRequired: true,
        },
        {
          id: 'licenses',
          label: 'Required Licenses Uploaded',
          description: 'All required business licenses have been uploaded and verified',
          section: READINESS_SECTIONS[0],
          severity: data.licensesUploaded ? 'info' : 'warning',
          isComplete: data.licensesUploaded || false,
          isRequired: false,
        },
        {
          id: 'identity',
          label: 'Identity Verification Complete',
          description: 'Principal officer identity has been verified',
          section: READINESS_SECTIONS[0],
          severity: 'critical',
          isComplete: data.identityVerified || false,
          isRequired: true,
        },
      ];

    case 'vehicle':
      return [
        {
          id: 'vehicle-ownership',
          label: 'Vehicle Ownership Verified',
          description: 'Proof of ownership documentation has been verified',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.vehicleOwnershipVerified || false,
          isRequired: true,
        },
        {
          id: 'vehicle-description',
          label: 'Vehicle Description Complete',
          description: 'Make, model, year, mileage and condition documented',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.vehicleDescriptionComplete || !!(vehicle.make && vehicle.model && vehicle.year),
          isRequired: true,
        },
        {
          id: 'vin-recorded',
          label: 'VIN / Chassis Number Recorded',
          description: 'Vehicle identification number has been recorded',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.vinRecorded || false,
          isRequired: true,
        },
        {
          id: 'registration-complete',
          label: 'Registration Details Complete',
          description: 'Current registration and logbook status verified',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.registrationComplete || false,
          isRequired: true,
        },
        {
          id: 'reserve-price',
          label: 'Reserve Price Configured',
          description: 'Reserve price has been set (if applicable)',
          section: READINESS_SECTIONS[1],
          severity: 'info',
          isComplete: data.reservePriceConfigured || !!(session.reservePrice && session.reservePrice > 0),
          isRequired: false,
        },
        {
          id: 'opening-bid',
          label: 'Opening Bid Configured',
          description: 'Starting auction price has been set',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.openingBidConfigured || !!(session.startingPrice && session.startingPrice > 0),
          isRequired: true,
        },
        {
          id: 'bid-increment',
          label: 'Bid Increment Rules Defined',
          description: 'Minimum bid increment has been configured',
          section: READINESS_SECTIONS[1],
          severity: 'critical',
          isComplete: data.bidIncrementDefined || !!(session.minimumIncrement && session.minimumIncrement > 0),
          isRequired: true,
        },
      ];

    case 'media':
      return [
        {
          id: 'min-photos',
          label: 'Minimum Required Photos (6+)',
          description: 'At least 6 photos have been uploaded',
          section: READINESS_SECTIONS[2],
          severity: 'critical',
          isComplete: data.minPhotosUploaded || false,
          isRequired: true,
          actionLabel: 'Upload vehicle photos',
        },
        {
          id: 'interior-photos',
          label: 'Interior Photos',
          description: 'Interior views including seats, dashboard, and storage',
          section: READINESS_SECTIONS[2],
          severity: 'critical',
          isComplete: data.interiorPhotos || false,
          isRequired: true,
        },
        {
          id: 'exterior-photos',
          label: 'Exterior Photos',
          description: 'All four sides plus front and rear views',
          section: READINESS_SECTIONS[2],
          severity: 'critical',
          isComplete: data.exteriorPhotos || false,
          isRequired: true,
        },
        {
          id: 'engine-bay',
          label: 'Engine Bay',
          description: 'Clear photo of the engine compartment',
          section: READINESS_SECTIONS[2],
          severity: 'warning',
          isComplete: data.engineBayPhotos || false,
          isRequired: false,
        },
        {
          id: 'dashboard-photos',
          label: 'Dashboard & Controls',
          description: 'Odometer reading and dashboard condition',
          section: READINESS_SECTIONS[2],
          severity: 'warning',
          isComplete: data.dashboardPhotos || false,
          isRequired: false,
        },
        {
          id: 'tyres-photos',
          label: 'Tyres & Wheels',
          description: 'All four tyres and wheel condition',
          section: READINESS_SECTIONS[2],
          severity: 'warning',
          isComplete: data.tyresPhotos || false,
          isRequired: false,
        },
        {
          id: 'video-uploaded',
          label: 'Video Walkthrough (Optional)',
          description: 'Optional video showcasing the vehicle',
          section: READINESS_SECTIONS[2],
          severity: 'info',
          isComplete: data.videoUploaded || false,
          isRequired: false,
        },
      ];

    case 'viewing':
      return [
        {
          id: 'viewing-dates',
          label: 'Viewing Dates Configured',
          description: 'Public viewing dates have been scheduled',
          section: READINESS_SECTIONS[3],
          severity: 'critical',
          isComplete: data.viewingDatesConfigured || !!(session.viewingDates),
          isRequired: true,
          actionLabel: 'Set viewing dates',
        },
        {
          id: 'viewing-hours',
          label: 'Viewing Hours Set',
          description: 'Specific viewing hours have been defined',
          section: READINESS_SECTIONS[3],
          severity: 'critical',
          isComplete: data.viewingHoursSet || !!(session.viewingDates),
          isRequired: true,
        },
        {
          id: 'viewing-location',
          label: 'Viewing Location Confirmed',
          description: 'Exact viewing address has been confirmed',
          section: READINESS_SECTIONS[3],
          severity: 'critical',
          isComplete: data.viewingLocationConfirmed || !!(session.viewingLocation || vehicle.location),
          isRequired: true,
        },
        {
          id: 'viewing-instructions',
          label: 'Viewing Instructions Published',
          description: 'Special instructions for viewers have been added',
          section: READINESS_SECTIONS[3],
          severity: 'warning',
          isComplete: data.viewingInstructionsPublished || false,
          isRequired: false,
        },
      ];

    case 'inspection':
      return [
        {
          id: 'inspection-report',
          label: 'Existing Inspection Report Available',
          description: 'A certified inspection report is available for download',
          section: READINESS_SECTIONS[4],
          severity: 'critical',
          isComplete: data.inspectionReportAvailable || vehicle.inspectionPassed || false,
          isRequired: data.inspectionBookingAvailable ? false : true,
          actionLabel: 'Upload inspection report',
        },
        {
          id: 'inspection-booking',
          label: 'Inspection Booking Available',
          description: 'Buyers can book inspections through KAYAD Mechanic Marketplace',
          section: READINESS_SECTIONS[4],
          severity: 'critical',
          isComplete: data.inspectionBookingAvailable || false,
          isRequired: data.inspectionReportAvailable ? false : true,
        },
      ];

    case 'bid_security':
      return [
        {
          id: 'bid-security-amount',
          label: 'Bid Security Amount Configured',
          description: 'Required deposit amount has been set',
          section: READINESS_SECTIONS[5],
          severity: 'critical',
          isComplete: data.bidSecurityAmountConfigured || !!(session.bidSecurityAmount && session.bidSecurityAmount > 0),
          isRequired: true,
        },
        {
          id: 'payment-recipient',
          label: 'Payment Recipient Confirmed',
          description: 'Organizer has been confirmed as payment recipient',
          section: READINESS_SECTIONS[5],
          severity: 'critical',
          isComplete: data.paymentRecipientConfirmed || !!session.organizer?.name,
          isRequired: true,
        },
        {
          id: 'bank-details',
          label: 'Bank / Paybill Details Verified',
          description: 'Payment receiving account has been verified',
          section: READINESS_SECTIONS[5],
          severity: 'critical',
          isComplete: data.bankDetailsVerified || !!session.organizer?.paymentDetails,
          isRequired: true,
        },
        {
          id: 'refund-policy',
          label: 'Refund Policy Published',
          description: 'Bid security refund policy has been clearly stated',
          section: READINESS_SECTIONS[5],
          severity: 'critical',
          isComplete: data.refundPolicyPublished || !!session.organizer?.refundPolicy,
          isRequired: true,
        },
        {
          id: 'payment-verification',
          label: 'Payment Verification Method Configured',
          description: 'Method for verifying bid security payments has been set',
          section: READINESS_SECTIONS[5],
          severity: 'critical',
          isComplete: data.paymentVerificationMethodConfigured || false,
          isRequired: true,
        },
      ];

    case 'auction_settings':
      return [
        {
          id: 'auction-date',
          label: 'Auction Date',
          description: 'Auction date has been scheduled',
          section: READINESS_SECTIONS[6],
          severity: 'critical',
          isComplete: data.auctionDateSet || !!(session.startsAt),
          isRequired: true,
        },
        {
          id: 'start-time',
          label: 'Start Time',
          description: 'Auction start time has been set',
          section: READINESS_SECTIONS[6],
          severity: 'critical',
          isComplete: data.startTimeSet || !!(session.startsAt),
          isRequired: true,
        },
        {
          id: 'end-time',
          label: 'End Time',
          description: 'Auction end time has been set',
          section: READINESS_SECTIONS[6],
          severity: 'critical',
          isComplete: data.endTimeSet || !!(session.endsAt),
          isRequired: true,
        },
        {
          id: 'auction-rules',
          label: 'Auction Rules',
          description: 'Specific auction rules have been defined',
          section: READINESS_SECTIONS[6],
          severity: 'warning',
          isComplete: data.auctionRulesAccepted || (session.termsAndConditions?.length ?? 0) > 0,
          isRequired: false,
        },
        {
          id: 'terms-accepted',
          label: 'Terms & Conditions Accepted',
          description: 'KAYAD auction terms have been accepted',
          section: READINESS_SECTIONS[6],
          severity: 'critical',
          isComplete: data.termsAccepted || false,
          isRequired: true,
        },
      ];

    case 'fulfilment':
      return [
        {
          id: 'winning-payment',
          label: 'Winning Payment Instructions Published',
          description: 'Final payment instructions have been published',
          section: READINESS_SECTIONS[7],
          severity: 'critical',
          isComplete: data.winningPaymentInstructionsPublished || !!session.organizer?.paymentDetails,
          isRequired: true,
        },
        {
          id: 'collection-location',
          label: 'Collection Location Confirmed',
          description: 'Vehicle collection point has been confirmed',
          section: READINESS_SECTIONS[7],
          severity: 'critical',
          isComplete: data.collectionLocationConfirmed || !!(session.viewingLocation || vehicle.location),
          isRequired: true,
        },
        {
          id: 'ownership-transfer',
          label: 'Ownership Transfer Process Defined',
          description: 'Transfer process has been documented',
          section: READINESS_SECTIONS[7],
          severity: 'critical',
          isComplete: data.ownershipTransferDefined || false,
          isRequired: true,
        },
        {
          id: 'buyer-documents',
          label: 'Required Buyer Documents Listed',
          description: 'Documents required from winning bidder have been listed',
          section: READINESS_SECTIONS[7],
          severity: 'warning',
          isComplete: data.buyerDocumentsListed || false,
          isRequired: false,
        },
      ];

    default:
      return [];
  }
}

// ============================================================
// Quality Assurance
// ============================================================

export interface QAValidationResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

export function runQAValidation(
  session: Partial<AuctionSession>,
  vehicle: Partial<Vehicle>,
  data: AuctionReadinessData
): QAValidationResult {
  const checks = [
    {
      name: 'Organizer Verified',
      passed: data.organizerVerified || session.organizer?.isVerified,
      message: 'Organization must be verified before publishing',
    },
    {
      name: 'Vehicle Complete',
      passed: !!(vehicle.make && vehicle.model && vehicle.year && vehicle.price),
      message: 'Vehicle information must be complete',
    },
    {
      name: 'Media Uploaded',
      passed: data.minPhotosUploaded,
      message: 'Minimum 6 photos required',
    },
    {
      name: 'Auction Dates Valid',
      passed: !!(session.startsAt && session.endsAt && new Date(session.startsAt) < new Date(session.endsAt)),
      message: 'Auction dates must be valid',
    },
    {
      name: 'Payment Details Present',
      passed: !!session.organizer?.paymentDetails,
      message: 'Payment details must be configured',
    },
    {
      name: 'Inspection Status Defined',
      passed: data.inspectionReportAvailable || data.inspectionBookingAvailable,
      message: 'Either inspection report or booking must be available',
    },
    {
      name: 'Viewing Schedule Published',
      passed: !!(session.viewingDates && session.viewingLocation),
      message: 'Viewing arrangements must be published',
    },
    {
      name: 'Auction Rules Accepted',
      passed: data.auctionRulesAccepted && data.termsAccepted,
      message: 'Auction rules and terms must be accepted',
    },
  ];

  return {
    passed: checks.every(c => c.passed),
    checks,
  };
}

export default {
  READINESS_SECTIONS,
  getDefaultReadinessData,
  validateAuctionReadiness,
  runQAValidation,
};
