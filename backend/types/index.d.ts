// backend/types/index.d.ts
import { Document, Types } from "mongoose";

// ─── User Types ────────────────────────────────────────────────
export interface IUser extends Document {
  isDemo: boolean;
  deactivatedAt: Date | null;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  dealerDocuments: {
    businessLicenseUrl: string;
    showroomPhotoUrl: string;
    kraPinUrl: string;
  };
  isBanned: boolean;
  verifiedBuyer: boolean;
  bankPreApproval: {
    documentUrl: string;
    bankName: string;
    approvedAmount: number;
    expiresAt: Date;
    verifiedAt: Date;
    verifiedBy: Types.ObjectId;
  };
  phone: string;
  avatar: string;
  businessName: string;
  location: string;
  bio: string;
  mpesaBusiness: string;
  mpesaBusinessName: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  approved: boolean;
  dealerRating: number;
  paymentDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    paybillNumber: string;
    mpesaPhone: string;
  };
  onboardingComplete: boolean;
  subscriptionStatus: "active" | "past_due" | "none";
  trialStartedAt: Date | null;
  trialListingsUsed: number;
  firstVehicleUsed: boolean;
  dealerPackage: string;
  packageExpiresAt: Date | null;
  packageListingMax: number;
  packageFeatures: string[];
  packageAutoRenew: boolean;
  commission: number;
  waiver: number;
  discount: number;
  totalSales: number;
  listingCount: number;
  commissionBalance: number;
  listingsLocked: boolean;
  visibility: {
    showPhone: boolean;
    showEmail: boolean;
    showLocation: boolean;
    chatEnabled: boolean;
    autoApproveReviews: boolean;
  };
  preferences: {
    brands: string[];
    priceRange: { min: number; max: number };
    bodyType: string[];
  };
  referralCode: string;
  referredBy: Types.ObjectId;
  credits: number;
  referralEarnings: number;
  referralCount: number;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  isInspector: boolean;
  inspectionSpecialty: string[];
  locationCity: string;
  averageRating: number;
  completedChecks: number;
  lastLogin: Date;
  lastActive: Date | null;
  loginAttempts: number;
  lockUntil: Date | null;
  resetToken: string;
  resetTokenExpire: Date;
  emailVerified: boolean;
  emailVerifyToken: string;
  emailVerifyExpire: Date;
  tokenVersion: number;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  toJSON(): Record<string, unknown>;
}

export type UserRole =
  | "user"
  | "dealer"
  | "broker"
  | "admin"
  | "superadmin"
  | "escrow_officer"
  | "ad_manager"
  | "moderator"
  | "ghost_checker"
  | "individual_seller"
  | "marketing"
  | "technical_support"
  | "hr"
  | "accounts";

export const STAFF_ROLES: readonly string[];
export const SELLER_ROLES: readonly string[];

// ─── Request Extensions ────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        effectiveRole: string;
        name: string;
        email: string;
      };
    }
  }
}

// ─── JWT Payload ───────────────────────────────────────────────
export interface JWTPayload {
  id: string;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface RefreshJWTPayload {
  id: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// ─── API Response Types ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  user?: Record<string, unknown>;
  token?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  statusCode?: number;
}

// ─── Car Types ─────────────────────────────────────────────────
export interface ICar extends Document {
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  color: string;
  engineCapacity: string;
  description: string;
  images: string[];
  dealer: Types.ObjectId;
  location: string;
  status: "available" | "sold" | "reserved" | "pending_auction" | "auction_live" | "auction_ended";
  auctionStatus: "none" | "scheduled" | "live" | "ended";
  auctionEnd: Date | null;
  startingBid: number;
  reservePrice: number;
  currentBid: number;
  bidCount: number;
  views: number;
  clicks: number;
  featured: boolean;
  verified: boolean;
  inspectionReport: Types.ObjectId | null;
  ntsaStatus: "pending" | "verified" | "rejected" | "not_submitted";
  createdAt: Date;
  updatedAt: Date;
}

// ─── Bid Types ─────────────────────────────────────────────────
export interface IBid extends Document {
  car: Types.ObjectId;
  user: Types.ObjectId;
  amount: number;
  status: "active" | "outbid" | "winner" | "lost";
  createdAt: Date;
}

// ─── Escrow Types ──────────────────────────────────────────────
export interface IEscrow extends Document {
  car: Types.ObjectId;
  buyer: Types.ObjectId;
  seller: Types.ObjectId;
  amount: number;
  status: "pending" | "funded" | "released" | "refunded" | "disputed";
  releasedAt: Date | null;
  refundedAt: Date | null;
  otp: string;
  otpExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Payment Types ─────────────────────────────────────────────
export interface IPayment extends Document {
  user: Types.ObjectId;
  amount: number;
  method: "mpesa" | "bank" | "escrow";
  status: "pending" | "completed" | "failed" | "refunded";
  checkoutRequestID: string;
  mpesaReceiptNumber: string;
  escrowId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Socket Types ──────────────────────────────────────────────
export interface SocketUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
}

// ─── Service Types ─────────────────────────────────────────────
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmsOptions {
  to: string;
  message: string;
  senderId?: string;
}

export interface NotificationOptions {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: string;
  email?: string;
  data?: Record<string, unknown>;
}
