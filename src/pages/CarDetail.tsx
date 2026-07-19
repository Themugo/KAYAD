import { useState, useEffect } from 'react';
import {
  ArrowLeft, Shield, Gavel, Calendar, Gauge, Fuel, MapPin,
  CheckCircle, Heart, Share2, Wrench, Eye, Zap, Phone,
  MessageCircle, Star, ChevronRight, Lock, Clock, Loader2,
} from 'lucide-react';
import type { Car } from '../types';
import { carsAPI } from '../api/client';

type AnyPage = string;

interface CarDetailProps {
  car: Car;
  setPage: (page: AnyPage) => void;
  viewCar: (car: Car) => void;
}

const FEATURES: Record<string, string[]> = {
  SUV:    ['Leather Seats', 'Panoramic Sunroof', 'Apple CarPlay', 'Rear Camera', 'Adaptive Cruise', 'Blind Spot Monitor'],
  Pickup: ['Bull Bar', 'Diff Lock', 'Tow Bar', 'Side Steps', 'Cargo Liner', 'LED Light Bar'],
  Sedan:  ['Sport Package', 'Heated Seats', 'Wireless Charging', 'Ambient Lighting', 'Lane Assist', 'Navigation'],
  Wagon:  ['Roof Rails', 'Third Row Seats', 'Power Liftgate', 'AWD', 'Fold-Flat Seats', 'Rear Entertainment'],
};

const INSPECTION_CATS = [
  { label: 'Engine & Drivetrain', icon: Wrench, score: 95 },
  { label: 'Exterior & Body',     icon: Eye,    score: 91 },
  { label: 'Electrical Systems',  icon: Zap,    score: 88 },
  { label: 'Interior & Safety',   icon: Shield, score: 94 },
];

type Tab = 'overview' | 'inspection' | 'financing';

export default function CarDetail({ car, setPage, viewCar }: CarDetailProps) {
  const [saved, setSaved] = useState(false);
  const [tab, setTab]     = useState<Tab>('overview');
  const [similar, setSimilar] = useState<Car[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const fmt = (n: number) => n.toLocaleString('en-KE');

  const carType = car.bodyType || car.type || 'SUV';
  const features = FEATURES[carType] ?? FEATURES.SUV;
  const badges = car.badges || [];

  // Fetch similar cars
  useEffect(() => {
    const fetchSimilar = async () => {
      try {
        setLoadingSimilar(true);
        const response = await carsAPI.list({ page: 1, limit: 10 });
        const cars = response?.cars || response?.data || response || [];
        const similarCars = (Array.isArray(cars) ? cars : [])
          .filter((c: Car) => (c.bodyType || c.type) === carType && c._id !== car._id && c.id !== car.id)
          .slice(0, 3);
        setSimilar(similarCars);
      } catch (err) {
        console.error('Failed to fetch similar cars:', err);
        setSimilar([]);
      } finally {
        setLoadingSimilar(false);
      }
    };
    fetchSimilar();
  }, [carType, car._id, car.id]);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">

      {/* ── BREADCRUMB BAR ─────────────────────────────────────────── */}
      <div className="bg-charcoal-900 border-b border-white/10 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
          <button
            onClick={() => setPage('gallery')}
            className="flex items-center gap-2 text-white/60 hover:text-gold-400 font-sans text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Back to Gallery
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSaved(v => !v)}
              className={`flex items-center gap-1.5 font-sans text-xs font-semibold transition-colors ${saved ? 'text-gold-400' : 'text-white/40 hover:text-white/70'}`}
            >
              <Heart size={13} fill={saved ? 'currentColor' : 'none'} />
              {saved ? 'Saved' : 'Save'}
            </button>
            <button className="flex items-center gap-1.5 font-sans text-xs font-semibold text-white/40 hover:text-white/70 transition-colors">
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>
      </div>

      {/* ── HERO IMAGE ─────────────────────────────────────────────── */}
      <div className="relative h-[58vh] min-h-[380px] bg-charcoal-900 overflow-hidden">
        <img
          src={car.image}
          alt={`${car.make} ${car.model}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-900/25 to-transparent" />
        {/* Teal glow at base of image */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-40 bg-gold-400/10 blur-3xl rounded-full pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
          <p className="section-label text-gold-400 mb-2">{car.make}</p>
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-3 leading-tight">
            {car.model}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            {badges.includes('escrow') && (
              <span className="card-badge bg-charcoal-900/80 text-white backdrop-blur-sm">
                <Shield size={10} /> ESCROW
              </span>
            )}
            {badges.includes('auction') && (
              <span className="card-badge bg-gold-600 text-white">
                <Gavel size={10} /> AUCTION
              </span>
            )}
            <span className="font-serif text-2xl md:text-3xl text-gold-400 font-bold ml-auto">
              KES {fmt(car.price)}
            </span>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS STRIP ──────────────────────────────────────── */}
      <div className="bg-charcoal-800 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 py-4 overflow-x-auto scrollbar-hide">
            {[
              { icon: Calendar, label: 'Year',         value: String(car.year) },
              { icon: Gauge,    label: 'Mileage',      value: car.mileage || 'N/A' },
              { icon: Fuel,     label: 'Fuel',         value: car.fuel },
              { icon: MapPin,   label: 'Location',     value: car.city },
              { icon: Wrench,   label: 'Transmission', value: car.transmission ?? 'Automatic' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2.5 flex-shrink-0">
                <Icon size={14} className="text-gold-400" />
                <div>
                  <p className="text-[9px] font-sans font-semibold text-white/35 uppercase tracking-widest leading-none">{label}</p>
                  <p className="font-sans text-sm font-semibold text-white mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* LEFT — tabs + content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tab switcher */}
            <div className="flex gap-1 bg-white rounded-xl p-1 border border-cream-200 w-fit shadow-sm">
              {(['overview', 'inspection', 'financing'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-lg font-sans text-sm font-semibold capitalize transition-all duration-200 ${
                    tab === t
                      ? 'bg-charcoal-900 text-white shadow-sm'
                      : 'text-warm-500 hover:text-charcoal-900'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl p-6 border border-cream-200">
                  <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-3">About This Vehicle</h2>
                  <p className="font-sans text-sm text-warm-500 leading-relaxed">
                    This {car.year} {car.make} {car.model} is a meticulously maintained {carType.toLowerCase()} offered by a
                    KAYAD-verified dealer in {car.city}. With only {car.mileage || 'N/A'} on the odometer, it represents
                    outstanding value in the Kenyan premium vehicle market. Full service history available on request.
                    All documentation verified — including log book, NTSA status, and current insurance.
                  </p>
                  <p className="font-sans text-sm text-warm-500 leading-relaxed mt-3">
                    This vehicle is fully covered under KAYAD Escrow Protection. Your payment is held securely until
                    you confirm safe receipt and complete satisfaction. An independent 150-point pre-inspection
                    certificate is available upon request.
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-cream-200">
                  <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-4">Key Features</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {features.map(f => (
                      <div key={f} className="flex items-center gap-2.5">
                        <CheckCircle size={14} className="text-gold-500 flex-shrink-0" />
                        <span className="font-sans text-sm text-warm-600">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-cream-200">
                  <h2 className="font-serif text-xl text-charcoal-900 font-bold mb-4">Verified Dealer</h2>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-charcoal-900 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-sans text-white font-bold text-xs">{car.make.slice(0, 2)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-sans font-semibold text-charcoal-900">{car.make} Premium Motors</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={11} className={i < 4 ? 'text-gold-500 fill-gold-500' : 'text-warm-300 fill-warm-300'} />
                        ))}
                        <span className="font-sans text-xs text-warm-400 ml-1">4.8 · 142 reviews</span>
                      </div>
                      <p className="font-sans text-xs text-warm-400 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {car.city}, Kenya · KAYAD Verified Since 2022
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-sans text-[10px] text-warm-400 uppercase tracking-wide">Response</p>
                      <p className="font-sans text-sm font-bold text-gold-600">Under 2h</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INSPECTION ── */}
            {tab === 'inspection' && (
              <div className="space-y-5">
                <div className="bg-charcoal-900 rounded-2xl p-7 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-48 h-48 bg-gold-500/8 blur-3xl rounded-full pointer-events-none" />
                  <div className="relative flex items-start justify-between mb-7">
                    <div>
                      <p className="section-label text-gold-400 mb-1">KAYAD CERTIFIED</p>
                      <h2 className="font-serif text-2xl text-white font-bold">150-Point Report</h2>
                      <p className="font-sans text-xs text-white/40 mt-1">Inspected by certified mechanic · {car.city}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-serif text-4xl sm:text-5xl font-bold text-gold-400 leading-none">92</p>
                      <p className="font-sans text-[10px] text-white/40 uppercase tracking-widest mt-1">Score</p>
                    </div>
                  </div>
                  <div className="relative space-y-5">
                    {INSPECTION_CATS.map(({ label, icon: Icon, score }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon size={13} className="text-gold-400" />
                            <span className="font-sans text-sm text-white/80">{label}</span>
                          </div>
                          <span className="font-sans text-sm font-bold text-gold-400">{score}%</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gold-400 rounded-full"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-cream-200">
                  <p className="font-sans text-sm text-warm-500 leading-relaxed mb-4">
                    The full 150-point digital inspection report — including photo evidence for every check —
                    is available after booking a formal inspection through KAYAD.
                  </p>
                  <button onClick={() => setPage('pre-inspection')} className="btn-gold text-sm">
                    Book Full Inspection <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* ── FINANCING ── */}
            {tab === 'financing' && (
              <div className="bg-white rounded-2xl p-6 border border-cream-200 space-y-4">
                <h2 className="font-serif text-xl text-charcoal-900 font-bold">Financing Options</h2>
                <p className="font-sans text-sm text-warm-400">Estimated monthly repayments based on full vehicle price:</p>
                {[
                  { bank: 'KCB Auto Loan', rate: '13.5% p.a.', term: '60 months', monthly: Math.round(car.price / 60 * 1.135) },
                  { bank: 'Equity Bank',   rate: '14.0% p.a.', term: '48 months', monthly: Math.round(car.price / 48 * 1.14)  },
                  { bank: 'Stanbic Bank',  rate: '12.9% p.a.', term: '72 months', monthly: Math.round(car.price / 72 * 1.129) },
                ].map(({ bank, rate, term, monthly }) => (
                  <div key={bank} className="flex items-center justify-between p-4 rounded-xl border border-cream-200 hover:border-gold-500/40 transition-colors group">
                    <div>
                      <p className="font-sans font-semibold text-charcoal-900 text-sm">{bank}</p>
                      <p className="font-sans text-xs text-warm-400">{rate} · {term}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-sans text-sm font-bold text-gold-700">KES {fmt(monthly)}/mo</p>
                      <button className="font-sans text-xs text-gold-600 hover:underline group-hover:text-gold-500">Apply →</button>
                    </div>
                  </div>
                ))}
                <p className="font-sans text-xs text-warm-300 pt-2">* Rates are indicative. Subject to bank approval and credit check.</p>
              </div>
            )}
          </div>

          {/* RIGHT — sticky sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-4">

              {/* Price + CTAs */}
              <div className="bg-charcoal-900 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/8 blur-2xl rounded-full pointer-events-none" />
                <div className="relative">
                  <p className="font-sans text-[10px] text-white/35 uppercase tracking-widest mb-1">Asking Price</p>
                  <p className="font-serif text-2xl sm:text-3xl text-gold-400 font-bold mb-5">KES {fmt(car.price)}</p>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setPage('escrow')}
                      className="w-full flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-700 text-white font-sans font-semibold py-3 rounded-full transition-colors text-sm"
                    >
                      <Lock size={14} /> Start Escrow
                    </button>
                    {badges.includes('auction') && (
                      <button
                        onClick={() => setPage('auction')}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-sans font-semibold py-3 rounded-full transition-colors text-sm"
                      >
                        <Gavel size={14} /> Place a Bid
                      </button>
                    )}
                    <button
                      onClick={() => setPage('pre-inspection')}
                      className="w-full flex items-center justify-center gap-2 border border-gold-400 text-gold-400 hover:bg-gold-400/10 font-sans font-semibold py-3 rounded-full transition-colors text-sm"
                    >
                      <Wrench size={14} /> Book Inspection
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10 flex">
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-white/50 hover:text-gold-400 font-sans text-xs font-semibold transition-colors py-2">
                      <Phone size={13} /> Call
                    </button>
                    <div className="w-px bg-white/10" />
                    <button className="flex-1 flex items-center justify-center gap-1.5 text-white/50 hover:text-gold-400 font-sans text-xs font-semibold transition-colors py-2">
                      <MessageCircle size={13} /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-white rounded-2xl p-5 border border-cream-200 space-y-3.5">
                {[
                  { icon: Shield,       title: 'Escrow Protected',  desc: 'Funds held until safe delivery' },
                  { icon: CheckCircle,  title: 'Verified Dealer',   desc: 'KAYAD certified since 2022' },
                  { icon: Clock,        title: '24h Report',        desc: 'Full inspection within one day' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-gold-600" />
                    </div>
                    <div>
                      <p className="font-sans text-xs font-semibold text-charcoal-900">{title}</p>
                      <p className="font-sans text-xs text-warm-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMILAR VEHICLES ───────────────────────────────────────── */}
      <section className="bg-cream-100 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="section-label mb-1">You May Also Like</p>
              <h2 className="font-serif text-2xl text-charcoal-900 font-bold">Similar Vehicles</h2>
            </div>
            <button
              onClick={() => setPage('gallery')}
              className="font-sans text-sm font-semibold text-gold-700 hover:text-gold-600 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          {loadingSimilar ? (
            <div className="flex justify-center py-12">
              <Loader2 size={40} className="animate-spin text-gold-600" />
            </div>
          ) : similar.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {similar.map(c => (
                <div key={c._id || c.id} onClick={() => viewCar(c)} className="cursor-pointer">
                  <CarCard car={c} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-warm-400 py-8">No similar vehicles found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
