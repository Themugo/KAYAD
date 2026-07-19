import { useState } from 'react';
import { MapPin, Phone, Mail, Star, Clock, Shield, CheckCircle, Calendar, MessageCircle, ChevronRight } from 'lucide-react';
import { formatKES } from '../utils/helpers';
import CarCard from '../components/CarCard';

interface DealerProfileProps {
  setPage: (page: string) => void;
  viewCar: (car: any) => void;
}

const DEMO_DEALER = {
  id: '1',
  name: 'Premium Motors KE',
  logo: null,
  rating: 4.8,
  reviewCount: 127,
  memberSince: '2021',
  location: 'Nairobi, Westlands',
  phone: '+254 712 345 678',
  email: 'sales@premiummotors.co.ke',
  verified: true,
  escrowProtected: true,
  totalListings: 24,
  totalSold: 156,
  description: 'Premium Motors KE is a trusted automotive dealer specializing in premium Japanese and European vehicles. We offer quality pre-owned cars with full service history and escrow protection.',
  badges: ['verified', 'escrow', 'top-rated'],
};

const DEMO_LISTINGS = [
  {
    id: 1,
    make: 'Toyota',
    model: 'Land Cruiser GX-R 2024',
    price: 18500000,
    year: 2024,
    mileage: '12,500 km',
    fuel: 'Petrol',
    city: 'Nairobi',
    type: 'SUV',
    badges: ['escrow', 'verified'],
    image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=600&h=400&fit=crop',
  },
  {
    id: 2,
    make: 'Mercedes-Benz',
    model: 'GLE 450 2023',
    price: 14200000,
    year: 2023,
    mileage: '8,200 km',
    fuel: 'Petrol',
    city: 'Nairobi',
    type: 'SUV',
    badges: ['escrow'],
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&h=400&fit=crop',
  },
  {
    id: 3,
    make: 'Range Rover',
    model: 'Sport HSE 2023',
    price: 16800000,
    year: 2023,
    mileage: '15,800 km',
    fuel: 'Diesel',
    city: 'Nairobi',
    type: 'SUV',
    badges: ['escrow', 'auction'],
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=600&h=400&fit=crop',
  },
];

export default function DealerProfile({ setPage, viewCar }: DealerProfileProps) {
  const [activeTab, setActiveTab] = useState('listings');

  const dealer = DEMO_DEALER;

  const stats = [
    { label: 'Listings', value: dealer.totalListings },
    { label: 'Sold', value: dealer.totalSold },
    { label: 'Rating', value: `${dealer.rating}/5` },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-gold-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-4xl font-bold text-gold-400">
                {dealer.name.charAt(0)}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-2xl text-white font-bold">{dealer.name}</h1>
                {dealer.verified && (
                  <CheckCircle size={18} className="text-emerald-400" />
                )}
              </div>
              <div className="flex items-center gap-4 text-white/60 text-sm mb-3">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {dealer.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  Member since {dealer.memberSince}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      size={16}
                      className={i <= Math.round(dealer.rating) ? 'text-gold-400 fill-current' : 'text-white/20'}
                    />
                  ))}
                </div>
                <span className="text-white/60 text-sm">
                  {dealer.rating} ({dealer.reviewCount} reviews)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-charcoal-900 font-sans text-sm font-bold rounded-xl hover:bg-gold-600 transition-colors">
                <MessageCircle size={16} />
                Contact Dealer
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white font-sans text-sm font-semibold rounded-xl hover:bg-white/20 transition-colors">
                <Phone size={16} />
                Call
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-4 text-center">
                <p className="font-serif text-2xl text-gold-400 font-bold">{value}</p>
                <p className="text-white/50 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-cream-100 rounded-xl p-1 mb-6">
              {['listings', 'about', 'reviews'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 px-4 font-sans text-sm font-semibold rounded-lg transition-colors capitalize ${
                    activeTab === tab
                      ? 'bg-white text-charcoal-900 shadow-sm'
                      : 'text-warm-500 hover:text-charcoal-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'listings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif text-xl text-charcoal-900 font-bold">
                    Active Listings
                  </h2>
                  <span className="text-warm-400 text-sm">{DEMO_LISTINGS.length} vehicles</span>
                </div>
                {DEMO_LISTINGS.map(car => (
                  <CarCard key={car.id} car={car} onClick={() => viewCar(car)} />
                ))}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-4">About</h2>
                <p className="font-sans text-sm text-warm-500 leading-relaxed mb-6">
                  {dealer.description}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-cream-50 rounded-xl">
                    <p className="font-sans text-xs text-warm-400 mb-1">Phone</p>
                    <p className="font-sans text-sm font-semibold text-charcoal-900">{dealer.phone}</p>
                  </div>
                  <div className="p-4 bg-cream-50 rounded-xl">
                    <p className="font-sans text-xs text-warm-400 mb-1">Email</p>
                    <p className="font-sans text-sm font-semibold text-charcoal-900">{dealer.email}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="bg-white rounded-2xl border border-cream-200 p-6">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-4">
                  Reviews ({dealer.reviewCount})
                </h2>
                <div className="space-y-4">
                  {[
                    { user: 'James K.', rating: 5, comment: 'Excellent service! The car was exactly as described.', date: '2 weeks ago' },
                    { user: 'Sarah M.', rating: 5, comment: 'Very professional and transparent. Escrow made me feel safe.', date: '1 month ago' },
                    { user: 'Peter W.', rating: 4, comment: 'Good experience overall. Car was in great condition.', date: '2 months ago' },
                  ].map((review, idx) => (
                    <div key={idx} className="border-b border-cream-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-sans text-sm font-semibold text-charcoal-900">{review.user}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} size={12} className={i <= review.rating ? 'text-gold-400 fill-current' : 'text-cream-300'} />
                            ))}
                          </div>
                          <span className="text-xs text-warm-400">{review.date}</span>
                        </div>
                      </div>
                      <p className="font-sans text-sm text-warm-500">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trust badges */}
            <div className="bg-white rounded-2xl border border-cream-200 p-5">
              <h3 className="font-sans text-sm font-bold text-charcoal-900 mb-4">Trust & Safety</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Shield size={16} className="text-emerald-600" />
                  </div>
                  <span className="font-sans text-sm text-charcoal-800">Escrow Protected</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gold-100 rounded-lg flex items-center justify-center">
                    <CheckCircle size={16} className="text-gold-600" />
                  </div>
                  <span className="font-sans text-sm text-charcoal-800">Verified Dealer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Star size={16} className="text-blue-600" />
                  </div>
                  <span className="font-sans text-sm text-charcoal-800">Top Rated</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-cream-200 p-5">
              <h3 className="font-sans text-sm font-bold text-charcoal-900 mb-4">Location</h3>
              <div className="flex items-center gap-3 text-warm-500">
                <MapPin size={18} />
                <span className="font-sans text-sm">{dealer.location}</span>
              </div>
              <button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-cream-50 text-charcoal-800 font-sans text-sm font-semibold rounded-xl hover:bg-cream-100 transition-colors">
                Get Directions <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
