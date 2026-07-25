import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import { Car } from '../components/features/car/CarCard';
import { CARS } from '../data/cars';
import {
  ArrowLeft,
  Heart,
  Share,
  MapPin,
  Calendar,
  Fuel,
  Gauge,
  Tag,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageCircle,
  ExternalLink,
  Phone,
} from 'lucide-react';

interface CarDetailProps {
  car: Car | null;
  setPage: (page: string) => void;
  viewCar?: (car: Car) => void;
}

type Tab = 'overview' | 'escrow' | 'inspection' | 'financing';

function useCountdown(targetDate: string | undefined) {
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setRemaining({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return remaining;
}

export default function CarDetail({ car, setPage, viewCar }: CarDetailProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const c = theme.colors;
  const r = theme.sizes.radius;

  const [tab, setTab] = useState<Tab>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [inspectionLocation, setInspectionLocation] = useState('Westlands');
  const [financingName, setFinancingName] = useState('');
  const [financingPhone, setFinancingPhone] = useState('');
  const [financingIncome, setFinancingIncome] = useState('');
  const [financingEmployment, setFinancingEmployment] = useState('employed');

  const countdown = useCountdown(car?.auctionEnd);

  const goBack = useCallback(() => {
    setPage('gallery');
    navigate('/gallery');
  }, [setPage, navigate]);

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
    },
    [setPage, navigate],
  );

  if (!car) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: c.pageBg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
          fontFamily: `var(--font-body, ${theme.fonts.body})`,
        }}
      >
        <AlertCircle size={56} style={{ color: c.cardBorder, opacity: 0.5 }} />
        <h1
          style={{
            fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
            color: c.headingText,
            fontSize: '1.8rem',
            fontWeight: 700,
            margin: 0,
          }}
        >
          Vehicle Not Found
        </h1>
        <p style={{ color: c.bodyText, margin: 0, fontSize: '0.95rem' }}>
          The vehicle you are looking for may have been removed or is unavailable.
        </p>
        <button
          onClick={goBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: r,
            border: 'none',
            background: c.buttonBg,
            color: c.buttonText,
            fontFamily: `var(--font-body, ${theme.fonts.body})`,
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} /> Back to Marketplace
        </button>
      </div>
    );
  }

  const isOnAuction = car.badges.includes('auction') && car.auctionEnd && new Date(car.auctionEnd).getTime() > Date.now();
  const currentPrice = isOnAuction && car.currentBid && car.currentBid > 0 ? car.currentBid : car.price;
  const formattedPrice = `KES ${currentPrice.toLocaleString('en-KE')}`;

  const carImages = [
    car.image,
    car.image.replace('600x400', '800x600'),
    car.image.replace('600x400', '700x500'),
    car.image.replace('600x400', '900x600'),
  ];

  const similarCars = CARS.filter(
    (c) => c.id !== car.id && (c.make === car.make || c.type === car.type),
  ).slice(0, 4);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'escrow', label: 'Escrow' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'financing', label: 'Financing' },
  ];

  const keyDetails = [
    { icon: Calendar, label: 'Year', value: String(car.year) },
    { icon: Gauge, label: 'Mileage', value: car.mileage },
    { icon: Tag, label: 'Transmission', value: car.transmission ?? 'Automatic' },
    { icon: Fuel, label: 'Fuel Type', value: car.fuel },
    { icon: AlertCircle, label: 'VIN', value: `KND${String(car.id).padStart(10, '0')}` },
  ];

  const historyItems = [
    { ok: true, text: 'Accident-free history — no structural damage recorded' },
    { ok: true, text: 'First owner — single private ownership' },
    { ok: true, text: 'Full service history with authorized dealer' },
    { ok: false, text: car.isBankOwned ? 'Bank-owned repossessed vehicle' : 'No outstanding finance or liens' },
  ];

  const inspectionLocations = [
    'Westlands',
    'Industrial Area',
    'Mombasa Road',
    'Thika Road',
    'Karen',
    'Nyali (Mombasa)',
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: c.pageBg,
        fontFamily: `var(--font-body, ${theme.fonts.body})`,
      }}
    >
      {/* ── BREADCRUMB ── */}
      <div
        style={{
          padding: '14px 0',
          borderBottom: `1px solid ${c.cardBorder}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={goBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'none',
                  border: 'none',
                  color: c.cardAccent,
                  cursor: 'pointer',
                  fontFamily: `var(--font-body, ${theme.fonts.body})`,
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  padding: 0,
                }}
              >
                <ArrowLeft size={16} />
              </button>
              <nav
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  color: c.bodyText,
                  opacity: 0.6,
                }}
              >
                <span
                  style={{ cursor: 'pointer', color: c.cardAccent, opacity: 1 }}
                  onClick={goBack}
                >
                  Home
                </span>
                <span style={{ opacity: 0.4 }}>&gt;</span>
                <span style={{ opacity: 1, color: c.bodyText }}>{car.make}</span>
                <span style={{ opacity: 0.4 }}>&gt;</span>
                <span style={{ opacity: 1, color: c.headingText, fontWeight: 600 }}>{car.model}</span>
              </nav>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setFavorited(v => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  color: favorited ? '#ef4444' : c.cardBody,
                  cursor: 'pointer',
                  fontFamily: `var(--font-body, ${theme.fonts.body})`,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                <Heart size={15} className={favorited ? 'fill-current' : ''} />
                {favorited ? 'Saved' : 'Save'}
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  color: c.cardBody,
                  cursor: 'pointer',
                  fontFamily: `var(--font-body, ${theme.fonts.body})`,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                <Share size={15} /> Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── IMAGE GALLERY ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 12,
          }}
        >
          {/* Main image */}
          <div
            style={{
              borderRadius: r,
              overflow: 'hidden',
              position: 'relative',
              aspectRatio: '16/9',
              background: c.cardBorder,
            }}
          >
            <img
              src={carImages[activeImage]}
              alt={`${car.make} ${car.model}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* Overlay gradient */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 40%)',
                pointerEvents: 'none',
              }}
            />
            {/* Badges */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isOnAuction && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(239,68,68,0.92)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'pulse 1.5s infinite' }} />
                  LIVE AUCTION
                </span>
              )}
              {car.badges.includes('escrow') && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(30,30,30,0.88)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <Shield size={11} /> ESCROW
                </span>
              )}
              {car.isVerified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'rgba(16,185,129,0.92)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  ✓ VERIFIED
                </span>
              )}
            </div>
            {/* Image count */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            >
              {activeImage + 1} / {carImages.length}
            </div>
          </div>

          {/* Thumbnails */}
          <div style={{ display: 'flex', gap: 10 }}>
            {carImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                style={{
                  flex: idx === 0 ? '1.5 1 0%' : '1 1 0%',
                  aspectRatio: '16/10',
                  borderRadius: Math.round(r * 0.6),
                  overflow: 'hidden',
                  border: idx === activeImage ? `2.5px solid ${c.cardAccent}` : `2px solid transparent`,
                  cursor: 'pointer',
                  padding: 0,
                  opacity: idx === activeImage ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  background: 'none',
                }}
              >
                <img
                  src={img}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN LAYOUT: CONTENT + SIDEBAR ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 60px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
            gap: 32,
            alignItems: 'start',
          }}
        >
          {/* ── LEFT COLUMN ── */}
          <div style={{ minWidth: 0 }}>
            {/* Car title */}
            <div style={{ marginBottom: 24 }}>
              <p
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: c.cardAccent,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                {car.make}
              </p>
              <h1
                style={{
                  fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                  fontSize: `calc(2rem * ${theme.sizes.headingScale})`,
                  fontWeight: 700,
                  color: c.headingText,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {car.model}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: c.bodyText, fontSize: '0.85rem' }}>
                <MapPin size={14} style={{ color: c.cardAccent }} />
                {car.city}, Kenya
                {car.listedDate && (
                  <>
                    <span style={{ opacity: 0.3 }}>·</span>
                    <Calendar size={13} />
                    Listed {car.listedDate}
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                background: c.cardBg,
                border: `1px solid ${c.cardBorder}`,
                borderRadius: r,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: Math.round(r * 0.6),
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: `var(--font-body, ${theme.fonts.body})`,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    background: tab === t.key ? c.buttonBg : 'transparent',
                    color: tab === t.key ? c.buttonText : c.cardBody,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── TAB: OVERVIEW ── */}
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Key Details */}
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    Key Details
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>
                    {keyDetails.map(d => (
                      <div
                        key={d.label}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: 14,
                          background: c.pageBg,
                          borderRadius: Math.round(r * 0.6),
                          border: `1px solid ${c.cardBorder}`,
                        }}
                      >
                        <d.icon size={16} style={{ color: c.cardAccent }} />
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: c.cardBody,
                            opacity: 0.5,
                          }}
                        >
                          {d.label}
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: c.cardHeading,
                          }}
                        >
                          {d.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vehicle History */}
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    Vehicle History
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {historyItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {item.ok ? (
                          <CheckCircle size={17} style={{ color: '#10b981', flexShrink: 0, marginTop: 1 }} />
                        ) : (
                          <XCircle size={17} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                        )}
                        <span style={{ fontSize: '0.85rem', color: c.cardBody, lineHeight: 1.5 }}>
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Insurance */}
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    Insurance
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Shield size={20} style={{ color: c.cardAccent }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: c.cardHeading }}>
                        Comprehensive Cover — Active
                      </p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: c.cardBody, marginTop: 2 }}>
                        Valid until December 2026. Transferable to new owner upon sale.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inspection Status */}
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    Inspection Status
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      background: c.pageBg,
                      borderRadius: Math.round(r * 0.6),
                      border: `1px solid ${c.cardBorder}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <CheckCircle size={20} style={{ color: '#10b981' }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: c.cardHeading }}>
                          150-Point Pre-Purchase Inspection
                        </p>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: c.cardBody, marginTop: 2 }}>
                          Available upon request — not yet completed
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '5px 14px',
                        borderRadius: 20,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: '#fef3c7',
                        color: '#92400e',
                      }}
                    >
                      AVAILABLE
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: ESCROW ── */}
            {tab === 'escrow' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    KAYAD Escrow Protection
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      {
                        step: '1',
                        title: 'Buyer initiates escrow',
                        desc: 'You send the agreed amount to KAYAD\'s secure escrow account via M-Pesa or bank transfer.',
                      },
                      {
                        step: '2',
                        title: 'Vehicle delivered & inspected',
                        desc: 'The dealer delivers the vehicle. You or a KAYAD inspector verify condition matches the listing.',
                      },
                      {
                        step: '3',
                        title: 'Funds released to dealer',
                        desc: 'Once you confirm satisfaction, the funds are released to the seller within 24 hours.',
                      },
                      {
                        step: '4',
                        title: 'Dispute resolution',
                        desc: 'If issues arise within 48 hours, KAYAD mediates and can freeze funds pending resolution.',
                      },
                    ].map(s => (
                      <div key={s.step} style={{ display: 'flex', gap: 14 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: c.cardAccent,
                            color: c.buttonText,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            flexShrink: 0,
                          }}
                        >
                          {s.step}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: c.cardHeading }}>
                            {s.title}
                          </p>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: c.cardBody, marginTop: 3, lineHeight: 1.5 }}>
                            {s.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 12px',
                    }}
                  >
                    Why Use Escrow?
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {[
                      { icon: Shield, title: 'Zero Scam Risk', desc: 'Your money never reaches the seller until you approve the vehicle.' },
                      { icon: AlertCircle, title: 'Dispute Window', desc: '48-hour window to report issues after delivery.' },
                      { icon: CheckCircle, title: 'Verified Dealers Only', desc: 'All sellers are KYC-verified KAYAD members.' },
                      { icon: ExternalLink, title: 'Transparent Process', desc: 'Track your escrow status in real-time from your dashboard.' },
                    ].map(item => (
                      <div
                        key={item.title}
                        style={{
                          padding: 16,
                          background: c.pageBg,
                          borderRadius: Math.round(r * 0.6),
                          border: `1px solid ${c.cardBorder}`,
                        }}
                      >
                        <item.icon size={18} style={{ color: c.cardAccent, marginBottom: 8 }} />
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: c.cardHeading }}>
                          {item.title}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: c.cardBody, marginTop: 4, lineHeight: 1.4 }}>
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: INSPECTION ── */}
            {tab === 'inspection' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 8px',
                    }}
                  >
                    Book Pre-Purchase Inspection
                  </h2>
                  <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: c.cardBody, lineHeight: 1.6 }}>
                    Our certified KAYAD mechanics perform a thorough 150-point inspection including engine diagnostics,
                    structural integrity, electrical systems, and undercarriage analysis. You receive a full digital report
                    with photos within 24 hours.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: c.cardBody,
                          opacity: 0.6,
                          marginBottom: 6,
                        }}
                      >
                        Inspection Location
                      </label>
                      <select
                        value={inspectionLocation}
                        onChange={e => setInspectionLocation(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: Math.round(r * 0.6),
                          border: `1.5px solid ${c.cardBorder}`,
                          background: c.pageBg,
                          color: c.cardHeading,
                          fontFamily: `var(--font-body, ${theme.fonts.body})`,
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {inspectionLocations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => nav('pre-inspection')}
                      style={{
                        width: '100%',
                        padding: '13px 0',
                        borderRadius: Math.round(r * 0.6),
                        border: 'none',
                        background: c.buttonBg,
                        color: c.buttonText,
                        fontFamily: `var(--font-body, ${theme.fonts.body})`,
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      Book Inspection — KES 3,500
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 16px',
                    }}
                  >
                    What Is Checked
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      'Engine & drivetrain',
                      'Transmission system',
                      'Brake pads & rotors',
                      'Suspension & steering',
                      'Electrical systems',
                      'Body & frame alignment',
                      'Interior condition',
                      'Undercarriage & exhaust',
                      'Oil & fluid levels',
                      'Cooling system',
                      'Battery health',
                      'Tire tread depth',
                    ].map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle size={14} style={{ color: c.cardAccent, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: c.cardBody }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: FINANCING ── */}
            {tab === 'financing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div
                  style={{
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: r,
                    padding: theme.sizes.cardPadding,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                      fontSize: `calc(1.15rem * ${theme.sizes.headingScale})`,
                      fontWeight: 700,
                      color: c.cardHeading,
                      margin: '0 0 8px',
                    }}
                  >
                    Apply for Car Financing
                  </h2>
                  <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: c.cardBody, lineHeight: 1.6 }}>
                    Complete the form below and our financing partners will reach out with tailored offers within 24 hours.
                    Rates start from 12.5% p.a. depending on credit profile.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: c.cardBody,
                            opacity: 0.6,
                            marginBottom: 6,
                          }}
                        >
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={financingName}
                          onChange={e => setFinancingName(e.target.value)}
                          placeholder="John Kamau"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: Math.round(r * 0.6),
                            border: `1.5px solid ${c.cardBorder}`,
                            background: c.pageBg,
                            color: c.cardHeading,
                            fontFamily: `var(--font-body, ${theme.fonts.body})`,
                            fontSize: '0.85rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: c.cardBody,
                            opacity: 0.6,
                            marginBottom: 6,
                          }}
                        >
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={financingPhone}
                          onChange={e => setFinancingPhone(e.target.value)}
                          placeholder="+254 7XX XXX XXX"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: Math.round(r * 0.6),
                            border: `1.5px solid ${c.cardBorder}`,
                            background: c.pageBg,
                            color: c.cardHeading,
                            fontFamily: `var(--font-body, ${theme.fonts.body})`,
                            fontSize: '0.85rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: c.cardBody,
                          opacity: 0.6,
                          marginBottom: 6,
                        }}
                      >
                        Monthly Income (KES)
                      </label>
                      <input
                        type="text"
                        value={financingIncome}
                        onChange={e => setFinancingIncome(e.target.value)}
                        placeholder="e.g. 200,000"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: Math.round(r * 0.6),
                          border: `1.5px solid ${c.cardBorder}`,
                          background: c.pageBg,
                          color: c.cardHeading,
                          fontFamily: `var(--font-body, ${theme.fonts.body})`,
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: c.cardBody,
                          opacity: 0.6,
                          marginBottom: 6,
                        }}
                      >
                        Employment Type
                      </label>
                      <select
                        value={financingEmployment}
                        onChange={e => setFinancingEmployment(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: Math.round(r * 0.6),
                          border: `1.5px solid ${c.cardBorder}`,
                          background: c.pageBg,
                          color: c.cardHeading,
                          fontFamily: `var(--font-body, ${theme.fonts.body})`,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <option value="employed">Employed (Formal)</option>
                        <option value="self-employed">Self-Employed</option>
                        <option value="business">Business Owner</option>
                        <option value="contractor">Contractor / Freelancer</option>
                        <option value="retired">Retired</option>
                      </select>
                    </div>

                    <button
                      style={{
                        width: '100%',
                        padding: '13px 0',
                        borderRadius: Math.round(r * 0.6),
                        border: 'none',
                        background: c.buttonBg,
                        color: c.buttonText,
                        fontFamily: `var(--font-body, ${theme.fonts.body})`,
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        marginTop: 4,
                      }}
                    >
                      Submit Application
                    </button>

                    <p style={{ margin: 0, fontSize: '0.72rem', color: c.cardBody, opacity: 0.5, textAlign: 'center' }}>
                      By submitting, you agree to KAYAD's financing partner terms. This is not a commitment to lend.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div style={{ position: 'sticky', top: 100 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Price / Bid Card */}
              <div
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: r,
                  padding: theme.sizes.cardPadding,
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: c.cardBody,
                    opacity: 0.5,
                  }}
                >
                  {isOnAuction ? (car.currentBid ? 'Current Bid' : 'Starting Bid') : 'Asking Price'}
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    color: c.cardHeading,
                  }}
                >
                  {formattedPrice}
                </p>
                {car.isNegotiable && (
                  <span style={{ fontSize: '0.75rem', color: c.cardBody, opacity: 0.5 }}>Negotiable</span>
                )}

                {/* Auction countdown */}
                {isOnAuction && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 14,
                      background: c.pageBg,
                      borderRadius: Math.round(r * 0.6),
                      border: `1px solid ${c.cardBorder}`,
                    }}
                  >
                    <p style={{ margin: '0 0 8px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.cardBody, opacity: 0.5 }}>
                      Auction Ends In
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                      {[
                        { val: countdown.days, label: 'D' },
                        { val: countdown.hours, label: 'H' },
                        { val: countdown.minutes, label: 'M' },
                        { val: countdown.seconds, label: 'S' },
                      ].map(({ val, label }) => (
                        <div key={label}>
                          <div
                            style={{
                              padding: '8px 0',
                              borderRadius: Math.round(r * 0.4),
                              background: c.cardBg,
                              border: `1px solid ${c.cardBorder}`,
                            }}
                          >
                            <span style={{ fontFamily: `var(--font-heading, ${theme.fonts.heading})`, fontWeight: 700, fontSize: '1.1rem', color: c.cardHeading }}>
                              {String(val).padStart(2, '0')}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.cardBody, opacity: 0.4, marginTop: 4, display: 'block' }}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Escrow Protection Box */}
              <div
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: r,
                  padding: theme.sizes.cardPadding,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: Math.round(r * 0.5),
                    background: `${c.cardAccent}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Shield size={18} style={{ color: c.cardAccent }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.82rem', color: c.cardHeading }}>
                    ESCROW PROTECTION
                  </p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: c.cardBody, marginTop: 2 }}>
                    Your payment is 100% secure until you confirm delivery
                  </p>
                </div>
              </div>

              {/* Contact Buttons */}
              <div
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: r,
                  padding: theme.sizes.cardPadding,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <a
                  href="tel:+254700123456"
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: Math.round(r * 0.6),
                    border: 'none',
                    background: c.buttonBg,
                    color: c.buttonText,
                    fontFamily: `var(--font-body, ${theme.fonts.body})`,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  <Phone size={15} /> Call Dealer
                </a>
                <a
                  href={`https://wa.me/254700123456?text=${encodeURIComponent(`Hi, I'm interested in the ${car.year} ${car.make} ${car.model} listed on KAYAD.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: Math.round(r * 0.6),
                    border: `1.5px solid ${c.cardAccent}`,
                    background: 'transparent',
                    color: c.cardAccent,
                    fontFamily: `var(--font-body, ${theme.fonts.body})`,
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  <MessageCircle size={15} /> Send WhatsApp
                </a>
              </div>

              {/* Dealer Info */}
              <div
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: r,
                  padding: theme.sizes.cardPadding,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: c.buttonBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: c.buttonText,
                      }}
                    >
                      {(car.dealerName ?? car.make).slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: c.cardHeading, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {car.dealerName ?? `${car.make} Premium Motors`}
                      </p>
                      {car.isVerified && (
                        <CheckCircle size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: c.cardBody, marginTop: 2 }}>
                      KAYAD Verified Dealer
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => nav('dealer-profile')}
                  style={{
                    width: '100%',
                    padding: '10px 0',
                    borderRadius: Math.round(r * 0.5),
                    border: `1px solid ${c.cardBorder}`,
                    background: 'transparent',
                    color: c.cardHeading,
                    fontFamily: `var(--font-body, ${theme.fonts.body})`,
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  View All Vehicles <ExternalLink size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIMILAR VEHICLES ── */}
      {similarCars.length > 0 && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
          <h2
            style={{
              fontFamily: `var(--font-heading, ${theme.fonts.heading})`,
              fontSize: `calc(1.4rem * ${theme.sizes.headingScale})`,
              fontWeight: 700,
              color: c.headingText,
              margin: '0 0 24px',
            }}
          >
            Similar Vehicles
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {similarCars.map((sc) => (
              <div
                key={sc.id}
                onClick={() => {
                  if (viewCar) {
                    viewCar(sc);
                  } else {
                    navigate('/car/' + sc.id);
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: r,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 24px ${c.cardAccent}15`;
                  e.currentTarget.style.borderColor = c.cardAccent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = c.cardBorder;
                }}
              >
                <div style={{ aspectRatio: '16/10', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={sc.image}
                    alt={`${sc.make} ${sc.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <div style={{ padding: 16 }}>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.cardAccent }}>
                    {sc.make}
                  </p>
                  <p style={{ margin: '4px 0 0', fontFamily: `var(--font-heading, ${theme.fonts.heading})`, fontWeight: 700, fontSize: '1rem', color: c.cardHeading }}>
                    {sc.model}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.78rem', color: c.cardBody }}>
                    <MapPin size={12} style={{ color: c.cardAccent }} />
                    {sc.city}
                  </div>
                  <p style={{ margin: '10px 0 0', fontWeight: 700, fontSize: '1.05rem', color: c.cardHeading }}>
                    KES {sc.price.toLocaleString('en-KE')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div
        style={{
          borderTop: `1px solid ${c.cardBorder}`,
          background: c.cardBg,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <button
            onClick={goBack}
            style={{
              padding: '12px 28px',
              borderRadius: Math.round(r * 0.6),
              border: `1.5px solid ${c.cardBorder}`,
              background: 'transparent',
              color: c.cardHeading,
              fontFamily: `var(--font-body, ${theme.fonts.body})`,
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ArrowLeft size={15} /> Back to Marketplace
          </button>
          <button
            onClick={() => nav('gallery')}
            style={{
              padding: '12px 28px',
              borderRadius: Math.round(r * 0.6),
              border: 'none',
              background: c.buttonBg,
              color: c.buttonText,
              fontFamily: `var(--font-body, ${theme.fonts.body})`,
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            View All Vehicles <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Keyframe for auction pulse dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
