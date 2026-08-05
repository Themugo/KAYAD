import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Filter, Grid, List, SlidersHorizontal, X, ChevronDown, ChevronUp,
  ChevronRight, MapPin, Heart, Share2, GitCompare, Eye, Clock, CheckCircle2,
  Shield, ShieldCheck, Star, TrendingUp, TrendingDown, Car, Truck, Maximize2,
  Zap, CreditCard, Calendar, Gauge, Settings2, Fuel, Building2, Phone, Mail,
  ArrowRight, Loader2, Sparkles, SortAsc, BookmarkPlus, AlertCircle, Gavel,
  Award, FileCheck, Percent, RefreshCw, MessageCircle, Video, Camera, ZoomIn,
  Calculator, CalendarCheck, User, Clock3, MapPinned, FileText, Wrench,
  Check, Info, ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  AlertTriangle, ThumbsUp, ThumbsDown, Bot, Send, Loader, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ============================================================
// TYPES
// ============================================================

interface Vehicle {
  _id: string;
  title: string;
  make: string;
  price: number;
  originalPrice?: number;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  bodyType: string;
  driveType?: string;
  color?: string;
  location: string;
  images: string[];
  dealer: {
    name: string;
    logo?: string;
    rating?: number;
    verified: boolean;
    responseTime?: string;
    yearsOnPlatform?: number;
    vehiclesSold?: number;
  };
  inspectionStatus?: 'completed' | 'pending' | 'none';
  inspectionScore?: number;
  inspectionReport?: {
    engine: number;
    transmission: number;
    suspension: number;
    electrical: number;
    interior: number;
    exterior: number;
    tyres: number;
    brakes: number;
    cooling: number;
    battery: number;
  };
  financeAvailable?: boolean;
  financeEstimate?: {
    monthly: number;
    downPayment: number;
    tenure: number;
    interestRate: number;
  };
  featured?: boolean;
  isNew?: boolean;
  isAuction?: boolean;
  auctionStatus?: 'live' | 'upcoming' | 'ended';
  currentBid?: number;
  badge?: 'new' | 'reduced' | 'featured' | 'hot';
  marketPrice?: number;
  priceHistory?: { date: string; price: number }[];
  insuranceEstimate?: number;
  ownershipCost?: { fuel: number; maintenance: number; insurance: number; depreciation: number };
  trustScore?: number;
  fraudRiskScore?: number;
  serviceHistory?: boolean;
  logbookVerified?: boolean;
  ntsaVerified?: boolean;
  recallStatus?: 'clear' | 'pending';
  warranty?: { provider: string; months: number; coverage: string };
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_VEHICLE: Vehicle = {
  _id: '1',
  title: 'Toyota Land Cruiser 300 GX-R',
  make: 'Toyota',
  price: 3200000,
  originalPrice: 3450000,
  year: 2023,
  mileage: 15000,
  fuel: 'Diesel',
  transmission: 'Automatic',
  bodyType: 'SUV',
  driveType: '4WD',
  color: 'Pearl White',
  location: 'Nairobi',
  images: [
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200',
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1200',
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200',
    'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200',
    'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1200',
  ],
  dealer: {
    name: 'Nairobi Auto Hub',
    logo: 'https://via.placeholder.com/100x100/17244B/FFFFFF?text=NAH',
    rating: 4.8,
    verified: true,
    responseTime: '< 1 hour',
    yearsOnPlatform: 5,
    vehiclesSold: 234,
  },
  inspectionStatus: 'completed',
  inspectionScore: 94,
  inspectionReport: {
    engine: 96,
    transmission: 94,
    suspension: 92,
    electrical: 98,
    interior: 90,
    exterior: 88,
    tyres: 85,
    brakes: 93,
    cooling: 95,
    battery: 97,
  },
  financeAvailable: true,
  financeEstimate: {
    monthly: 68500,
    downPayment: 640000,
    tenure: 60,
    interestRate: 14,
  },
  featured: true,
  marketPrice: 3150000,
  priceHistory: [
    { date: '2024-01-15', price: 3450000 },
    { date: '2024-02-01', price: 3350000 },
    { date: '2024-02-15', price: 3200000 },
  ],
  insuranceEstimate: 145000,
  ownershipCost: {
    fuel: 180000,
    maintenance: 85000,
    insurance: 145000,
    depreciation: 450000,
  },
  trustScore: 94,
  fraudRiskScore: 2,
  serviceHistory: true,
  logbookVerified: true,
  ntsaVerified: true,
  recallStatus: 'clear',
  warranty: { provider: 'Toyota East Africa', months: 12, coverage: 'Full' },
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

const formatPrice = (price: number) => {
  if (price >= 1000000) {
    return `Ksh ${(price / 1000000).toFixed(1)}M`;
  }
  return `Ksh ${price.toLocaleString()}`;
};

const formatFullPrice = (price: number) => {
  return `Ksh ${price.toLocaleString()}`;
};

const getScoreColor = (score: number) => {
  if (score >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Excellent' };
  if (score >= 75) return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Good' };
  if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Fair' };
  return { bg: 'bg-red-100', text: 'text-red-700', label: 'Needs Attention' };
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Image Gallery Component */
const ImageGallery: React.FC<{ images: string[]; title: string }> = ({ images, title }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-[16/10] bg-slate-100 rounded-2xl overflow-hidden">
        <img
          src={images[activeIndex]}
          alt={title}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Arrows */}
        <button
          onClick={() => setActiveIndex((prev) => (prev - 1 + images.length) % images.length)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <button
          onClick={() => setActiveIndex((prev) => (prev + 1) % images.length)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={() => setShowFullscreen(true)}
          className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>

        {/* Image Counter */}
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 text-white text-sm rounded-full">
          {activeIndex + 1} / {images.length}
        </div>

        {/* Badge */}
        <div className="absolute bottom-4 right-4 flex gap-2">
          <span className="px-3 py-1.5 bg-[#17244B] text-white text-sm rounded-full font-medium">
            Inspected
          </span>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              index === activeIndex ? 'border-[#17244B] shadow-md' : 'border-transparent opacity-70 hover:opacity-100'
            }`}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center"
          >
            <X className="w-6 h-6" />
          </button>
          <img src={images[activeIndex]} alt={title} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

/** Price Intelligence Widget */
const PriceIntelligence: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const priceDiff = vehicle.price - (vehicle.marketPrice || vehicle.price);
  const isAboveMarket = priceDiff > 0;
  const priceChange = vehicle.originalPrice ? vehicle.originalPrice - vehicle.price : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Price Intelligence</h3>
        
        {/* Listed Price */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 mb-1">Listed Price</p>
          <p className="text-3xl font-bold text-slate-800">{formatPrice(vehicle.price)}</p>
          {vehicle.originalPrice && (
            <p className="text-sm text-slate-400 line-through mt-1">
              Was {formatPrice(vehicle.originalPrice)}
            </p>
          )}
        </div>

        {/* Price Change */}
        {priceChange > 0 && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg mb-4">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Price reduced by {formatPrice(priceChange)}
              </p>
              <p className="text-xs text-emerald-600">Best time to buy!</p>
            </div>
          </div>
        )}

        {/* Market Comparison */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
          <div>
            <p className="text-xs text-slate-500 mb-1">Market Value</p>
            <p className="font-bold text-slate-800">{formatPrice(vehicle.marketPrice || vehicle.price)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">vs Market</p>
            <div className={`flex items-center gap-1 ${isAboveMarket ? 'text-red-600' : 'text-emerald-600'}`}>
              {isAboveMarket ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="font-bold">{formatPrice(Math.abs(priceDiff))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Confidence */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Price Confidence</span>
          <span className="text-sm font-semibold text-emerald-600">High</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">Based on 156 similar listings</p>
      </div>
    </div>
  );
};

/** Trust Center Component */
const TrustCenter: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const trustItems = [
    { 
      icon: ShieldCheck, 
      label: 'Verified Dealer', 
      status: vehicle.dealer.verified,
      description: 'Identity and business verified'
    },
    { 
      icon: FileCheck, 
      label: 'NTSA Verified', 
      status: vehicle.ntsaVerified,
      description: 'Registration confirmed'
    },
    { 
      icon: CheckCircle2, 
      label: 'Logbook OK', 
      status: vehicle.logbookVerified,
      description: 'No encumbrances'
    },
    { 
      icon: CalendarCheck, 
      label: 'Inspected', 
      status: vehicle.inspectionStatus === 'completed',
      description: `${vehicle.inspectionScore}% score`
    },
    { 
      icon: Wrench, 
      label: 'Service History', 
      status: vehicle.serviceHistory,
      description: 'Complete records'
    },
    { 
      icon: AlertCircle, 
      label: 'Recall Status', 
      status: vehicle.recallStatus === 'clear',
      description: 'No open recalls'
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Trust Center</h3>
      </div>
      <div className="p-5 space-y-4">
        {trustItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              item.status ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              <item.icon className={`w-4 h-4 ${item.status ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{item.label}</span>
                {item.status ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
          </div>
        ))}

        {/* Trust Score */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-800">Trust Score</span>
            <span className="text-lg font-bold text-emerald-600">{vehicle.trustScore}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className="bg-emerald-500 h-3 rounded-full" 
              style={{ width: `${vehicle.trustScore}%` }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/** Vehicle Health Report */
const VehicleHealthReport: React.FC<{ report: Vehicle['inspectionReport']; score: number }> = ({ report, score }) => {
  if (!report) return null;

  const components = [
    { key: 'engine', label: 'Engine' },
    { key: 'transmission', label: 'Transmission' },
    { key: 'suspension', label: 'Suspension' },
    { key: 'electrical', label: 'Electrical' },
    { key: 'interior', label: 'Interior' },
    { key: 'exterior', label: 'Exterior' },
    { key: 'tyres', label: 'Tyres' },
    { key: 'brakes', label: 'Brakes' },
    { key: 'cooling', label: 'Cooling' },
    { key: 'battery', label: 'Battery' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Vehicle Health Report</h3>
          <Link to="#" className="text-sm text-[#17244B] font-medium hover:underline flex items-center gap-1">
            View Full Report <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-sm text-slate-500 mt-1">150-point inspection by certified engineers</p>
      </div>
      <div className="p-5">
        {/* Overall Score */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
          <div className="relative w-20 h-20">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="#10B981"
                strokeWidth="6"
                strokeDasharray={`${(score / 100) * 226} 226`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-slate-800">{score}%</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-slate-800">Overall: {getScoreColor(score).label}</p>
            <p className="text-sm text-slate-500">Inspected by Ghost Checkers</p>
          </div>
        </div>

        {/* Component Scores */}
        <div className="space-y-3">
          {components.map((comp) => {
            const value = report[comp.key as keyof typeof report] as number;
            const colors = getScoreColor(value);
            return (
              <div key={comp.key} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-600">{comp.label}</span>
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className={`${colors.bg.replace('bg-', 'bg-')} h-2 rounded-full`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className={`w-12 text-right text-sm font-medium ${colors.text}`}>
                  {value}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Finance Calculator Widget */
const FinanceCalculator: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const [downPayment, setDownPayment] = useState(20);
  const [tenure, setTenure] = useState(60);

  const estimate = useMemo(() => {
    const principal = vehicle.price * (1 - downPayment / 100);
    const rate = 0.14 / 12;
    const n = tenure;
    const monthly = Math.round(principal * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1));
    return {
      monthly,
      total: monthly * n,
      interest: monthly * n - principal,
    };
  }, [vehicle.price, downPayment, tenure]);

  if (!vehicle.financeAvailable) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Finance Calculator</h3>
      </div>
      <div className="p-5 space-y-5">
        {/* Down Payment */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">Down Payment</label>
            <span className="text-sm font-semibold text-slate-800">{downPayment}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            className="w-full accent-[#17244B]"
          />
        </div>

        {/* Tenure */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-600">Loan Tenure</label>
            <span className="text-sm font-semibold text-slate-800">{tenure} months</span>
          </div>
          <input
            type="range"
            min="12"
            max="84"
            step="12"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full accent-[#17244B]"
          />
        </div>

        {/* Results */}
        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Monthly Payment</span>
            <span className="text-xl font-bold text-[#17244B]">{formatPrice(estimate.monthly)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Interest</span>
            <span className="text-sm font-medium text-slate-600">{formatPrice(estimate.interest)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Total Amount</span>
            <span className="text-sm font-medium text-slate-600">{formatPrice(estimate.total)}</span>
          </div>
        </div>

        <button className="w-full py-3 bg-[#17244B] text-white font-semibold rounded-xl hover:bg-[#1e3054] transition-colors">
          Apply for Finance
        </button>
      </div>
    </div>
  );
};

/** Dealer Profile Widget */
const DealerProfile: React.FC<{ dealer: Vehicle['dealer'] }> = ({ dealer }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">About the Seller</h3>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center">
            {dealer.logo ? (
              <img src={dealer.logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{dealer.name}</span>
              {dealer.verified && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                  Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-semibold text-slate-700">{dealer.rating}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xl font-bold text-slate-800">{dealer.vehiclesSold}</p>
            <p className="text-xs text-slate-500">Vehicles Sold</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-center">
            <p className="text-xl font-bold text-slate-800">{dealer.yearsOnPlatform}+</p>
            <p className="text-xs text-slate-500">Years Active</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock3 className="w-4 h-4" />
            <span>Responds {dealer.responseTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPinned className="w-4 h-4" />
            <span>{dealer.name} Showroom</span>
          </div>
        </div>

        <button className="w-full py-3 bg-[#17244B] text-white font-semibold rounded-xl hover:bg-[#1e3054] transition-colors mb-2">
          Contact Dealer
        </button>
        <button className="w-full py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
          View All Listings
        </button>
      </div>
    </div>
  );
};

/** AI Assistant Widget */
const AIAssistant: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    { label: 'Summarize this vehicle', icon: FileText },
    { label: 'Compare to Toyota RAV4', icon: GitCompare },
    { label: 'Estimate maintenance cost', icon: Wrench },
    { label: 'Show ownership costs', icon: Calculator },
  ];

  const handleAsk = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setQuestion('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#17244B] to-[#2a3a6e] rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">AI Assistant</h3>
          <p className="text-xs text-slate-500">Ask anything about this vehicle</p>
        </div>
      </div>
      <div className="p-5">
        {/* Quick Questions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickQuestions.map((q, i) => (
            <button
              key={i}
              onClick={() => handleAsk(q.label)}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              <q.icon className="w-3 h-3" />
              {q.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#17244B]"
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading}
            className="w-12 h-12 bg-[#17244B] text-white rounded-xl flex items-center justify-center hover:bg-[#1e3054] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Sticky Action Bar */
const StickyActionBar: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  const [saved, setSaved] = useState(false);
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40 lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm text-slate-500">Price</p>
          <p className="text-xl font-bold text-slate-800">{formatPrice(vehicle.price)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSaved(!saved)}
            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-colors ${
              saved ? 'bg-red-50 border-red-200 text-red-500' : 'border-slate-200 text-slate-500'
            }`}
          >
            <Heart className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="w-12 h-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button className="h-12 px-6 bg-[#17244B] text-white font-semibold rounded-xl flex items-center justify-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Book Inspection
          </button>
        </div>
      </div>
    </div>
  );
};

/** Desktop Sidebar */
const DesktopSidebar: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  return (
    <div className="hidden lg:block w-80 space-y-6">
      <PriceIntelligence vehicle={vehicle} />
      <TrustCenter vehicle={vehicle} />
      <FinanceCalculator vehicle={vehicle} />
      <DealerProfile dealer={vehicle.dealer} />
      <AIAssistant vehicle={vehicle} />
    </div>
  );
};

/** Ownership Cost Widget */
const OwnershipCost: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  if (!vehicle.ownershipCost) return null;

  const total = Object.values(vehicle.ownershipCost).reduce((sum, val) => sum + val, 0);

  const items = [
    { label: 'Fuel', value: vehicle.ownershipCost.fuel, color: 'bg-blue-500' },
    { label: 'Insurance', value: vehicle.ownershipCost.insurance, color: 'bg-emerald-500' },
    { label: 'Maintenance', value: vehicle.ownershipCost.maintenance, color: 'bg-amber-500' },
    { label: 'Depreciation', value: vehicle.ownershipCost.depreciation, color: 'bg-slate-400' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Annual Ownership Cost</h3>
        <p className="text-sm text-slate-500">Estimated costs per year</p>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-2xl font-bold text-slate-800">{formatPrice(total)}</div>
          <span className="text-sm text-slate-500">/ year</span>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600">{item.label}</span>
                <span className="text-sm font-medium text-slate-800">{formatPrice(item.value)}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className={`${item.color} h-2 rounded-full`}
                  style={{ width: `${(item.value / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Market Insights Widget */
const MarketInsights: React.FC = () => {
  const insights = [
    { label: 'Similar Listed', value: 23 },
    { label: 'Avg. Days to Sell', value: 18 },
    { label: 'Avg. Price', value: '3.1M' },
    { label: 'Demand Level', value: 'High' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">Market Insights</h3>
        <p className="text-sm text-slate-500">Based on recent transactions</p>
      </div>
      <div className="p-5 grid grid-cols-2 gap-4">
        {insights.map((insight) => (
          <div key={insight.label} className="p-3 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500 mb-1">{insight.label}</p>
            <p className="text-lg font-bold text-slate-800">{insight.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const PremiumVehicleDetails: React.FC = () => {
  const vehicle = MOCK_VEHICLE;
  const [activeTab, setActiveTab] = useState('specs');

  const tabs = [
    { id: 'specs', label: 'Specifications' },
    { id: 'features', label: 'Features' },
    { id: 'inspection', label: 'Inspection' },
    { id: 'ownership', label: 'Ownership Costs' },
  ];

  const specs = [
    ['Make', vehicle.make || 'Toyota'],
    ['Model', vehicle.bodyType],
    ['Year', vehicle.year.toString()],
    ['Fuel Type', vehicle.fuel],
    ['Transmission', vehicle.transmission],
    ['Body Type', vehicle.bodyType],
    ['Mileage', `${vehicle.mileage.toLocaleString()} km`],
    ['Color', vehicle.color || 'White'],
    ['Drive Type', vehicle.driveType || '4WD'],
    ['Condition', 'Used'],
  ];

  return (
    <div className="min-h-screen bg-[#F6F1E8] pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/" className="hover:text-[#17244B]">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/browse" className="hover:text-[#17244B]">Browse</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-800 font-medium truncate">{vehicle.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {vehicle.dealer.verified && (
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Verified Dealer
                  </span>
                )}
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                  Inspected
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
                {vehicle.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{vehicle.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{vehicle.year}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Gauge className="w-4 h-4" />
                  <span>{vehicle.mileage.toLocaleString()} km</span>
                </div>
              </div>
            </div>

            {/* Image Gallery */}
            <ImageGallery images={vehicle.images} title={vehicle.title} />

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-2xl font-bold text-slate-800">{vehicle.inspectionScore}%</p>
                <p className="text-xs text-slate-500">Inspection Score</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-2xl font-bold text-slate-800">{vehicle.trustScore}%</p>
                <p className="text-xs text-slate-500">Trust Score</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-2xl font-bold text-slate-800">{vehicle.dealer.rating}</p>
                <p className="text-xs text-slate-500">Dealer Rating</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {vehicle.ownershipCost?.fuel ? `${(vehicle.ownershipCost.fuel / 12000).toFixed(1)}L` : '8.5L'}
                </p>
                <p className="text-xs text-slate-500">/100km Fuel</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-4 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-[#17244B] border-b-2 border-[#17244B]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === 'specs' && (
                  <div className="grid grid-cols-2 gap-4">
                    {specs.map(([label, value]) => (
                      <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-medium text-slate-800">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'features' && (
                  <div className="grid grid-cols-2 gap-3">
                    {['Air Conditioning', 'Power Steering', 'Electric Windows', 'ABS', 'Airbags', 'Sunroof', 'Leather Seats', 'Navigation'].map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'inspection' && (
                  <VehicleHealthReport report={vehicle.inspectionReport} score={vehicle.inspectionScore || 0} />
                )}
                {activeTab === 'ownership' && (
                  <OwnershipCost vehicle={vehicle} />
                )}
              </div>
            </div>

            {/* Market Insights */}
            <MarketInsights />
          </div>

          {/* Desktop Sidebar */}
          <DesktopSidebar vehicle={vehicle} />
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <StickyActionBar vehicle={vehicle} />
    </div>
  );
};

export default PremiumVehicleDetails;
