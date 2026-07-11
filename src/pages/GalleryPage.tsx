// src/pages/GalleryPage.tsx
// Simplified gallery page matching original KAYAD design

import { useState, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Filter, X, Menu, ArrowRight, ChevronDown } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

// Sample Gallery Data
const GALLERY_CARS = [
  {
    id: '1',
    title: 'Toyota Land Cruiser 300',
    year: 2022,
    price: 18500000,
    mileage: 8000,
    location: 'Nairobi',
    dealer: 'Premium Auto KE',
    image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '2',
    title: 'Land Rover Range Rover Sport',
    year: 2020,
    price: 15000000,
    mileage: 35000,
    location: 'Nairobi',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
    isEscrow: true,
    isFeatured: true,
    isAuction: false,
  },
  {
    id: '3',
    title: 'Porsche Cayenne S',
    year: 2020,
    price: null,
    mileage: 48000,
    location: 'Nairobi',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1606220838315-056192d5e927?w=800&q=80',
    isEscrow: true,
    isFeatured: true,
    isAuction: true,
  },
  {
    id: '4',
    title: 'Mercedes-Benz GLE 350d',
    year: 2021,
    price: 11200000,
    mileage: 22000,
    location: 'Nairobi',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
    isEscrow: true,
    isFeatured: true,
    isAuction: false,
  },
  {
    id: '5',
    title: 'Audi Q7 3.0 TDI',
    year: 2020,
    price: 9400000,
    mileage: 41000,
    location: 'Nairobi',
    dealer: 'Premium Auto KE',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '6',
    title: 'BMW X5 xDrive30d',
    year: 2021,
    price: 7500000,
    mileage: 32000,
    location: 'Nairobi',
    dealer: 'Highland Cars',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '7',
    title: 'Toyota Hilux Double Cabin',
    year: 2021,
    price: 4200000,
    mileage: 40000,
    location: 'Nairobi',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800&q=80',
    isEscrow: true,
    isFeatured: true,
    isAuction: false,
  },
  {
    id: '8',
    title: 'Volkswagen Tiguan R-Line',
    year: 2021,
    price: 4800000,
    mileage: 19000,
    location: 'Nairobi',
    dealer: 'Premium Auto KE',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '9',
    title: 'Toyota Prado TXL',
    year: 2019,
    price: 6900000,
    mileage: 55000,
    location: 'Kisumu',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1621993202323-f438eec934ff?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '10',
    title: 'Mazda CX-5',
    year: 2023,
    price: 4200000,
    mileage: 12000,
    location: 'Nairobi',
    dealer: 'Nairobi Auto Hub Ltd',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '11',
    title: 'Honda Vezel Hybrid',
    year: 2020,
    price: 2800000,
    mileage: 28000,
    location: 'Mombasa',
    dealer: 'Mombasa Motors',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
  {
    id: '12',
    title: 'Subaru Forester XT',
    year: 2019,
    price: 3200000,
    mileage: 62000,
    location: 'Eldoret',
    dealer: 'Highland Cars',
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
    isEscrow: true,
    isFeatured: false,
    isAuction: false,
  },
];

const BRANDS = ['Toyota', 'Land Rover', 'Porsche', 'Mercedes-Benz', 'Audi', 'BMW', 'Volkswagen', 'Mazda', 'Honda', 'Subaru'];
const BODY_TYPES = ['SUV', 'Sedan', 'Hatchback', 'Pickup', 'Coupe'];
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const CITIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika'];
const CATEGORIES = [
  { id: 'all', label: 'All Vehicles', count: 12 },
  { id: 'auctions', label: 'Live Auctions', count: 1 },
  { id: 'direct', label: 'Direct Buy', count: 11 },
];

// Format price
const formatPrice = (price: number | null) => 
  price ? `KES ${price.toLocaleString()}` : null;

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
          {['Home', 'Gallery', 'Auctions', 'Escrow Vault', 'Pre-Inspection', 'Support'].map((item) => (
            <Link
              key={item}
              to={item === 'Home' ? '/' : item === 'Gallery' ? '/gallery' : `/${item.toLowerCase().replace(' ', '-')}`}
              style={{
                color: item === 'Gallery' ? '#fff' : 'rgba(255,255,255,0.7)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {item}
            </Link>
          ))}
        </div>

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

      {isMenuOpen && (
        <div style={{
          background: '#0A0A0A',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 24px 24px',
        }}>
          {['Home', 'Gallery', 'Auctions', 'Escrow Vault', 'Pre-Inspection', 'Support'].map((item) => (
            <Link
              key={item}
              to={item === 'Home' ? '/' : `/${item.toLowerCase().replace(' ', '-')}`}
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
              {item}
            </Link>
          ))}
        </div>
      )}

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

// Filter Sidebar
function FilterSidebar({ 
  selectedCategory, 
  onCategoryChange,
  filters,
  onFilterChange,
  isOpen,
  onClose 
}: {
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  filters: {
    brand: string;
    bodyType: string;
    fuel: string;
    city: string;
    maxPrice: number;
  };
  onFilterChange: (key: string, value: any) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    bodyType: true,
    fuel: true,
    city: true,
    maxPrice: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside style={{
      width: 280,
      flexShrink: 0,
      background: '#0C0C0C',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.06)',
      padding: 20,
      height: 'fit-content',
      position: 'sticky',
      top: 96,
    }}
    className="filter-sidebar"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Refine</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            padding: 4,
            display: 'none',
          }}
          className="filter-close-btn"
        >
          <X size={20} />
        </button>
      </div>

      {/* Category Section */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('category')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Category
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.category ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.category && (
          <div style={{ paddingTop: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 12px',
                  marginBottom: 4,
                  background: selectedCategory === cat.id ? 'rgba(212, 196, 168, 0.1)' : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: selectedCategory === cat.id ? 'var(--gold)' : 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  textAlign: 'left',
                }}
              >
                <span>{cat.label}</span>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{cat.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Brand Filter */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('brand')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Brand
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.brand ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.brand && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
            {BRANDS.map((brand) => (
              <button
                key={brand}
                onClick={() => onFilterChange('brand', filters.brand === brand ? '' : brand)}
                style={{
                  padding: '6px 12px',
                  background: filters.brand === brand ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: filters.brand === brand ? '#000' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {brand}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body Type */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('bodyType')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Body Type
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.bodyType ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.bodyType && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
            {BODY_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => onFilterChange('bodyType', filters.bodyType === type ? '' : type)}
                style={{
                  padding: '6px 12px',
                  background: filters.bodyType === type ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: filters.bodyType === type ? '#000' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fuel */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('fuel')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Fuel
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.fuel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.fuel && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
            {FUELS.map((fuel) => (
              <button
                key={fuel}
                onClick={() => onFilterChange('fuel', filters.fuel === fuel ? '' : fuel)}
                style={{
                  padding: '6px 12px',
                  background: filters.fuel === fuel ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: filters.fuel === fuel ? '#000' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {fuel}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => toggleSection('city')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          City
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.city ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.city && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 8 }}>
            {CITIES.map((city) => (
              <button
                key={city}
                onClick={() => onFilterChange('city', filters.city === city ? '' : city)}
                style={{
                  padding: '6px 12px',
                  background: filters.city === city ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 20,
                  cursor: 'pointer',
                  color: filters.city === city ? '#000' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Max Price */}
      <div>
        <button
          onClick={() => toggleSection('maxPrice')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Max Price
          <ChevronDown 
            size={16} 
            style={{ transform: expandedSections.maxPrice ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} 
          />
        </button>
        {expandedSections.maxPrice && (
          <div style={{ paddingTop: 8 }}>
            <input
              type="range"
              min="0"
              max="20000000"
              step="500000"
              value={filters.maxPrice}
              onChange={(e) => onFilterChange('maxPrice', parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: 'var(--gold)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              <span>0</span>
              <span style={{ color: 'var(--gold)' }}>{formatPrice(filters.maxPrice)}</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .filter-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0;
            bottom: 0;
            width: 320px !important;
            z-index: 200;
            border-radius: 0 !important;
            transform: translateX(${isOpen ? '0' : '-100%'});
            transition: transform 0.3s ease;
            overflow-y: auto;
          }
          .filter-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </aside>
  );
}

// Car Card Component
const GalleryCarCard = memo(function GalleryCarCard({ car }: { car: typeof GALLERY_CARS[0] }) {
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
          
          {/* Badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {car.isEscrow && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(34, 197, 94, 0.9)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>
                ESCROW
              </span>
            )}
            {car.isFeatured && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(212, 196, 168, 0.9)',
                color: '#000',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>
                Featured
              </span>
            )}
            {car.isAuction && (
              <span style={{
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(239, 68, 68, 0.9)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}>
                Auction
              </span>
            )}
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
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            margin: '0 0 4px',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {car.title} {car.year}
          </h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px' }}>
            {car.dealer}
          </p>
          <div style={{
            display: 'flex',
            gap: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            marginBottom: 12,
          }}>
            <span>{car.mileage.toLocaleString()} km</span>
            <span>·</span>
            <span>{car.location}</span>
          </div>
          {car.price ? (
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              {formatPrice(car.price)}
            </div>
          ) : (
            <div style={{ 
              fontSize: 12, 
              fontWeight: 600, 
              color: 'rgba(239, 68, 68, 0.9)', 
              fontFamily: 'var(--font-display)',
            }}>
              VIEW AUCTION
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

// Main Gallery Page
export default function GalleryPage() {
  usePageMeta(
    'Gallery - KAYAD Kenya\'s Premium Automotive Gallery',
    'Browse curated vehicle listings with transparent pricing and escrow-backed transactions.'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filters, setFilters] = useState({
    brand: '',
    bodyType: '',
    fuel: '',
    city: '',
    maxPrice: 20000000,
  });
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter cars
  const filteredCars = useMemo(() => {
    return GALLERY_CARS.filter(car => {
      // Category filter
      if (selectedCategory === 'auctions' && !car.isAuction) return false;
      if (selectedCategory === 'direct' && car.isAuction) return false;
      
      // Search filter
      if (searchQuery && !car.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Brand filter
      if (filters.brand && !car.title.includes(filters.brand)) return false;
      
      // Price filter
      if (filters.maxPrice && car.price && car.price > filters.maxPrice) return false;
      
      return true;
    });
  }, [selectedCategory, searchQuery, filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div style={{ background: '#050505', minHeight: '100vh', paddingTop: 72 }}>
      <NavBar />

      {/* Hero Section */}
      <section style={{
        padding: '60px 24px 40px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #050505 100%)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)',
            fontWeight: 700,
            color: '#fff',
            margin: '0 0 12px',
            fontFamily: 'var(--font-display)',
          }}>
            Kenya's Premium Automotive Gallery
          </h1>
          <p style={{
            fontSize: 16,
            color: 'rgba(255,255,255,0.6)',
            margin: '0 0 32px',
          }}>
            The Gallery · Curated listings, transparent pricing, escrow-backed transactions.
          </p>

          {/* Search Bar */}
          <div style={{
            maxWidth: 600,
            margin: '0 auto',
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <div style={{
              flex: 1,
              minWidth: 280,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 20px',
              background: '#0C0C0C',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
            }}>
              <Search size={20} color="rgba(255,255,255,0.5)" />
              <input
                type="text"
                placeholder="Search make, model, keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#fff',
                  fontSize: 15,
                }}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            marginTop: 32,
            flexWrap: 'wrap',
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'direct', label: 'Buy Now' },
              { id: 'auctions', label: 'Auctions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                style={{
                  padding: '10px 24px',
                  background: selectedCategory === tab.id ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 24,
                  cursor: 'pointer',
                  color: selectedCategory === tab.id ? '#000' : 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: '40px 24px 80px' }}>
        <div style={{ 
          maxWidth: 1400, 
          margin: '0 auto',
          display: 'flex',
          gap: 32,
        }}>
          {/* Filter Sidebar */}
          <FilterSidebar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            filters={filters}
            onFilterChange={handleFilterChange}
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
          />

          {/* Vehicle Grid */}
          <div style={{ flex: 1 }}>
            {/* Results Count & Filter Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <p style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.6)',
                margin: 0,
              }}>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{filteredCars.length}</span> vehicles
              </p>
              <button
                onClick={() => setFilterOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 500,
                }}
                className="filter-toggle-btn"
              >
                <Filter size={16} />
                Filters
              </button>
            </div>

            {/* Cars Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}>
              {filteredCars.map((car) => (
                <GalleryCarCard key={car.id} car={car} />
              ))}
            </div>

            {/* Empty State */}
            {filteredCars.length === 0 && (
              <div style={{
                padding: 60,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
              }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>No vehicles found</p>
                <p style={{ fontSize: 14 }}>Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '40px 24px',
        background: '#0A0A0A',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#000',
              fontSize: 14,
            }}>
              K
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>KAYAD</span>
          </div>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 24px',
            maxWidth: 400,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Kenya's premium car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap', marginBottom: 24 }}>
            <Link to="/browse" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Browse Cars</Link>
            <Link to="/auctions" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Live Auctions</Link>
            <Link to="/escrow" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Escrow Vault</Link>
            <Link to="/support" style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>Support</Link>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            © 2026 KAYAD Motors Kenya Ltd. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .filter-toggle-btn { display: flex !important; }
        }
        @media (min-width: 901px) {
          .filter-toggle-btn { display: none !important; }
          .filter-sidebar { display: block !important; }
        }
      `}</style>
    </div>
  );
}
