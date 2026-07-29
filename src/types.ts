export interface Vehicle {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  marketPriceAvg?: number;
  mileage: number;
  fuelType: 'Diesel' | 'Petrol' | 'Hybrid' | 'Electric';
  transmission: 'Automatic' | 'Manual' | 'CVT Automatic';
  driveType?: '2WD' | '4WD' | 'AWD';
  bodyStyle?: 'SUV' | 'Sedan' | 'Hatchback' | 'Pickup' | 'Wagon' | 'Van/Minibus';
  condition?: 'Foreign Used' | 'Locally Used' | 'Brand New';
  location: string;
  county: string;
  color?: string;
  engineSize?: string;
  sellerType: 'Verified Dealer' | 'Private Seller';
  sellerName: string;
  sellerRating: number;
  verified: boolean;
  inspectionPassed: boolean;
  escrowEligible: boolean;
  financeAvailable: boolean;
  isAuction?: boolean;
  auctionEndsAt?: string;
  currentBid?: number;
  image: string;
  additionalImages?: string[];
  description?: string;
  features?: string[];
  listingFreshness: string;
  responseTime?: string;
}

export interface SavedSearch {
  id: string;
  title: string;
  filters: Record<string, any>;
  notifyOnPriceDrop: boolean;
  notifyOnNewListing: boolean;
  createdAt: string;
}

export interface Dealer {
  id: string;
  name: string;
  type?: 'Enterprise Dealer' | 'Private Seller';
  location: string;
  county: string;
  verifiedSince: string;
  rating: number;
  reviewsCount: number;
  activeListingsCount: number;
  completedEscrowDeals?: number;
  logo: string;
  badges: string[];
  phone: string;
  email: string;
  responseTime?: string;
  description?: string;
  address?: string;
}

export interface EscrowTransaction {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  amount: number;
  buyerName: string;
  sellerName: string;
  status: 'Deposit Deposited' | 'Inspection Scheduled' | 'Inspection Approved' | 'Title Transfer' | 'Completed';
  step: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'seller';
  text: string;
  timestamp: string;
  vehicleTitle?: string;
}
