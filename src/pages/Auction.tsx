import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import { CARS } from '../data/cars';
import { Search, Timer, TrendingUp, Users, Eye, Shield, ChevronLeft, ChevronRight, AlertCircle, Gavel } from 'lucide-react';
import type { Car } from '../components/features/car/CarCard';

interface BidEntry {
  bidder: string;
  amount: number;
  time: string;
}

const MOCK_BID_HISTORY: BidEntry[] = [
  { bidder: 'Auction Admin', amount: 1700000, time: '2 min ago' },
  { bidder: 'Auction Admin', amount: 1675000, time: '5 min ago' },
  { bidder: 'Premium Dealer', amount: 1650000, time: '12 min ago' },
  { bidder: 'Auction Admin', amount: 1600000, time: '18 min ago' },
  { bidder: 'Premium Dealer', amount: 1550000, time: '25 min ago' },
];

const INSPECTION_CHECKS = [
  'Engine & Drivetrain',
  'Brakes & Suspension',
  'Bodywork & Paint',
  'Interior & Upholstery',
  'Electrical Systems',
  'Undercarriage',
  'Tires & Wheels',
  'Safety Features',
  'Exhaust System',
  'HVAC System',
];

function formatKES(n: number) {
  return 'KES ' + n.toLocaleString();
}

function Countdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums">
      <span>{pad(h)}</span><span className="opacity-50">:</span>
      <span>{pad(m)}</span><span className="opacity-50">:</span>
      <span>{pad(s)}</span>
    </span>
  );
}

interface Props {
  setPage: (page: string) => void;
  viewCar: (car: any) => void;
}

export default function Auction({ setPage, viewCar }: Props) {
  const { theme } = useDesignTheme();
  const navigate = useNavigate();
  const c = theme.colors;

  const [activeFilter, setActiveFilter] = useState<'All' | 'SUVs' | 'Pickups' | 'Sedans'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [bidConfirmation, setBidConfirmation] = useState(false);
  const [bidToast, setBidToast] = useState('');
  const [showBidHistory, setShowBidHistory] = useState(false);
  const [showInspection, setShowInspection] = useState(false);

  const auctionCars = useMemo(
    () => CARS.filter((car) => car.badges.includes('auction')),
    []
  );

  const filteredCars = useMemo(() => {
    let list = auctionCars;
    if (activeFilter === 'SUVs') list = list.filter((car) => car.type === 'SUV');
    else if (activeFilter === 'Pickups') list = list.filter((car) => car.type === 'Pickup');
    else if (activeFilter === 'Sedans') list = list.filter((car) => car.type === 'Sedan');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (car) =>
          car.make.toLowerCase().includes(q) ||
          car.model.toLowerCase().includes(q)
      );
    }
    return list;
  }, [auctionCars, activeFilter, searchQuery]);

  const featuredCar = filteredCars[0] as Car | undefined;
  const remainingCars = filteredCars.slice(1);

  const currentBid = featuredCar ? Math.round(featuredCar.price * 0.85) : 0;
  const startingBid = featuredCar ? Math.round(featuredCar.price * 0.75) : 0;

  const handlePlaceBid = useCallback(() => {
    if (!bidAmount || Number(bidAmount) <= currentBid) return;
    setBidToast(`Your bid of ${formatKES(Number(bidAmount))} has been placed!`);
    setBidConfirmation(true);
    setBidAmount('');
    setTimeout(() => {
      setBidToast('');
      setBidConfirmation(false);
    }, 4000);
  }, [bidAmount, currentBid]);

  const quickBidAmounts = useMemo(
    () => [1650000, 1675000, 1700000],
    []
  );

  const filterPills: Array<'All' | 'SUVs' | 'Pickups' | 'Sedans'> = ['All', 'SUVs', 'Pickups', 'Sedans'];

  return (
    <div style={{ background: c.pageBg, minHeight: '100vh', fontFamily: theme.fonts.body, color: c.bodyText }}>
      {/* Bid Toast */}
      {bidToast && (
        <div
          style={{
            position: 'fixed',
            top: 80,
            right: 24,
            zIndex: 9999,
            background: '#16a34a',
            color: '#fff',
            padding: '14px 24px',
            borderRadius: theme.sizes.radius,
            fontFamily: theme.fonts.body,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Shield size={16} />
          {bidToast}
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          background: `linear-gradient(135deg, ${c.heroBg}, ${c.heroBg}ee)`,
          paddingTop: 100,
          paddingBottom: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontFamily: theme.fonts.body,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase' as const,
              color: c.heroAccent,
              marginBottom: 12,
            }}
          >
            Live Competitive Bidding
          </p>
          <h1
            style={{
              fontFamily: theme.fonts.heading,
              fontSize: `calc(2.5rem * ${theme.sizes.headingScale})`,
              fontWeight: 700,
              color: c.heroText,
              marginBottom: 12,
              lineHeight: 1.15,
            }}
          >
            Live Vehicle Auctions
          </h1>
          <p
            style={{
              fontFamily: theme.fonts.body,
              fontSize: `calc(1rem * ${theme.sizes.bodyScale})`,
              color: `${c.heroText}88`,
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            Bid on verified, pre-inspected vehicles in real time. Escrow-protected for your peace of mind.
          </p>

          {/* Stats Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 32 }}>
            {[
              { icon: Timer, label: 'Active Lots', value: `${auctionCars.length}` },
              { icon: Users, label: 'Registered Bidders', value: '340+' },
              { icon: Shield, label: 'Escrow Protected', value: '100%' },
              { icon: TrendingUp, label: 'Bids Today', value: '1,247' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${c.heroAccent}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} style={{ color: c.heroAccent }} />
                </div>
                <div>
                  <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.heroText}66`, textTransform: 'uppercase' as const, letterSpacing: 1, margin: 0 }}>{label}</p>
                  <p style={{ fontFamily: theme.fonts.body, fontSize: 15, fontWeight: 700, color: c.heroText, margin: 0 }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Search + Filter */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 16,
            marginTop: -24,
            background: c.cardBg,
            borderRadius: theme.sizes.radius,
            padding: '16px 20px',
            border: `1px solid ${c.cardBorder}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: c.cardBody,
                opacity: 0.5,
              }}
            />
            <input
              type="text"
              placeholder="Search auction vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 36,
                paddingRight: 12,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 8,
                border: `1px solid ${c.cardBorder}`,
                background: c.pageBg,
                fontFamily: theme.fonts.body,
                fontSize: 14,
                color: c.bodyText,
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filterPills.map((pill) => (
              <button
                key={pill}
                onClick={() => setActiveFilter(pill)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 20,
                  border: `1.5px solid ${activeFilter === pill ? c.buttonBg : c.cardBorder}`,
                  background: activeFilter === pill ? c.buttonBg : 'transparent',
                  color: activeFilter === pill ? c.buttonText : c.cardBody,
                  fontFamily: theme.fonts.body,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Lot Section */}
        {featuredCar && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
              <h2 style={{ fontFamily: theme.fonts.heading, fontSize: `calc(1.5rem * ${theme.sizes.headingScale})`, fontWeight: 700, color: c.headingText, margin: 0 }}>
                Featured Lot
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 0,
                background: c.cardBg,
                borderRadius: theme.sizes.radius,
                border: `1.5px solid ${c.cardBorder}`,
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              }}
            >
              {/* Mobile: stacked, desktop: side-by-side */}
              <style>{`
                @media (min-width: 768px) {
                  .auction-featured-grid { grid-template-columns: 1.1fr 1fr !important; }
                  .auction-featured-sidebar { border-left: 1px solid ${c.cardBorder}; border-top: none !important; }
                  .auction-featured-image { min-height: 380px !important; }
                }
              `}</style>

              {/* Image + Overlays */}
              <div className="auction-featured-image" style={{ position: 'relative', minHeight: 280, overflow: 'hidden' }}>
                <img
                  src={featuredCar.image}
                  alt={`${featuredCar.make} ${featuredCar.model}`}
                  width={800}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 8 }}>
                  <span
                    style={{
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontFamily: theme.fonts.body,
                      letterSpacing: 0.5,
                    }}
                  >
                    FEATURED LOT
                  </span>
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(8px)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontFamily: theme.fonts.body,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Gavel size={10} /> LIVE AUCTION
                  </span>
                </div>
                <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                  <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>Lot #1</p>
                  <h3 style={{ fontFamily: theme.fonts.heading, fontSize: `calc(1.6rem * ${theme.sizes.headingScale})`, fontWeight: 700, color: '#fff', margin: '4px 0 8px' }}>
                    {featuredCar.year} {featuredCar.make} {featuredCar.model}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 6, fontFamily: theme.fonts.body, fontSize: 12, color: '#fff' }}>
                      <Timer size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                      Ends in <Countdown seconds={3600 * 2 + 1800} />
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4ade80', fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                      Live
                    </span>
                  </div>
                </div>
              </div>

              {/* Details + Sidebar */}
              <div className="auction-featured-grid" style={{ display: 'grid', gridTemplateColumns: '1fr' }}>
                {/* Left: Details */}
                <div style={{ padding: 24 }}>
                  <h4 style={{ fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: c.cardAccent, margin: '0 0 16px' }}>
                    Vehicle Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    {[
                      { label: 'Make', value: featuredCar.make },
                      { label: 'Model', value: featuredCar.model },
                      { label: 'Year', value: String(featuredCar.year) },
                      { label: 'Color', value: 'Pearl White' },
                      { label: 'Mileage', value: featuredCar.mileage },
                      { label: 'Transmission', value: featuredCar.transmission || 'Automatic' },
                      { label: 'Engine', value: featuredCar.engine || '3.5L V6 Turbo' },
                      { label: 'Fuel', value: featuredCar.fuel },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 12px', background: c.pageBg, borderRadius: 8 }}>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: `${c.cardBody}88`, margin: '0 0 4px' }}>{label}</p>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 600, color: c.cardHeading, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Bidding Area */}
                  <div style={{ padding: 20, background: `${c.buttonBg}08`, borderRadius: 12, border: `1px solid ${c.buttonBg}22`, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                      <div>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.cardBody}88`, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Current Bid</p>
                        <p style={{ fontFamily: theme.fonts.heading, fontSize: `calc(1.5rem * ${theme.sizes.headingScale})`, fontWeight: 700, color: c.cardAccent, margin: 0 }}>
                          {formatKES(currentBid)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.cardBody}88`, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Starting Bid</p>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 600, color: c.cardBody, margin: 0 }}>{formatKES(startingBid)}</p>
                      </div>
                    </div>

                    <p style={{ fontFamily: theme.fonts.body, fontSize: 11, fontWeight: 600, color: c.cardBody, margin: '0 0 8px' }}>Quick Bid</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {quickBidAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setBidAmount(String(amt))}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: 8,
                            border: `1.5px solid ${bidAmount === String(amt) ? c.buttonBg : c.cardBorder}`,
                            background: bidAmount === String(amt) ? `${c.buttonBg}15` : c.cardBg,
                            color: bidAmount === String(amt) ? c.buttonBg : c.cardBody,
                            fontFamily: theme.fonts.body,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {formatKES(amt)}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Gavel size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${c.cardBody}66` }} />
                        <input
                          type="number"
                          placeholder={`Min: ${formatKES(currentBid + 50000)}`}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          style={{
                            width: '100%',
                            paddingLeft: 32,
                            paddingRight: 12,
                            paddingTop: 10,
                            paddingBottom: 10,
                            borderRadius: 8,
                            border: `1px solid ${c.cardBorder}`,
                            background: c.cardBg,
                            fontFamily: theme.fonts.body,
                            fontSize: 14,
                            color: c.cardHeading,
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handlePlaceBid}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        borderRadius: 10,
                        border: 'none',
                        background: bidConfirmation ? '#16a34a' : c.buttonBg,
                        color: c.buttonText,
                        fontFamily: theme.fonts.body,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                      }}
                    >
                      <Gavel size={16} />
                      {bidConfirmation ? 'Bid Placed!' : 'Place Bid'}
                    </button>
                  </div>

                  {/* Call Now */}
                  <button
                    style={{
                      width: '100%',
                      padding: '12px 0',
                      borderRadius: 10,
                      border: `1.5px solid ${c.cardBorder}`,
                      background: 'transparent',
                      color: c.cardHeading,
                      fontFamily: theme.fonts.body,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginBottom: 16,
                      transition: 'all 0.15s',
                    }}
                  >
                    📞 Call Now to Discuss Lot
                  </button>

                  {/* Bid History Toggle */}
                  <button
                    onClick={() => setShowBidHistory(!showBidHistory)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${c.cardBorder}`,
                      background: c.pageBg,
                      color: c.cardHeading,
                      fontFamily: theme.fonts.body,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendingUp size={14} /> Bid History ({MOCK_BID_HISTORY.length} bids)
                    </span>
                    <ChevronRight
                      size={14}
                      style={{
                        transform: showBidHistory ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  {showBidHistory && (
                    <div style={{ marginBottom: 16 }}>
                      {MOCK_BID_HISTORY.map((bid, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            background: idx % 2 === 0 ? c.pageBg : 'transparent',
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: idx === 0 ? c.buttonBg : `${c.cardBody}18`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontFamily: theme.fonts.body,
                                fontSize: 11,
                                fontWeight: 700,
                                color: idx === 0 ? c.buttonText : c.cardBody,
                              }}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <p style={{ fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 600, color: c.cardHeading, margin: 0 }}>{bid.bidder}</p>
                              <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.cardBody}88`, margin: 0 }}>{bid.time}</p>
                            </div>
                          </div>
                          <p style={{ fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 700, color: idx === 0 ? c.buttonBg : c.cardHeading, margin: 0 }}>
                            {formatKES(bid.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inspection Toggle */}
                  <button
                    onClick={() => setShowInspection(!showInspection)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: `1px solid ${c.cardBorder}`,
                      background: c.pageBg,
                      color: c.cardHeading,
                      fontFamily: theme.fonts.body,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield size={14} /> Inspection Report
                    </span>
                    <ChevronRight
                      size={14}
                      style={{
                        transform: showInspection ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  {showInspection && (
                    <div style={{ marginTop: 12, padding: 16, background: c.pageBg, borderRadius: 10, border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <AlertCircle size={16} style={{ color: c.cardAccent }} />
                        <h5 style={{ fontFamily: theme.fonts.body, fontSize: 14, fontWeight: 700, color: c.cardHeading, margin: 0 }}>
                          150-Point Inspection Report
                        </h5>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {INSPECTION_CHECKS.map((check) => (
                          <div key={check} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                background: '#dcfce7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path d="M2 5l2 2 4-4" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <span style={{ fontFamily: theme.fonts.body, fontSize: 12, color: c.cardBody }}>{check}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop: 14, padding: '10px 14px', background: '#dcfce722', borderRadius: 8, border: '1px solid #16a34a33' }}>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 600, color: '#16a34a', margin: 0 }}>
                          ✓ All systems passed inspection. Vehicle certified for auction.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right sidebar: Bid History summary */}
                <div className="auction-featured-sidebar" style={{ borderTop: `1px solid ${c.cardBorder}`, padding: 24 }}>
                  <h4 style={{ fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' as const, color: c.cardAccent, margin: '0 0 16px' }}>
                    Bid Activity
                  </h4>
                  <div style={{ marginBottom: 20 }}>
                    {MOCK_BID_HISTORY.slice(0, 3).map((bid, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: idx < 2 ? `1px solid ${c.cardBorder}` : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: idx === 0 ? `${c.buttonBg}22` : `${c.cardBody}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={14} style={{ color: idx === 0 ? c.buttonBg : c.cardBody }} />
                          </div>
                          <div>
                            <p style={{ fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 600, color: c.cardHeading, margin: 0 }}>{bid.bidder}</p>
                            <p style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.cardBody}88`, margin: 0 }}>{bid.time}</p>
                          </div>
                        </div>
                        <p style={{ fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 700, color: c.cardHeading, margin: 0 }}>
                          {formatKES(bid.amount)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: 16, background: `${c.cardAccent}08`, borderRadius: 10, border: `1px solid ${c.cardAccent}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <Eye size={14} style={{ color: c.cardAccent }} />
                      <span style={{ fontFamily: theme.fonts.body, fontSize: 12, fontWeight: 700, color: c.cardAccent }}>Quick Summary</span>
                    </div>
                    <p style={{ fontFamily: theme.fonts.body, fontSize: 12, color: c.cardBody, margin: 0, lineHeight: 1.6 }}>
                      This lot has attracted <strong style={{ color: c.cardHeading }}>5 bids</strong> from <strong style={{ color: c.cardHeading }}>2 bidders</strong> in the last hour. Current increment rate is <strong style={{ color: c.cardHeading }}>KES 25,000</strong> per bid.
                    </p>
                  </div>

                  {/* Vehicle summary card */}
                  <div style={{ marginTop: 20, padding: 16, background: c.pageBg, borderRadius: 10, border: `1px solid ${c.cardBorder}` }}>
                    <p style={{ fontFamily: theme.fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: `${c.cardBody}88`, margin: '0 0 10px' }}>Vehicle at a Glance</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {[featuredCar.type, featuredCar.transmission || 'Automatic', featuredCar.fuel, featuredCar.mileage, `${featuredCar.year}`].map((tag) => (
                        <span key={tag} style={{ padding: '4px 10px', borderRadius: 6, background: c.cardBg, border: `1px solid ${c.cardBorder}`, fontFamily: theme.fonts.body, fontSize: 11, color: c.cardBody, fontWeight: 500 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Grid: Upcoming Lots */}
        {remainingCars.length > 0 && (
          <div style={{ marginTop: 48, marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontFamily: theme.fonts.heading, fontSize: `calc(1.4rem * ${theme.sizes.headingScale})`, fontWeight: 700, color: c.headingText, margin: 0 }}>
                Upcoming Lots
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${c.cardBorder}`,
                    background: c.cardBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: c.cardBody,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: `1px solid ${c.cardBorder}`,
                    background: c.cardBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: c.cardBody,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
              {remainingCars.map((car, idx) => {
                const carBid = Math.round(car.price * 0.85);
                return (
                  <div
                    key={car.id}
                    style={{
                      background: c.cardBg,
                      borderRadius: theme.sizes.radius,
                      border: `1px solid ${c.cardBorder}`,
                      overflow: 'hidden',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                    onClick={() => viewCar(car)}
                  >
                    {/* Image */}
                    <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                      <img
                        src={car.image}
                        alt={`${car.make} ${car.model}`}
                        width={400}
                        height={300}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 40%)' }} />
                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: '#ef4444',
                            fontFamily: theme.fonts.body,
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                          LIVE
                        </span>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            fontFamily: theme.fonts.body,
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#fff',
                          }}
                        >
                          <Gavel size={9} /> Lot #{idx + 2}
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <p style={{ fontFamily: theme.fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                            {car.make}
                          </p>
                          <p style={{ fontFamily: theme.fonts.heading, fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                            {car.model}
                          </p>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(4px)',
                            fontFamily: theme.fonts.body,
                            fontSize: 11,
                            color: '#fff',
                          }}
                        >
                          <Timer size={10} /> <Countdown seconds={3600 * (idx + 3) + 900} />
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div style={{ padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                          <p style={{ fontFamily: theme.fonts.body, fontSize: 10, color: `${c.cardBody}88`, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Current Bid</p>
                          <p style={{ fontFamily: theme.fonts.heading, fontSize: 17, fontWeight: 700, color: c.cardAccent, margin: 0 }}>{formatKES(carBid)}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontFamily: theme.fonts.body, fontSize: 10, color: `${c.cardBody}88`, margin: '0 0 2px', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Starting</p>
                          <p style={{ fontFamily: theme.fonts.body, fontSize: 13, fontWeight: 600, color: c.cardBody, margin: 0 }}>{formatKES(Math.round(car.price * 0.75))}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                        {[car.type, car.transmission || 'Auto', car.fuel, car.mileage].map((tag) => (
                          <span key={tag} style={{ padding: '3px 8px', borderRadius: 4, background: c.pageBg, fontFamily: theme.fonts.body, fontSize: 11, color: c.cardBody }}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontFamily: theme.fonts.body, fontSize: 11, color: `${c.cardBody}88` }}>
                          {Math.floor(Math.random() * 15 + 3)} bids
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: theme.fonts.body, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                          Live
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewCar(car);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 0',
                          borderRadius: 8,
                          border: 'none',
                          background: c.buttonBg,
                          color: c.buttonText,
                          fontFamily: theme.fonts.body,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <Gavel size={14} /> Bid Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', padding: '40px 0 64px' }}>
          <button
            onClick={() => setPage('showroom')}
            style={{
              padding: '14px 36px',
              borderRadius: 12,
              border: `1.5px solid ${c.cardBorder}`,
              background: c.cardBg,
              color: c.cardHeading,
              fontFamily: theme.fonts.body,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = c.buttonBg;
              (e.currentTarget as HTMLButtonElement).style.color = c.buttonText;
              (e.currentTarget as HTMLButtonElement).style.borderColor = c.buttonBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = c.cardBg;
              (e.currentTarget as HTMLButtonElement).style.color = c.cardHeading;
              (e.currentTarget as HTMLButtonElement).style.borderColor = c.cardBorder;
            }}
          >
            <Eye size={16} /> View All Vehicles
          </button>
        </div>
      </div>
    </div>
  );
}
