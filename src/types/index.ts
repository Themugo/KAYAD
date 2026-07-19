// src/types/index.ts
// KAYAD TypeScript type definitions

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'dealer' | 'broker' | 'admin' | 'owner';
  avatar?: string;
  verified?: boolean;
  dealerId?: string;
}

export interface Car {
  _id: string;
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage?: string;
  mileageValue?: number;
  fuel: string;
  transmission: string;
  bodyType?: string;
  type?: 'SUV' | 'Pickup' | 'Sedan' | 'Wagon' | 'Hatchback';
  color?: string;
  city: string;
  location?: string;
  description?: string;
  images: string[];
  image?: string;
  badges?: ('escrow' | 'auction' | 'featured' | 'verified')[];
  status?: 'active' | 'sold' | 'pending' | 'draft';
  auction?: {
    startingPrice: number;
    currentBid?: number;
    endTime?: string;
    isActive?: boolean;
  };
  escrow?: {
    isInEscrow: boolean;
    status?: 'pending' | 'funded' | 'released' | 'refunded';
  };
  dealer?: {
    id: string;
    name: string;
    verified: boolean;
  };
  inspection?: {
    hasReport: boolean;
    score?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Escrow {
  _id: string;
  id: string;
  amount: number;
  status: 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';
  car: Car;
  buyer: User;
  seller: User;
  payment?: {
    mpesaReceipt?: string;
    checkoutRequestId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  _id: string;
  id: string;
  amount: number;
  car: Car;
  bidder: User;
  isWinning?: boolean;
  createdAt: string;
}

export interface Payment {
  _id: string;
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'mpesa' | 'card' | 'bank';
  mpesaReceipt?: string;
  car?: Car;
  user?: User;
  createdAt: string;
}

export interface Auction {
  _id: string;
  car: Car;
  startingPrice: number;
  currentBid: number;
  bidCount: number;
  endTime: string;
  isActive: boolean;
  winner?: User;
}

export interface SupportTicket {
  _id: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  user: User;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'user' | 'dealer' | 'broker';
}

export interface AuthResponse {
  user: User;
  token?: string;
}
