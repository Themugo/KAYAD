import React, { useState, useMemo } from 'react';
import {
  Gavel,
  Clock,
  Shield,
  ShieldCheck,
  Building2,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  Eye,
  Users,
  MapPin,
  Car,
  Zap,
  TrendingUp,
  Calendar,
  Award,
  Phone,
  ArrowRight,
  Play,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AuctionCard } from './AuctionCard';
import { AuctionDisclaimer } from '../auction/AuctionDisclaimer';
import type { FC } from 'react';

// ============================================================
// Types
// ============================================================

interface AuctionLot {
  id: string;
  title: string;
  year: number;
  currentBid: number;
  startingBid: number;
  bidsCount: number;
  endsInSeconds: number;
  startsInSeconds?: number;
  status: 'live' | 'upcoming' | 'ended' | 'suspended';
  reserveStatus?: 'met' | 'near' | 'no_reserve' | 'not_met';
  location: string;
  inspectionScore?: number;
  imageUrl: string;
  organizerName: string;
  organizerType: string;
  organizerVerified: boolean;
  organizerRating: number;
  organizerAuctions: number;
}

// ============================================================
// Mock Data
// ============================================================

const MOCK_AUCTIONS: AuctionLot[] = [
  {
    id: 'lot_1',
    title: 'TOYOTA Land Cruiser 300 GX-R',
    year: 2022,
    currentBid: 16835000,
    startingBid: 14800000,
    bidsCount: 7,
    endsInSeconds: 3570,
    status: 'live',
    reserveStatus: 'met',
    location: 'Nairobi Vault',
    inspectionScore: 100,
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    organizerName: 'NCBA Bank Kenya',
    organizerType: 'Verified Dealer',
    organizerVerified: true,
    organizerRating: 4.8,
    organizerAuctions: 156,
  },
  {
    id: 'lot_2',
    title: 'PORSCHE Cayenne S',
    year: 2020,
    currentBid: 12212000,
    startingBid: 10560000,
    bidsCount: 10,
    endsInSeconds: 8370,
    status: 'live',
    reserveStatus: 'met',
    location: 'Nairobi Vault',
    inspectionScore: 99,
    imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Crown Motors Kenya',
    organizerType: 'Licensed Auctioneer',
    organizerVerified: true,
    organizerRating: 4.6,
    organizerAuctions: 89,
  },
  {
    id: 'lot_3',
    title: 'MERCEDES-BENZ GLE 450 4MATIC',
    year: 2021,
    currentBid: 12048000,
    startingBid: 10240000,
    bidsCount: 13,
    endsInSeconds: 13170,
    status: 'live',
    reserveStatus: 'near',
    location: 'Mombasa Vault',
    inspectionScore: 98,
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Kenya Government Disposal',
    organizerType: 'Government Entity',
    organizerVerified: true,
    organizerRating: 4.9,
    organizerAuctions: 234,
  },
  {
    id: 'lot_4',
    title: 'FORD Ranger Raptor',
    year: 2022,
    currentBid: 5696000,
    startingBid: 4480000,
    bidsCount: 16,
    endsInSeconds: 17970,
    status: 'live',
    reserveStatus: 'no_reserve',
    location: 'Nakuru Hub',
    inspectionScore: 100,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    organizerName: 'AutoBid Kenya',
    organizerType: 'Verified Dealer',
    organizerVerified: true,
    organizerRating: 4.5,
    organizerAuctions: 67,
  },
  {
    id: 'lot_5',
    title: 'RANGE ROVER Autobiography P530',
    year: 2023,
    currentBid: 24500000,
    startingBid: 24500000,
    bidsCount: 0,
    endsInSeconds: 86400,
    startsInSeconds: 7200,
    status: 'upcoming',
    reserveStatus: 'met',
    location: 'Nairobi Vault',
    inspectionScore: 100,
    imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80',
    organizerName: 'NCBA Bank Kenya',
    organizerType: 'Verified Dealer',
    organizerVerified: true,
    organizerRating: 4.8,
    organizerAuctions: 156,
  },
  {
    id: 'lot_6',
    title: 'BMW X7 M50i xDrive',
    year: 2021,
    currentBid: 13200000,
    startingBid: 13200000,
    bidsCount: 0,
    endsInSeconds: 100000,
    startsInSeconds: 21600,
    status: 'upcoming',
    reserveStatus: 'near',
    location: 'Nairobi Vault',
    inspectionScore: 97,
    imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    organizerName: 'Premium Auto Auctions',
    organizerType: 'Licensed Auctioneer',
    organizerVerified: true,
    organizerRating: 4.7,
    organizerAuctions: 112,
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Auctions', icon: <Gavel className="w-5 h-5" />, count: 156 },
  { id: 'sedan', label: 'Sedans', icon: <Car className="w-5 h-5" />, count: 45 },
  { id: 'suv', label: 'SUVs', icon: <Car className="w-5 h-5" />, count: 67 },
  { id: 'pickup', label: 'Pickups', icon: <Car className="w-5 h-5" />, count: 28 },
  { id: 'luxury', label: 'Luxury', icon: <Award className="w-5 h-5" />, count: 16 },
  { id: 'commercial', label: 'Commercial', icon: <Car className="w-5 h-5" />, count: 12 },
  { id: 'bank', label: 'Bank Disposals', icon: <Building2 className="w-5 h-5" />, count: 34 },
  { id: 'govt', label: 'Government', icon: <Shield className="w-5 h-5" />, count: 23 },
];

// ============================================================
// Section Components
// ============================================================

// 1. Enterprise Hero Section
const HeroSection: FC = () => (
  <section className="relative bg-gradient-to-br from-[#1E3063] via-[#2a4080] to-[#1E3063] py-16 md:py-24 overflow-hidden">
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
    </div>

    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
            <Gavel className="w-4 h-4 text-[#23EBFF]" />
            <span className="text-sm font-medium text-white">Enterprise Vehicle Auctions</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            Professional Auction Marketplace
          </h1>
          
          <p className="text-lg text-slate-300 leading-relaxed">
            KAYAD provides the technology platform for verified Auction Organizers to conduct 
            professional vehicle auctions. All auction payments go directly to the organizer—never to KAYAD.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button 
              size="lg" 
              className="bg-[#C85A32] hover:bg-[#a84a28] text-white font-bold"
              onClick={() => document.getElementById('auctions')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Gavel className="w-5 h-5 mr-2" />
              Browse Auctions
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              How It Works
            </Button>
          </div>
        </div>

        {/* Right Content - Trust Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5 bg-white/10 backdrop-blur border-white/20">
            <div className="text-3xl font-black text-white mb-1">2,500+</div>
            <div className="text-sm text-slate-300">Auctions Completed</div>
          </Card>
          <Card className="p-5 bg-white/10 backdrop-blur border-white/20">
            <div className="text-3xl font-black text-white mb-1">45+</div>
            <div className="text-sm text-slate-300">Verified Organizers</div>
          </Card>
          <Card className="p-5 bg-white/10 backdrop-blur border-white/20">
            <div className="text-3xl font-black text-white mb-1">Ksh 4.2B</div>
            <div className="text-sm text-slate-300">Total Sales Value</div>
          </Card>
          <Card className="p-5 bg-white/10 backdrop-blur border-white/20">
            <div className="text-3xl font-black text-white mb-1">94.5%</div>
            <div className="text-sm text-slate-300">Buyer Satisfaction</div>
          </Card>
        </div>
      </div>
    </div>
  </section>
);

// 2. Live Auction Status Ribbon
const StatusRibbon: FC<{ liveCount: number; endingSoonCount: number }> = ({ liveCount, endingSoonCount }) => (
  <section className="bg-[#1E3063] py-3">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-center gap-8 flex-wrap">
        <div className="flex items-center gap-2 text-white">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="font-bold">{liveCount} Live Auctions</span>
        </div>
        <div className="w-px h-6 bg-white/30" />
        <div className="flex items-center gap-2 text-white">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-bold">{endingSoonCount} Ending Soon</span>
        </div>
        <div className="w-px h-6 bg-white/30" />
        <div className="flex items-center gap-2 text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">All Organizers Verified</span>
        </div>
      </div>
    </div>
  </section>
);

// 3. Auction Categories
const CategoriesSection: FC<{ onSelectCategory: (id: string) => void; selectedCategory: string }> = ({ 
  onSelectCategory, 
  selectedCategory 
}) => (
  <section className="py-8 bg-slate-50">
    <div className="max-w-7xl mx-auto px-4">
      <h2 className="text-xl font-bold text-[#1E3063] mb-6">Browse by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              selectedCategory === cat.id
                ? 'border-[#1E3063] bg-white shadow-md'
                : 'border-transparent bg-white hover:border-slate-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              selectedCategory === cat.id ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {cat.icon}
            </div>
            <span className="text-xs font-medium text-slate-700 text-center">{cat.label}</span>
            <span className="text-[10px] text-slate-400">{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  </section>
);

// 4. Auction Grid Section
const AuctionGridSection: FC<{
  title: string;
  subtitle: string;
  auctions: AuctionLot[];
  emptyMessage?: string;
  onViewDetails: (auction: AuctionLot) => void;
}> = ({ title, subtitle, auctions, emptyMessage, onViewDetails }) => (
  <section id="auctions" className="py-12">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#1E3063]">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
      </div>

      {auctions.length === 0 ? (
        <Card className="p-12 text-center">
          <Gavel className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800">{emptyMessage || 'No auctions found'}</h3>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <AuctionCard
              key={auction.id}
              {...auction}
              onViewDetails={() => onViewDetails(auction)}
              onBid={() => console.log('Bid:', auction.id)}
              onRegister={() => console.log('Register:', auction.id)}
            />
          ))}
        </div>
      )}
    </div>
  </section>
);

// 5. How Auctions Work
const HowItWorksSection: FC = () => (
  <section className="py-16 bg-gradient-to-b from-slate-50 to-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-2xl font-bold text-[#1E3063] mb-3">Your Auction Journey</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Participating in a KAYAD auction is simple. Each auction is conducted by a verified 
          Auction Organizer who handles all payments directly.
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {[
          {
            step: 1,
            title: 'Browse Auctions',
            description: 'Explore vehicles from verified auction organizers across Kenya.',
            icon: <Search className="w-6 h-6" />,
          },
          {
            step: 2,
            title: 'Register & Verify',
            description: 'Create your KAYAD account and complete bidder verification.',
            icon: <CheckCircle2 className="w-6 h-6" />,
          },
          {
            step: 3,
            title: 'Bid & Win',
            description: 'Place your bids during the live auction. Winning bids are binding.',
            icon: <Gavel className="w-6 h-6" />,
          },
          {
            step: 4,
            title: 'Pay Organizer',
            description: 'Complete payment directly to the Auction Organizer using their verified channels.',
            icon: <CreditCard className="w-6 h-6" />,
          },
        ].map((item) => (
          <Card key={item.step} className="p-6 text-center relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#1E3063] text-white font-bold flex items-center justify-center">
              {item.step}
            </div>
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-[#1E3063]">
              {item.icon}
            </div>
            <h3 className="font-bold text-[#1E3063] mb-2">{item.title}</h3>
            <p className="text-sm text-slate-600">{item.description}</p>
          </Card>
        ))}
      </div>
    </div>
  </section>
);

// 6. Organizer Trust Section
const OrganizerTrustSection: FC = () => (
  <section className="py-16 bg-[#1E3063]">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">Verified Organizers</span>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Trusted Auction Organizers
          </h2>
          
          <p className="text-slate-300 mb-6">
            Every auction on KAYAD is conducted by a verified Auction Organizer. 
            We verify business licenses, financial standing, and track records before 
            granting access to the platform.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white">Verified Identity</p>
                <p className="text-sm text-slate-400">All organizers undergo identity verification</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white">Licensed Operations</p>
                <p className="text-sm text-slate-400">Valid business and auctioneer licenses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-white">Performance Tracked</p>
                <p className="text-sm text-slate-400">Auctions completed, ratings, and reviews</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { name: 'NCBA Bank Kenya', type: 'Verified Dealer', auctions: 156, rating: 4.8 },
            { name: 'Kenya Government Disposal', type: 'Government Entity', auctions: 234, rating: 4.9 },
            { name: 'Crown Motors Kenya', type: 'Licensed Auctioneer', auctions: 89, rating: 4.6 },
          ].map((org, i) => (
            <Card key={i} className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#1E3063] flex items-center justify-center text-white font-bold">
                  {org.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{org.name}</p>
                  <p className="text-sm text-slate-400">{org.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{org.auctions} auctions</p>
                  <p className="text-sm text-emerald-400">{org.rating} rating</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ============================================================
// Main Component
// ============================================================

export const AuctionsPageRefactored: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Filter auctions
  const filteredAuctions = useMemo(() => {
    let auctions = MOCK_AUCTIONS;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      auctions = auctions.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.location.toLowerCase().includes(query)
      );
    }

    return auctions;
  }, [searchQuery]);

  // Auction categories
  const liveAuctions = filteredAuctions.filter(a => a.status === 'live');
  const endingSoonAuctions = filteredAuctions.filter(a => a.status === 'live' && a.endsInSeconds < 7200);
  const upcomingAuctions = filteredAuctions.filter(a => a.status === 'upcoming');
  const recentAuctions = filteredAuctions.filter(a => a.status === 'ended');

  const handleViewDetails = (auction: AuctionLot) => {
    console.log('View details:', auction.id);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 1. Enterprise Hero */}
      <HeroSection />

      {/* 2. Live Status Ribbon */}
      <StatusRibbon 
        liveCount={liveAuctions.length} 
        endingSoonCount={endingSoonAuctions.length} 
      />

      {/* Search Section */}
      <section className="py-8 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicles, makes, models, or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
            />
          </div>
        </div>
      </section>

      {/* 3. Categories */}
      <CategoriesSection 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* 4. Live Auctions */}
      {liveAuctions.length > 0 && (
        <AuctionGridSection
          title="Live Auctions"
          subtitle="Bid now on vehicles from verified auction organizers"
          auctions={liveAuctions}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* 5. Ending Soon */}
      {endingSoonAuctions.length > 0 && (
        <section className="py-12 bg-amber-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1E3063]">Ending Soon</h2>
                <p className="text-sm text-slate-500">Don't miss these auctions closing within 2 hours</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {endingSoonAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  {...auction}
                  compact
                  onViewDetails={() => handleViewDetails(auction)}
                  onBid={() => console.log('Bid:', auction.id)}
                  onRegister={() => console.log('Register:', auction.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Upcoming Auctions */}
      {upcomingAuctions.length > 0 && (
        <AuctionGridSection
          title="Upcoming Auctions"
          subtitle="Preview and register for upcoming vehicle auctions"
          auctions={upcomingAuctions}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* 7. Your Auction Journey */}
      <HowItWorksSection />

      {/* 8. Organizer Trust Information */}
      <OrganizerTrustSection />

      {/* 9. Auction Disclaimer */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4">
          <AuctionDisclaimer variant="full" />
        </div>
      </section>

      {/* 10. Footer CTA */}
      <section className="py-12 bg-[#1E3063]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Bidding?</h2>
          <p className="text-slate-300 mb-6">
            Create your free KAYAD account to participate in professional vehicle auctions.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" className="bg-[#C85A32] hover:bg-[#a84a28] text-white font-bold">
              Create Account
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuctionsPageRefactored;
