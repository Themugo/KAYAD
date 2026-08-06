import React, { useState } from 'react';
import { Radio, Car, ShieldCheck, Building2, Eye, Users, ClipboardCheck, Play, BookOpen, RefreshCw, Bell, Search, Filter, Grid, FileCheck, VideoOff, Globe, CalendarClock, Newspaper, Star as StarIcon, MapPin, ChevronRight, PlayCircle, Building, Shield, Calendar, Calculator, Banknote, PiggyBank, GraduationCap as GraduationCapIcon, Sparkles } from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';

// Types
type ContentChannel = 'live' | 'dealer' | 'arrivals' | 'inspection' | 'news' | 'guides' | 'financing' | 'reviews' | 'events';

interface LiveBroadcast {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  viewers: number;
  isLive: boolean;
  duration?: string;
  category: string;
}

interface DealerShowcase {
  id: string;
  dealerName: string;
  dealerLogo: string;
  type: 'arrival' | 'tour' | 'offer' | 'interview' | 'auction';
  title: string;
  description: string;
  image: string;
  vehicles?: number;
  publishedAt: string;
}

interface NewArrival {
  id: string;
  title: string;
  price: number;
  dealer: string;
  region: string;
  image: string;
  publishedAt: string;
  specs: string;
}

interface InspectionStory {
  id: string;
  title: string;
  presenter: string;
  presenterRole: string;
  thumbnail: string;
  duration: string;
  views: number;
  category: string;
}

interface VehicleReview {
  id: string;
  title: string;
  presenter: string;
  presenterType: 'dealer' | 'manufacturer' | 'mechanic';
  thumbnail: string;
  duration: string;
  vehicle: string;
  views: number;
}

interface BuyingGuide {
  id: string;
  title: string;
  description: string;
  readTime: string;
  category: string;
  icon: React.ReactNode;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  publishedAt: string;
  category: string;
  image: string;
}

interface CommunityEvent {
  id: string;
  title: string;
  organizer: string;
  type: 'show' | 'open_day' | 'auction' | 'clinic' | 'campaign' | 'workshop' | 'training';
  date: string;
  location: string;
  attendees: number;
  image: string;
}

interface ContentPublisher {
  id: string;
  name: string;
  type: 'dealer' | 'mechanic' | 'manufacturer' | 'bank';
  logo: string;
  followers: number;
  verified: boolean;
}

// Mock Data
const MOCK_LIVE_BROADCASTS: LiveBroadcast[] = [
  {
    id: 'live-1',
    title: 'Premium SUV Auction Live',
    subtitle: 'NCBA Bank Kenya - 8 vehicles',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    viewers: 312,
    isLive: true,
    category: 'Live Auction',
  },
  {
    id: 'live-2',
    title: 'Dealer Showroom Tour',
    subtitle: 'Crown Motors - New Arrivals',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    viewers: 156,
    isLive: true,
    category: 'Showcase',
  },
  {
    id: 'live-3',
    title: '150-Point Inspection Demo',
    subtitle: 'AutoCheck Kenya',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=80',
    viewers: 89,
    isLive: true,
    category: 'Inspection',
  },
];

const MOCK_DEALER_SHOWCASES: DealerShowcase[] = [
  {
    id: 'ds-1',
    dealerName: 'Crown Motors Kenya',
    dealerLogo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&q=80',
    type: 'arrival',
    title: 'New Arrivals: Premium SUVs Just Landed',
    description: 'Check out our latest collection of luxury SUVs now available in the showroom.',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    vehicles: 5,
    publishedAt: '2 hours ago',
  },
  {
    id: 'ds-2',
    dealerName: 'NCBA Bank Kenya',
    dealerLogo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
    type: 'auction',
    title: 'Bank Repossessed Vehicles Auction',
    description: 'Premium vehicles at competitive prices. Secure your spot in our upcoming auction.',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80',
    vehicles: 12,
    publishedAt: '5 hours ago',
  },
  {
    id: 'ds-3',
    dealerName: 'Premium Auto Auctions',
    dealerLogo: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=200&q=80',
    type: 'interview',
    title: 'Meet Our Auction Experts',
    description: 'Get insights from our experienced auction team on how to win your dream car.',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80',
    publishedAt: '1 day ago',
  },
];

const MOCK_NEW_ARRIVALS: NewArrival[] = [
  {
    id: 'na-1',
    title: 'TOYOTA Land Cruiser 300 GX-R',
    price: 18500000,
    dealer: 'Crown Motors Kenya',
    region: 'Nairobi',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
    publishedAt: '30 min ago',
    specs: '2023 • 12,450 km • Petrol',
  },
  {
    id: 'na-2',
    title: 'MERCEDES-AMG GT 63 S',
    price: 16800000,
    dealer: 'NCBA Bank Kenya',
    region: 'Nairobi',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=80',
    publishedAt: '1 hour ago',
    specs: '2020 • 32,100 km • Petrol',
  },
  {
    id: 'na-3',
    title: 'BMW X7 M50i xDrive',
    price: 14500000,
    dealer: 'Premium Auto Auctions',
    region: 'Mombasa',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80',
    publishedAt: '2 hours ago',
    specs: '2022 • 18,200 km • Petrol',
  },
  {
    id: 'na-4',
    title: 'PORSCHE Cayenne S',
    price: 13200000,
    dealer: 'Crown Motors Kenya',
    region: 'Nairobi',
    image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=400&q=80',
    publishedAt: '3 hours ago',
    specs: '2021 • 28,300 km • Petrol',
  },
];

const MOCK_INSPECTION_STORIES: InspectionStory[] = [
  {
    id: 'is-1',
    title: 'How a 150-Point Inspection Works',
    presenter: 'AutoCheck Kenya',
    presenterRole: 'Certified Inspector',
    thumbnail: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=400&q=80',
    duration: '8:45',
    views: 2456,
    category: 'Education',
  },
  {
    id: 'is-2',
    title: 'Top 5 Engine Faults to Watch For',
    presenter: 'MasterTech Garage',
    presenterRole: 'Lead Mechanic',
    thumbnail: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80',
    duration: '12:30',
    views: 1893,
    category: 'Tips',
  },
  {
    id: 'is-3',
    title: 'Buying Tips: Suspension Check',
    presenter: 'AutoCheck Kenya',
    presenterRole: 'Senior Inspector',
    thumbnail: 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=400&q=80',
    duration: '6:15',
    views: 1234,
    category: 'Buying Guide',
  },
];

const MOCK_VEHICLE_REVIEWS: VehicleReview[] = [
  {
    id: 'vr-1',
    title: 'Complete Walkaround: Toyota Land Cruiser 300',
    presenter: 'Crown Motors Kenya',
    presenterType: 'dealer',
    thumbnail: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
    duration: '15:22',
    vehicle: 'Toyota Land Cruiser 300',
    views: 3421,
  },
  {
    id: 'vr-2',
    title: 'Mercedes-AMG GT: Performance Review',
    presenter: 'Auto Reviews EA',
    presenterType: 'manufacturer',
    thumbnail: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=400&q=80',
    duration: '18:45',
    vehicle: 'Mercedes-AMG GT',
    views: 2890,
  },
];

const MOCK_BUYING_GUIDES: BuyingGuide[] = [
  { id: 'bg-1', title: 'How to Buy Safely on KAYAD', description: 'Protect yourself with our comprehensive buying guide.', readTime: '5 min', category: 'Safety', icon: <Shield className="w-5 h-5" /> },
  { id: 'bg-2', title: 'Dealer vs Private Seller', description: 'Understanding the differences and what to expect.', readTime: '4 min', category: 'Comparison', icon: <Building className="w-5 h-5" /> },
  { id: 'bg-3', title: 'Escrow: How It Works', description: 'Secure payment protection for every transaction.', readTime: '3 min', category: 'Payment', icon: <ShieldCheck className="w-5 h-5" /> },
  { id: 'bg-4', title: 'Vehicle Inspection Guide', description: 'What to look for and what inspectors check.', readTime: '6 min', category: 'Inspection', icon: <ClipboardCheck className="w-5 h-5" /> },
  { id: 'bg-5', title: 'Logbook Verification Steps', description: 'Ensure vehicle documentation is authentic.', readTime: '4 min', category: 'Documentation', icon: <FileCheck className="w-5 h-5" /> },
  { id: 'bg-6', title: 'Import Vehicle Checklist', description: 'Everything you need for imported vehicles.', readTime: '7 min', category: 'Import', icon: <Globe className="w-5 h-5" /> },
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'EV Adoption Accelerates in East Africa',
    excerpt: 'Electric vehicles are gaining traction as charging infrastructure expands across Kenya.',
    source: 'Automotive East Africa',
    publishedAt: '2 hours ago',
    category: 'Market Trends',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'news-2',
    title: 'New Import Duty Regulations 2026',
    excerpt: 'Government announces changes to vehicle import taxation effective next quarter.',
    source: 'Business Daily',
    publishedAt: '5 hours ago',
    category: 'Policy',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'news-3',
    title: 'KAYAD Partners with Major Banks',
    excerpt: 'New financing partnerships make vehicle ownership more accessible.',
    source: 'KAYAD News',
    publishedAt: '1 day ago',
    category: 'Partnership',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=400&q=80',
  },
];

const MOCK_COMMUNITY_EVENTS: CommunityEvent[] = [
  {
    id: 'event-1',
    title: 'Nairobi Auto Show 2026',
    organizer: 'Automotive Association Kenya',
    type: 'show',
    date: 'Feb 15, 2026',
    location: 'KICC, Nairobi',
    attendees: 2500,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'event-2',
    title: 'Defensive Driving Clinic',
    organizer: 'Road Safety Academy',
    type: 'clinic',
    date: 'Jan 28, 2026',
    location: 'Kasarani, Nairobi',
    attendees: 150,
    image: 'https://images.unsplash.com/photo-1449965408869-euj3c98a9a0?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'event-3',
    title: 'Classic Car Meet-Up',
    organizer: 'Kenya Classic Car Club',
    type: 'show',
    date: 'Feb 1, 2026',
    location: 'Karen, Nairobi',
    attendees: 300,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80',
  },
];

// Helper Functions
const formatCurrency = (amount: number) => `Ksh ${amount.toLocaleString()}`;

// Components
const ChannelTab: React.FC<{ channel: ContentChannel; label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number }> = ({ channel, label, icon, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
      active ? 'bg-[#1E3063] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <Badge className={`text-xs ${active ? 'bg-white/20 text-white' : 'bg-[#1E3063] text-white'}`}>
        {badge}
      </Badge>
    )}
  </button>
);

const LiveCard: React.FC<{ broadcast: LiveBroadcast; large?: boolean }> = ({ broadcast, large }) => (
  <Card className={`overflow-hidden group cursor-pointer ${large ? 'relative' : ''}`}>
    <div className={`relative ${large ? 'aspect-video' : 'h-40'}`}>
      <img
        src={broadcast.image}
        alt={broadcast.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {broadcast.isLive && (
        <div className="absolute top-3 left-3 flex gap-2">
          <Badge className="bg-red-600 text-white">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LIVE
          </Badge>
          <Badge className="bg-black/70 text-white">
            <Eye className="w-3 h-3 mr-1" />
            {broadcast.viewers}
          </Badge>
        </div>
      )}
      <div className="absolute bottom-3 left-3 right-3">
        <Badge className="bg-[#C85A32] text-white mb-2">{broadcast.category}</Badge>
        <h3 className={`font-bold text-white ${large ? 'text-xl' : 'text-sm'}`}>{broadcast.title}</h3>
        <p className="text-white/80 text-xs">{broadcast.subtitle}</p>
      </div>
      {large && (
        <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
          <PlayCircle className="w-8 h-8 text-[#1E3063]" />
        </button>
      )}
    </div>
    {!large && (
      <div className="p-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{broadcast.viewers} watching</span>
          {broadcast.duration && <span>{broadcast.duration}</span>}
        </div>
      </div>
    )}
  </Card>
);

const DealerShowcaseCard: React.FC<{ showcase: DealerShowcase }> = ({ showcase }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all group">
    <div className="relative h-40">
      <img
        src={showcase.image}
        alt={showcase.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-3 left-3">
        <Badge className={`${
          showcase.type === 'arrival' ? 'bg-emerald-500' :
          showcase.type === 'tour' ? 'bg-blue-500' :
          showcase.type === 'offer' ? 'bg-amber-500' :
          showcase.type === 'interview' ? 'bg-purple-500' :
          'bg-[#C85A32]'
        } text-white`}>
          {showcase.type === 'arrival' && 'New Arrival'}
          {showcase.type === 'tour' && 'Showroom Tour'}
          {showcase.type === 'offer' && 'Special Offer'}
          {showcase.type === 'interview' && 'Interview'}
          {showcase.type === 'auction' && 'Auction'}
        </Badge>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <img src={showcase.dealerLogo} alt={showcase.dealerName} className="w-6 h-6 rounded-full object-cover" />
        <span className="text-sm text-slate-600">{showcase.dealerName}</span>
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
      </div>
      <h3 className="font-bold text-[#1E3063] mb-1">{showcase.title}</h3>
      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{showcase.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{showcase.publishedAt}</span>
        {showcase.vehicles && (
          <Badge className="bg-slate-100 text-slate-600">{showcase.vehicles} vehicles</Badge>
        )}
      </div>
    </div>
  </Card>
);

const NewArrivalCard: React.FC<{ arrival: NewArrival }> = ({ arrival }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all group">
    <div className="flex gap-3 p-3">
      <img
        src={arrival.image}
        alt={arrival.title}
        className="w-24 h-20 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[#1E3063] text-sm mb-1 line-clamp-1">{arrival.title}</h3>
        <p className="text-xs text-slate-500 mb-1">{arrival.specs}</p>
        <p className="text-xs text-slate-400 mb-2">{arrival.dealer} • {arrival.region}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#C85A32]">{formatCurrency(arrival.price)}</span>
          <span className="text-xs text-slate-400">{arrival.publishedAt}</span>
        </div>
      </div>
    </div>
  </Card>
);

const InspectionStoryCard: React.FC<{ story: InspectionStory }> = ({ story }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all group">
    <div className="relative h-40">
      <img
        src={story.thumbnail}
        alt={story.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
        <button className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors">
          <Play className="w-6 h-6 text-[#1E3063]" />
        </button>
      </div>
      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {story.duration}
      </div>
    </div>
    <div className="p-4">
      <Badge className="bg-emerald-100 text-emerald-700 mb-2">{story.category}</Badge>
      <h3 className="font-bold text-[#1E3063] text-sm mb-2 line-clamp-2">{story.title}</h3>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{story.presenter}</span>
        <span>{story.views.toLocaleString()} views</span>
      </div>
    </div>
  </Card>
);

const VehicleReviewCard: React.FC<{ review: VehicleReview }> = ({ review }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all group">
    <div className="relative h-40">
      <img
        src={review.thumbnail}
        alt={review.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white/80 text-xs mb-1">{review.vehicle}</p>
        <h3 className="font-bold text-white">{review.title}</h3>
      </div>
      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
        {review.duration}
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#1E3063] flex items-center justify-center text-white text-xs font-bold">
          {review.presenter.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-sm text-slate-800">{review.presenter}</p>
          <p className="text-xs text-slate-500 capitalize">{review.presenterType}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{review.views.toLocaleString()} views</span>
        <Button variant="outline" size="sm">
          <Play className="w-4 h-4 mr-1" />
          Watch
        </Button>
      </div>
    </div>
  </Card>
);

const BuyingGuideCard: React.FC<{ guide: BuyingGuide }> = ({ guide }) => (
  <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 rounded-xl bg-[#1E3063]/10 flex items-center justify-center text-[#1E3063] group-hover:bg-[#1E3063] group-hover:text-white transition-colors">
        {guide.icon}
      </div>
      <div className="flex-1 min-w-0">
        <Badge className="bg-slate-100 text-slate-600 text-xs mb-1">{guide.category}</Badge>
        <h3 className="font-bold text-[#1E3063] text-sm mb-1 group-hover:text-[#C85A32] transition-colors">{guide.title}</h3>
        <p className="text-xs text-slate-500 mb-2 line-clamp-2">{guide.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{guide.readTime} read</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  </Card>
);

const NewsCard: React.FC<{ news: NewsItem }> = ({ news }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
    <div className="relative h-32">
      <img
        src={news.image}
        alt={news.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute top-3 left-3">
        <Badge className="bg-[#1E3063] text-white">{news.category}</Badge>
      </div>
    </div>
    <div className="p-4">
      <h3 className="font-bold text-[#1E3063] text-sm mb-2 line-clamp-2 group-hover:text-[#C85A32] transition-colors">{news.title}</h3>
      <p className="text-xs text-slate-500 mb-3 line-clamp-2">{news.excerpt}</p>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{news.source}</span>
        <span>{news.publishedAt}</span>
      </div>
    </div>
  </Card>
);

const CommunityEventCard: React.FC<{ event: CommunityEvent }> = ({ event }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
    <div className="relative h-36">
      <img
        src={event.image}
        alt={event.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <Badge className={`mb-2 ${
          event.type === 'show' ? 'bg-purple-500' :
          event.type === 'clinic' ? 'bg-blue-500' :
          event.type === 'auction' ? 'bg-[#C85A32]' :
          'bg-emerald-500'
        } text-white`}>
          {event.type.replace('_', ' ').toUpperCase()}
        </Badge>
        <h3 className="font-bold text-white text-sm">{event.title}</h3>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Calendar className="w-4 h-4" />
        <span>{event.date}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <MapPin className="w-4 h-4" />
        <span>{event.location}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{event.attendees} expected</span>
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4 mr-1" />
          Remind Me
        </Button>
      </div>
    </div>
  </Card>
);

// KAYAD LIVE Widget Component (for homepage)
export const KAYADLiveWidget: React.FC<{ className?: string }> = ({ className }) => {
  const liveCount = MOCK_LIVE_BROADCASTS.filter(b => b.isLive).length;

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <Radio className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-[#1E3063]">KAYAD LIVE</h3>
            <p className="text-xs text-slate-500"> Automotive Events & Content</p>
          </div>
        </div>
        {liveCount > 0 && (
          <Badge className="bg-red-100 text-red-600">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            {liveCount} LIVE
          </Badge>
        )}
      </div>

      {liveCount > 0 ? (
        <div className="space-y-3">
          {MOCK_LIVE_BROADCASTS.filter(b => b.isLive).slice(0, 2).map(broadcast => (
            <div key={broadcast.id} className="flex gap-3 p-2 bg-slate-50 rounded-lg">
              <img src={broadcast.image} alt="" className="w-20 h-14 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#1E3063] text-sm truncate">{broadcast.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Eye className="w-3 h-3" />
                  <span>{broadcast.viewers}</span>
                </div>
              </div>
              <Button size="sm" className="bg-[#C85A32] hover:bg-[#a84a28]">
                <Play className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500">
          <VideoOff className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm">No live broadcasts</p>
        </div>
      )}

      <Button variant="outline" className="w-full mt-4">
        <Sparkles className="w-4 h-4 mr-2" />
        Explore KAYAD LIVE
      </Button>
    </Card>
  );
};

// Main KAYAD LIVE Page
const KAYADLive: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<ContentChannel>('live');
  const [searchQuery, setSearchQuery] = useState('');

  const channels: { id: ContentChannel; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'live', label: 'Live', icon: <Radio className="w-4 h-4" />, badge: MOCK_LIVE_BROADCASTS.filter(b => b.isLive).length },
    { id: 'dealer', label: 'Showcase', icon: <Building2 className="w-4 h-4" /> },
    { id: 'arrivals', label: 'New Arrivals', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'inspection', label: 'Inspection', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'reviews', label: 'Reviews', icon: <StarIcon className="w-4 h-4" /> },
    { id: 'guides', label: 'Guides', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'news', label: 'News', icon: <Newspaper className="w-4 h-4" /> },
    { id: 'financing', label: 'Financing', icon: <Banknote className="w-4 h-4" /> },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F6F1E8]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1E3063] to-[#2a4080] py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">KAYAD LIVE</h1>
              <p className="text-white/70">East Africa's Automotive Events & Content Network</p>
            </div>
          </div>
          <p className="text-white/80 max-w-2xl">
            Discover live auctions, dealer showcases, vehicle inspections, buying guides, and the latest automotive news — all in one place.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search videos, articles, broadcasts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3063]/20 focus:border-[#1E3063]"
              />
            </div>
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Following
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
            {channels.map(channel => (
              <ChannelTab
                key={channel.id}
                channel={channel.id}
                label={channel.label}
                icon={channel.icon}
                badge={channel.badge}
                active={activeChannel === channel.id}
                onClick={() => setActiveChannel(channel.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Channel */}
        {activeChannel === 'live' && (
          <div className="space-y-8">
            {/* Featured Live */}
            {MOCK_LIVE_BROADCASTS.filter(b => b.isLive).length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <Radio className="w-4 h-4 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-[#1E3063]">Live Now</h2>
                  </div>
                </div>
                <div className="grid lg:grid-cols-2 gap-6">
                  {MOCK_LIVE_BROADCASTS.filter(b => b.isLive)[0] && (
                    <LiveCard broadcast={MOCK_LIVE_BROADCASTS.filter(b => b.isLive)[0]} large />
                  )}
                  <div className="space-y-4">
                    {MOCK_LIVE_BROADCASTS.filter(b => b.isLive).slice(1).map(broadcast => (
                      <LiveCard key={broadcast.id} broadcast={broadcast} />
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Upcoming Broadcasts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <CalendarClock className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Coming Up</h2>
                </div>
                <Button variant="outline" size="sm">View Schedule</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: 'Premium SUV Auction', time: 'Tomorrow, 10:00 AM', organizer: 'NCBA Bank' },
                  { title: 'Dealer Clearance Sale', time: 'Jan 22, 2:00 PM', organizer: 'Crown Motors' },
                  { title: 'Inspection Workshop', time: 'Jan 25, 11:00 AM', organizer: 'AutoCheck' },
                ].map((item, i) => (
                  <Card key={i} className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1E3063] text-sm">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                      <p className="text-xs text-slate-400">{item.organizer}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Replay Library */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Replay Library</h2>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {MOCK_LIVE_BROADCASTS.map(broadcast => (
                  <LiveCard key={broadcast.id} broadcast={{ ...broadcast, isLive: false, duration: '45:30' }} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Dealer Showcase Channel */}
        {activeChannel === 'dealer' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#1E3063]">Dealer Showcases</h2>
                <Button variant="outline" size="sm">Browse Dealers</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_DEALER_SHOWCASES.map(showcase => (
                  <DealerShowcaseCard key={showcase.id} showcase={showcase} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* New Arrivals Channel */}
        {activeChannel === 'arrivals' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">New Arrivals</h2>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Grid className="w-4 h-4 mr-1" />
                    View Grid
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {MOCK_NEW_ARRIVALS.map(arrival => (
                  <NewArrivalCard key={arrival.id} arrival={arrival} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Inspection Stories Channel */}
        {activeChannel === 'inspection' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Inspection Stories</h2>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_INSPECTION_STORIES.map(story => (
                  <InspectionStoryCard key={story.id} story={story} />
                ))}
              </div>
            </section>

            {/* Featured Inspectors */}
            <section>
              <h2 className="text-lg font-bold text-[#1E3063] mb-4">Featured Inspectors</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: 'AutoCheck Kenya', role: 'Certified Inspector', followers: 2456 },
                  { name: 'MasterTech Garage', role: 'Lead Mechanic', followers: 1823 },
                  { name: 'ProVehicle Inspections', role: 'Senior Inspector', followers: 1456 },
                  { name: 'AutoSure EA', role: 'Inspection Partner', followers: 1234 },
                ].map((inspector, i) => (
                  <Card key={i} className="p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#1E3063] flex items-center justify-center text-white font-bold mx-auto mb-2">
                      {inspector.name.charAt(0)}
                    </div>
                    <p className="font-medium text-[#1E3063] text-sm">{inspector.name}</p>
                    <p className="text-xs text-slate-500 mb-2">{inspector.role}</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
                      <Users className="w-3 h-3" />
                      <span>{inspector.followers.toLocaleString()}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Vehicle Reviews Channel */}
        {activeChannel === 'reviews' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <StarIcon className="w-4 h-4 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Vehicle Reviews</h2>
                </div>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_VEHICLE_REVIEWS.map(review => (
                  <VehicleReviewCard key={review.id} review={review} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Buying Guides Channel */}
        {activeChannel === 'guides' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Buying Guides</h2>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {MOCK_BUYING_GUIDES.map(guide => (
                  <BuyingGuideCard key={guide.id} guide={guide} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Marketplace News Channel */}
        {activeChannel === 'news' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Newspaper className="w-4 h-4 text-slate-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Marketplace News</h2>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_NEWS.map(news => (
                  <NewsCard key={news.id} news={news} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Financing Education Channel */}
        {activeChannel === 'financing' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Financing Education</h2>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: 'Vehicle Loans Explained', icon: <Car className="w-6 h-6" />, articles: 8 },
                  { title: 'Monthly Budgeting', icon: <Calculator className="w-6 h-6" />, articles: 6 },
                  { title: 'Deposit Planning', icon: <PiggyBank className="w-6 h-6" />, articles: 5 },
                  { title: 'Loan Approval Process', icon: <FileCheck className="w-6 h-6" />, articles: 7 },
                  { title: 'Partner Institutions', icon: <Building className="w-6 h-6" />, articles: 12 },
                  { title: 'Financial Literacy', icon: <GraduationCapIcon className="w-6 h-6" />, articles: 10 },
                ].map((topic, i) => (
                  <Card key={i} className="p-6 hover:shadow-lg transition-all cursor-pointer">
                    <div className="w-12 h-12 rounded-xl bg-[#1E3063]/10 flex items-center justify-center text-[#1E3063] mb-4">
                      {topic.icon}
                    </div>
                    <h3 className="font-bold text-[#1E3063] mb-1">{topic.title}</h3>
                    <p className="text-sm text-slate-500">{topic.articles} articles</p>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Community Events Channel */}
        {activeChannel === 'events' && (
          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-[#1E3063]">Community Events</h2>
                </div>
                <Button variant="outline" size="sm">Submit Event</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_COMMUNITY_EVENTS.map(event => (
                  <CommunityEventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Bottom Spacing */}
      <div className="h-24" />
    </div>
  );
};

export default KAYADLive;
