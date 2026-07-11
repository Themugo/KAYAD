// src/pages/HomePage.tsx
// Simplified landing page matching the original KAYAD design

import { useState, useEffect, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Shield, CheckCircle, Users, Gavel, ArrowRight, Menu, X, Car, ChevronDown } from 'lucide-react';
import CarCard from '../components/CarCard';
import LazyImage from '../components/LazyImage';
import usePageMeta from '../hooks/usePageMeta';
import { carsAPI } from '../api/api';

// Nav Links
const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Gallery', to: '/browse' },
  { label: 'Auctions', to: '/auctions' },
  { label: 'Escrow Vault', to: '/escrow' },
  { label: 'Pre-Inspection', to: '/inspection' },
  { label: 'Support', to: '/support' },
];

// Trust Features
const TRUST_FEATURES = [
  {
    icon: Shield,
    title: 'Escrow Protection',
    desc: 'Funds held until safe delivery.',
  },
  {
    icon: CheckCircle,
    title: 'Pre-Inspection',
    desc: 'Independent check before purchase.',
  },
  {
    icon: Users,
    title: 'Verified Dealers',
    desc: 'All sellers vetted and approved.',
  },
  {
    icon: Gavel,
    title: 'Auctions',
    desc: 'Transparent real-time bidding.',
  },
];

// Why Choose KAYAD
const WHY_CHOOSE = [
  {
    title: 'M-Pesa Escrow',
    desc: 'Your money is protected until you safely receive your car. No scams, no risk.',
  },
  {
    title: '150-Point Inspection',
    desc: 'Certified mechanics inspect every vehicle before you commit to buying.',
  },
  {
    title: 'Verified Dealers',
    desc: 'All dealers are vetted, licensed, and rated by real buyers like you.',
  },
  {
    title: 'Live Auctions',
    desc: 'Bid on rare finds in real-time. Transparent pricing, no hidden fees.',
  },
];

// Featured Cars (static for landing page)
const FEATURED_CARS = [
  {
    id: '1',
    _id: '1',
    title: 'Toyota Hilux Double Cabin',
    year: 2021,
    price: 4200000,
    mileage: 40000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    dealer: { business_name: 'Nairobi Auto Hub Ltd' },
    image: 'https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800&q=80',
    auction_status: null,
  },
  {
    id: '2',
    _id: '2',
    title: 'Land Rover Range Rover Sport',
    year: 2020,
    price: 15000000,
    mileage: 35000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    dealer: { business_name: 'Nairobi Auto Hub Ltd' },
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
    auction_status: null,
  },
  {
    id: '3',
    _id: '3',
    title: 'Mercedes-Benz GLE 350d',
    year: 2021,
    price: 11200000,
    mileage: 22000,
    fuel: 'Diesel',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    dealer: { business_name: 'Nairobi Auto Hub Ltd' },
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
    auction_status: null,
  },
  {
    id: '4',
    _id: '4',
    title: 'Porsche Cayenne S',
    year: 2020,
    price: 13200000,
    mileage: 48000,
    fuel: 'Petrol',
    transmission: 'Automatic',
    location: { city: 'Nairobi' },
    dealer: { business_name: 'Nairobi Auto Hub Ltd' },
    image: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=800&q=80',
    auction_status: null,
  },
];

// Format price
const formatPrice = (price: number) => 
  `KES ${price.toLocaleString()}`;

// Memoized Car Card
const FeaturedCarCard = memo(function FeaturedCarCard({ car }: { car: typeof FEATURED_CARS[0] }) {
  return (
    <Link to={`/cars/${car.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#0C0C0C',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'transform 0.3s, border-color 0.3s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(212, 196, 168, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}>
        {/* Image */}
        <div style={{ position: 'relative', aspectRatio: '16/10', background: '#111' }}>
          <img
            src={car.image}
            alt={car.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '4px 10px',
            borderRadius: 20,
            background: 'rgba(34, 197, 94, 0.9)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            ESCROW
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          <p style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 4px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {car.year}
          </p>
          <h3 style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 8px',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
          }}>
            {car.title}
          </h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px' }}>
            {car.dealer.business_name}
          </p>
          <div style={{
            display: 'flex',
            gap: 12,
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 12,
          }}>
            <span>{car.mileage?.toLocaleString()} km</span>
            <span>·</span>
            <span>{car.fuel}</span>
            <span>·</span>
            <span>{car.transmission}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {formatPrice(car.price)}
          </div>
        </div>
      </div>
    </Link>
  );
});

// Navigation
function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(5, 5, 5, 0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 72,
      }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--gold)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#000',
            fontSize: 18,
          }}>
            K
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
            KAYAD
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/dealer/add-car')}
            style={{
              padding: '10px 20px',
              background: 'var(--gold)',
              color: '#000',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sell
          </button>
          <button
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8,
              fontWeight: 500,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
          
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: 8,
            }}
            className="mobile-menu-btn"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div style={{
          background: '#0A0A0A',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 24px 24px',
        }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsMenuOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                color: 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: 16,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 901px) {
          .mobile-menu-btn { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

// Hero Section
function Hero() {
  const navigate = useNavigate();

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '120px 24px 80px',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(212, 196, 168, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 50%, rgba(212, 196, 168, 0.02) 0%, transparent 50%)
        `,
      }} />

      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 20,
        background: 'rgba(212, 196, 168, 0.1)',
        border: '1px solid rgba(212, 196, 168, 0.2)',
        marginBottom: 32,
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--gold)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}>
        Pre-Inspection · 150-Point Check
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: 'clamp(40px, 8vw, 72px)',
        fontWeight: 900,
        color: '#fff',
        margin: '0 0 24px',
        fontFamily: 'var(--font-display)',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}>
        Drive with
        <span style={{ color: 'var(--gold)' }}> Trust.</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        fontSize: 'clamp(16px, 2.5vw, 20px)',
        color: 'rgba(255,255,255,0.6)',
        margin: '0 0 48px',
        maxWidth: 600,
        lineHeight: 1.6,
      }}>
        Every vehicle independently checked before you buy.
      </p>

      {/* CTA Buttons */}
      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <button
          onClick={() => navigate('/browse')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '16px 32px',
            background: 'var(--gold)',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(212, 196, 168, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Browse Cars <ArrowRight size={18} />
        </button>
        <button
          onClick={() => navigate('/dealer/add-car')}
          style={{
            padding: '16px 32px',
            background: 'transparent',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
        >
          Sell a Vehicle
        </button>
      </div>

      {/* Trust Badges */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 24,
        maxWidth: 900,
        marginTop: 80,
        paddingTop: 40,
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {TRUST_FEATURES.map((feature) => (
          <div key={feature.title} style={{ textAlign: 'center' }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'rgba(212, 196, 168, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <feature.icon size={24} color="var(--gold)" />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
              {feature.title}
            </h4>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// Featured Vehicles Section
function FeaturedVehicles() {
  return (
    <section style={{
      padding: '80px 24px',
      background: '#050505',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 40,
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 8px',
              fontFamily: 'var(--font-display)',
            }}>
              Featured Vehicles
            </h2>
            <p style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
            }}>
              Handpicked quality cars
            </p>
          </div>
          <Link
            to="/browse"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--gold)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        {/* Cars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {FEATURED_CARS.map((car) => (
            <FeaturedCarCard key={car.id} car={car} />
          ))}
        </div>

        {/* Browse All Button */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link
            to="/browse"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '14px 28px',
              background: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 14,
              transition: 'border-color 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--gold)';
              e.currentTarget.style.background = 'rgba(212, 196, 168, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Browse All Cars
          </Link>
        </div>
      </div>
    </section>
  );
}

// Why Choose Section
function WhyChoose() {
  return (
    <section style={{
      padding: '80px 24px',
      background: '#0A0A0A',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          margin: '0 0 48px',
          fontFamily: 'var(--font-display)',
        }}>
          Built for Kenya
        </h2>
        <h3 style={{
          fontSize: 20,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.8)',
          margin: '0 0 48px',
          fontFamily: 'var(--font-display)',
        }}>
          Why Choose KAYAD?
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 32,
          textAlign: 'left',
        }}>
          {WHY_CHOOSE.map((item) => (
            <div
              key={item.title}
              style={{
                padding: 24,
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h4 style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--gold)',
                margin: '0 0 12px',
              }}>
                {item.title}
              </h4>
              <p style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
                lineHeight: 1.6,
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer style={{
      padding: '60px 24px 40px',
      background: '#050505',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Footer Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 48,
          marginBottom: 48,
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                color: '#000',
                fontSize: 16,
              }}>
                K
              </div>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
                KAYAD
              </span>
            </div>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
              lineHeight: 1.6,
            }}>
              Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
            </p>
          </div>

          {/* Marketplace Links */}
          <div>
            <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Marketplace
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Browse Cars', 'Live Auctions', 'Sell Your Car', 'Escrow Vault'].map((link) => (
                <Link key={link} to="/browse" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Services Links */}
          <div>
            <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Services
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Pre-Inspection', 'Car Financing', 'Insurance', 'Become a Dealer'].map((link) => (
                <Link key={link} to="/inspection" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h5 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Company
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['About KAYAD', 'How It Works', 'Support', 'Contact'].map((link) => (
                <Link key={link} to="/support" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: 24,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <p style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
          }}>
            © 2026 KAYAD Motors Kenya Ltd. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy Policy', 'Terms of Service', 'Support'].map((link) => (
              <a key={link} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main HomePage Component
export default function HomePage() {
  usePageMeta(
    'KAYAD - Kenya\'s Premium Car Marketplace',
    'Buy, sell, and auction vehicles with M-Pesa escrow protection. Pre-inspected cars, verified dealers, and transparent pricing.'
  );

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <NavBar />
      <Hero />
      <FeaturedVehicles />
      <WhyChoose />
      <Footer />
    </div>
  );
}
