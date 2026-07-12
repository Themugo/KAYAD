import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, BRANDS, TESTIMONIALS, MOCK_CARS } from '../api/api';
import CarCard from '../components/CarCard';
import { Button, Badge, Accordion, StatCard } from '../components/ui';

const TRUST_STATS = [
  { icon: '🚗', iconVariant: 'gold',  label: 'Vehicles Listed',  value: '12,000+' },
  { icon: '🤝', iconVariant: 'green', label: 'Successful Sales', value: '8,500+' },
  { icon: '🏪', iconVariant: 'blue',  label: 'Verified Dealers',  value: '450+' },
  { icon: '🔒', iconVariant: 'gold',  label: 'Escrow Protected',   value: '100%' },
];

const FAQ_ITEMS = [
  { q: 'How does M-Pesa escrow protect me?', a: 'Your payment is held securely in escrow until you confirm receipt of the vehicle. If anything goes wrong, you get a full refund within 3 business days.' },
  { q: 'How do I list my car for sale?', a: 'Register as a dealer or private seller, click "Sell", fill in the listing form with photos and details, and submit for approval. Approved listings appear within 24 hours.' },
  { q: 'What is a Pre-Inspection?', a: 'A certified mechanic physically checks the vehicle before you buy — verifying mileage, condition, and flagging any hidden issues. Costs KES 1,500–6,500.' },
  { q: 'How do Live Auctions work?', a: 'Dealers list vehicles with a starting bid. Registered buyers place bids in real-time. A 5% M-Pesa commitment deposit secures each bid. The highest bidder wins when time expires.' },
  { q: 'Can I negotiate the price?', a: 'Yes — use the Message Dealer feature to contact sellers directly. Many listings are open to negotiation, especially on non-auction vehicles.' },
  { q: 'How do I become a verified dealer?', a: 'Register with your business name and KRA PIN, upload your dealer certificate, and our team reviews your application within 48 hours.' },
];

const FINANCING_FEATURES = [
  { icon: '💳', title: 'Flexible Terms', desc: '12–72 month repayment plans tailored to your budget' },
  { icon: '⚡', title: 'Instant Approval', desc: 'Get pre-approved in minutes via M-Pesa statement' },
  { icon: '📊', title: 'Transparent Rates', desc: 'No hidden fees. Fixed interest rates from 14% p.a.' },
  { icon: '🔒', title: 'Secured by Escrow', desc: 'Your down payment is protected until car handover' },
];

// Fallback hero slides for when API hasn't loaded
const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Toyota Land Cruiser V8',
    sub: '2021 · Diesel · Nairobi',
    price: 'KES 3.2M',
    badge: 'Featured',
    badgeVariant: 'gold'
  },
  {
    id: 2,
    image: 'https://images.pexels.com/photos/1805053/pexels-photo-1805053.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'Mercedes-Benz GLE 350d',
    sub: 'Live Auction · Ends in 2h',
    price: 'KES 11.2M',
    badge: 'Live Auction',
    badgeVariant: 'live'
  },
  {
    id: 3,
    image: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=1600',
    headline: 'BMW X5 M Sport',
    sub: '2020 · Petrol · Mombasa',
    price: 'KES 4.1M',
    badge: 'Featured',
    badgeVariant: 'gold'
  },
];

export default function HomePage() {
  const [current, setCurrent] = useState(0);
  const [cars, setCars] = useState(MOCK_CARS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState({ brand: '', bodyType: '', priceMax: '' });
  const [heroHovered, setHeroHovered] = useState(false);

  // Fetch cars for both display and hero slider
  useEffect(() => {
    let mounted = true;
    let timeoutId = setTimeout(() => {
      setCars(MOCK_CARS);
      setLoading(false);
    }, 2000);
    
    (async () => {
      try {
        const data = await carsAPI.list({ limit: 50 });
        if (mounted && data.cars?.length > 0) {
          clearTimeout(timeoutId);
          setCars(data.cars);
        }
      } catch { /* fallback to mock */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; clearTimeout(timeoutId); };
  }, []);

  // Create dynamic hero slides from featured/auction cars
  const SLIDES = useMemo(() => {
    // Get featured and auction cars for the hero slider
    const sliderCars = cars
      .filter(c => c.featured || c.is_promoted || c.isAuction || c.auction_status === 'live')
      .slice(0, 5);
    
    // Fallback to first 5 cars if no featured/auction
    const sourceCars = sliderCars.length >= 3 ? sliderCars : cars.slice(0, 5);
    
    return sourceCars.map((car, index) => ({
      id: car.id || index,
      image: car.images?.[0] || car.image || HERO_SLIDES[index % HERO_SLIDES.length].image,
      headline: car.title || car.name,
      sub: car.year ? `${car.year} · ${car.fuel || car.fuelType || 'Petrol'} · ${car.location || 'Nairobi'}` : car.location || 'Nairobi',
      price: car.price ? `KES ${(car.price / 1000000).toFixed(1)}M` : (car.currentBid ? `KES ${(car.currentBid / 1000000).toFixed(1)}M` : ''),
      badge: car.isAuction || car.auction_status === 'live' ? 'Live Auction' : (car.featured ? 'Featured' : 'Hot Deal'),
      badgeVariant: car.isAuction || car.auction_status === 'live' ? 'live' : 'gold',
      carId: car.id,
    }));
  }, [cars]);

  // Fallback slides if API hasn't loaded yet
  const fallbackSlides = useMemo(() => HERO_SLIDES, []);
  const activeSlides = SLIDES.length >= 3 ? SLIDES : fallbackSlides;

  useEffect(() => {
    if (heroHovered) return;
    const t = setInterval(() => setCurrent(p => (p + 1) % activeSlides.length), 6000);
    return () => clearInterval(t);
  }, [activeSlides.length, heroHovered]);

  const liveAuctions = cars.filter(c => c.isAuction || c.auction_status === 'live');
  const featuredCars = cars.filter(c => c.featured || c.is_promoted).slice(0, 8);
  const recentCars = cars.slice(0, 8);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.brand) params.set('brand', search.brand);
    if (search.bodyType) params.set('bodyType', search.bodyType);
    if (search.priceMax) params.set('priceMax', search.priceMax);
    window.location.href = `/browse?${params.toString()}`;
  }, [search]);

  return (
    <div className="page" style={{ paddingTop: 0 }}>
      {/* ═══════════════════════════════════════════════════
          HERO SECTION - REDESIGNED
          ═══════════════════════════════════════════════════ */}
      <section 
        className="hero-section" 
        aria-label="Featured vehicles"
        onMouseEnter={() => setHeroHovered(true)}
        onMouseLeave={() => setHeroHovered(false)}
        style={{ 
          minHeight: '85vh',
          position: 'relative',
          overflow: 'hidden',
          background: '#050505'
        }}
      >
        {/* Background Images with Ken Burns Effect */}
        {activeSlides.map((slide, i) => (
          <div
            key={slide.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: i === current ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: i === current && !heroHovered ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 8s ease-out',
              }}
            />
            {/* Gradient Overlays */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(5,5,5,0.85) 0%, rgba(5,5,5,0.4) 50%, rgba(5,5,5,0.6) 100%)',
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 30% 50%, transparent 0%, rgba(5,5,5,0.8) 70%)',
            }} />
          </div>
        ))}

        {/* Animated Accent Lines */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200, 150, 42, 0.3), transparent)',
          animation: 'pulse-line 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '30%',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(200, 150, 42, 0.2), transparent)',
          animation: 'pulse-line 4s ease-in-out infinite 2s',
        }} />

        {/* Main Content */}
        <div className="hero-content" style={{
          position: 'relative',
          zIndex: 10,
          minHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            background: 'rgba(200, 150, 42, 0.15)',
            border: '1px solid rgba(200, 150, 42, 0.3)',
            borderRadius: 50,
            marginBottom: 32,
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#c8962a',
              animation: 'pulse-dot 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#c8962a',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              EAST AFRICA'S TRUSTED CAR MARKETPLACE
            </span>
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.1,
            marginBottom: 24,
            textShadow: '0 4px 30px rgba(0,0,0,0.5)',
            maxWidth: 900,
          }}>
            Drive Your
            <span style={{
              display: 'block',
              background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 50%, #c8962a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Dream Today
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.25rem)',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 600,
            marginBottom: 48,
            lineHeight: 1.7,
          }}>
            Buy, sell and auction vehicles with confidence.
          </p>

          {/* Search Box */}
          <form 
            onSubmit={handleSearch} 
            style={{
              display: 'flex',
              gap: 12,
              background: 'rgba(13, 21, 32, 0.9)',
              backdropFilter: 'blur(20px)',
              padding: 12,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 800,
              width: '100%',
              flexWrap: 'wrap',
              justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <select 
              className="ui-input ui-select" 
              style={{ flex: '1 1 180px', minWidth: 150, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              value={search.brand} 
              onChange={e => setSearch(p => ({ ...p, brand: e.target.value }))} 
              aria-label="Brand"
            >
              <option value="" style={{ background: '#0d1520' }}>All Brands</option>
              {BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
            </select>
            <select 
              className="ui-input ui-select" 
              style={{ flex: '1 1 160px', minWidth: 130, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              value={search.bodyType} 
              onChange={e => setSearch(p => ({ ...p, bodyType: e.target.value }))} 
              aria-label="Body type"
            >
              <option value="" style={{ background: '#0d1520' }}>All Types</option>
              <option value="SUV" style={{ background: '#0d1520' }}>SUV</option>
              <option value="Sedan" style={{ background: '#0d1520' }}>Sedan</option>
              <option value="Pickup" style={{ background: '#0d1520' }}>Pickup</option>
              <option value="Coupe" style={{ background: '#0d1520' }}>Coupe</option>
            </select>
            <select 
              className="ui-input ui-select" 
              style={{ flex: '1 1 160px', minWidth: 130, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              value={search.priceMax} 
              onChange={e => setSearch(p => ({ ...p, priceMax: e.target.value }))} 
              aria-label="Max price"
            >
              <option value="" style={{ background: '#0d1520' }}>Any Price</option>
              <option value="3000000" style={{ background: '#0d1520' }}>Under 3M</option>
              <option value="5000000" style={{ background: '#0d1520' }}>Under 5M</option>
              <option value="10000000" style={{ background: '#0d1520' }}>Under 10M</option>
              <option value="20000000" style={{ background: '#0d1520' }}>Under 20M</option>
            </select>
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              icon="🔍"
              style={{
                background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 100%)',
                border: 'none',
                boxShadow: '0 4px 20px rgba(200, 150, 42, 0.4)',
              }}
            >
              Search
            </Button>
          </form>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 32,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <Link to="/browse">
              <Button 
                variant="primary" 
                size="lg"
                icon="🚗"
                style={{
                  background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 100%)',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(200, 150, 42, 0.4)',
                  color: '#0a0a0a',
                  fontWeight: 700,
                  minHeight: 48,
                  padding: '12px 28px',
                  borderRadius: 10,
                }}
              >
                Browse Cars →
              </Button>
            </Link>
            <Link to="/register?role=broker">
              <Button 
                variant="outline" 
                size="lg"
                icon="💰"
                style={{
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: 'rgba(255,255,255,0.9)',
                  background: 'rgba(255,255,255,0.05)',
                  minHeight: 48,
                  padding: '12px 28px',
                  borderRadius: 10,
                }}
              >
                Sell a Vehicle
              </Button>
            </Link>
          </div>

          {/* Trust Features Cards */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 40,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 1000,
          }}>
            {[
              { icon: '🔒', title: 'Escrow Protection', desc: 'Funds held until safe delivery' },
              { icon: '🔍', title: 'Pre-Inspection', desc: 'Independent check before purchase' },
              { icon: '✓', title: 'Verified Dealers', desc: 'All sellers vetted and approved' },
              { icon: '🏷️', title: 'Auctions', desc: 'Transparent real-time bidding' },
            ].map((feature, i) => (
              <div key={feature.title} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 20px',
                background: 'rgba(200, 150, 42, 0.08)',
                border: '1px solid rgba(200, 150, 42, 0.2)',
                borderRadius: 12,
                backdropFilter: 'blur(10px)',
                animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both`,
                minWidth: 200,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(200, 150, 42, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}>
                  {feature.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    lineHeight: 1.3,
                  }}>
                    {feature.title}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.6)',
                    marginTop: 2,
                  }}>
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'flex',
            gap: 48,
            marginTop: 56,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {[
              { val: '12K+', label: 'Vehicles', icon: '🚗' },
              { val: '450+', label: 'Verified Dealers', icon: '🏪' },
              { val: '100%', label: 'Escrow Protected', icon: '🔒' },
              { val: '8.5K+', label: 'Successful Sales', icon: '🤝' },
            ].map((s, i) => (
              <div key={s.label} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: `fadeInUp 0.6s ease-out ${i * 0.1}s both`,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(200, 150, 42, 0.1)',
                  border: '1px solid rgba(200, 150, 42, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {s.icon}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#c8962a',
                    lineHeight: 1,
                  }}>
                    {s.val}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.6)',
                    marginTop: 4,
                  }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Car Preview */}
          <div style={{
            marginTop: 48,
            maxWidth: 1000,
            width: '100%',
          }}>
            <div style={{
              display: 'flex',
              gap: 16,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              {activeSlides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrent(i)}
                  style={{
                    padding: 0,
                    background: i === current ? 'rgba(200, 150, 42, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: i === current ? '2px solid #c8962a' : '2px solid transparent',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    width: 280,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, padding: 12 }}>
                    <div style={{
                      width: 80,
                      height: 60,
                      borderRadius: 8,
                      backgroundImage: `url(${slide.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {slide.headline}
                      </div>
                      <div style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 2,
                      }}>
                        {slide.sub}
                      </div>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#c8962a',
                        marginTop: 4,
                      }}>
                        {slide.price}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Slide Indicators */}
          <div style={{
            display: 'flex',
            gap: 8,
            marginTop: 32,
          }}>
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  width: i === current ? 32 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === current ? '#c8962a' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 40,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <Link 
              to="/browse"
              style={{
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 600,
                color: '#0d1520',
                background: 'linear-gradient(135deg, #c8962a 0%, #f4c430 100%)',
                borderRadius: 12,
                textDecoration: 'none',
                boxShadow: '0 8px 30px rgba(200, 150, 42, 0.4)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(200, 150, 42, 0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(200, 150, 42, 0.4)';
              }}
            >
              🚗 Browse Cars
            </Link>
            <Link 
              to="/auctions"
              style={{
                padding: '14px 32px',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 12,
                textDecoration: 'none',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
              }}
            >
              ⚡ Live Auctions
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          color: 'rgba(255,255,255,0.5)',
          animation: 'bounce 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 12 }}>Scroll to explore</span>
          <div style={{
            width: 24,
            height: 40,
            border: '2px solid rgba(255,255,255,0.3)',
            borderRadius: 12,
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 8,
          }}>
            <div style={{
              width: 4,
              height: 8,
              background: '#c8962a',
              borderRadius: 2,
              animation: 'scroll-dot 2s ease-in-out infinite',
            }} />
          </div>
        </div>

        <style>{`
          @keyframes pulse-line {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-10px); }
          }
          @keyframes scroll-dot {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(10px); opacity: 0.3; }
          }
        `}</style>
      </section>

      {/* ═══════════════════════════════════════════════════
          BRAND BAR
          ═══════════════════════════════════════════════════ */}
      <section className="section-compact" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }} aria-label="Browse by brand">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted Brands</div>
            <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Browse by Brand</h2>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {BRANDS.map(brand => (
              <Link key={brand.name} to={`/browse?brand=${brand.name}`} className="brand-link">
                <span className="brand-link__icon">{brand.logo}</span>
                <span className="brand-link__name">{brand.name}</span>
                <span className="brand-link__count">{brand.count} listings</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          LIVE AUCTIONS
          ═══════════════════════════════════════════════════ */}
      {liveAuctions.length > 0 && (
        <section className="section" aria-label="Live auctions">
          <div className="container">
            <div className="section-header">
              <div>
                <div className="section-eyebrow live"><span className="live-dot" /> Live Now</div>
                <h2 className="section-title">Live Auctions</h2>
              </div>
              <Link to="/auctions"><Button variant="outline" size="sm">View All →</Button></Link>
            </div>
            <div className="car-grid">
              {liveAuctions.slice(0, 4).map(car => <CarCard key={car._id || car.id} car={car} />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════
          FEATURED VEHICLES
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Featured vehicles">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Handpicked Selection</div>
              <h2 className="section-title">Featured Vehicles</h2>
            </div>
            <Link to="/browse"><Button variant="outline" size="sm">Browse All →</Button></Link>
          </div>
          {loading ? (
            <div className="car-grid">
              {[...Array(8)].map((_, i) => <div key={i} className="skeleton-card" />)}
            </div>
          ) : (
            <div className="car-grid">
              {featuredCars.map(car => <CarCard key={car._id || car.id} car={car} />)}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TRUST STATISTICS
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Trust statistics">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Built on Trust</div>
            <h2 className="section-title">Numbers That Matter</h2>
          </div>
          <div className="ui-grid-4">
            {TRUST_STATS.map(s => (
              <StatCard key={s.label} icon={s.icon} iconVariant={s.iconVariant} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          ESCROW EXPLANATION
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Escrow protection">
        <div className="container">
          <div className="escrow-grid">
            <div>
              <div className="section-eyebrow">Secure Transactions</div>
              <h2 className="section-title">Every Payment Protected by M-Pesa Escrow</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                Your money is never sent directly to the seller. It's held securely in escrow until you confirm you've received the vehicle and you're satisfied. If anything goes wrong, you get a full refund.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { icon: '💳', step: '1', title: 'You Pay via M-Pesa',     desc: 'Full amount sent to escrow, not to seller' },
                  { icon: '🔒', step: '2', title: 'Funds Held Securely',    desc: 'Admin holds payment until car handover' },
                  { icon: '🚗', step: '3', title: 'Car Delivered & Checked', desc: 'You inspect and confirm the vehicle' },
                  { icon: '✅', step: '4', title: 'Funds Released',          desc: 'Seller gets paid only after your approval' },
                ].map(s => (
                  <div key={s.step} className="escrow-step">
                    <div className="escrow-step__icon">{s.icon}</div>
                    <div>
                      <div className="escrow-step__title">{s.title}</div>
                      <div className="escrow-step__desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/escrow"><Button variant="primary" style={{ marginTop: 24 }}>Learn More →</Button></Link>
            </div>
            <div className="ui-card ui-card--premium" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🔒</div>
              <h3 style={{ marginBottom: 8 }}>100% Escrow Protected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                Every transaction on KAYAD is backed by our M-Pesa escrow guarantee.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
                {['Buyer protection guarantee', 'Full refund if car not delivered', 'Admin-monitored transactions', 'Dispute resolution within 48h'].map(b => (
                  <div key={b} className="trust-feature">
                    <span className="trust-feature__check">✓</span> {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FINANCING
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Financing options">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Flexible Financing</div>
            <h2 className="section-title">Drive Now, Pay Later</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto 0' }}>
              Partner with Kenya's leading banks for competitive auto loans. Get pre-approved in minutes.
            </p>
          </div>
          <div className="finance-grid">
            {FINANCING_FEATURES.map(f => (
              <div key={f.title} className="ui-card" style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: 8 }}>{f.title}</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          VERIFIED INSPECTION PARTNERS
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Verified inspection partners">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted Partners</div>
            <h2 className="section-title">Verified Inspection Partners</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '8px auto 0' }}>
              Every vehicle can be inspected by our certified mechanics before you buy.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { name: 'AutoCheck KE',   logo: '🔍', rating: 4.8 },
              { name: 'CarInspect EA',   logo: '🔧', rating: 4.7 },
              { name: 'Verify Motors',   logo: '✅', rating: 4.9 },
              { name: 'AA Kenya',        logo: '🚗', rating: 4.6 },
            ].map(p => (
              <div key={p.name} className="ui-card ui-card--hover" style={{ padding: 24, textAlign: 'center', minWidth: 170 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>{p.logo}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--gold-400)', marginTop: 4 }}>★ {p.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          PREMIUM DEALERS
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Premium dealers">
        <div className="container">
          <div className="section-header">
            <div>
              <div className="section-eyebrow">Trusted Partners</div>
              <h2 className="section-title">Premium Dealers</h2>
            </div>
            <Link to="/register?role=dealer"><Button variant="outline" size="sm">Become a Dealer →</Button></Link>
          </div>
          <div className="ui-grid-4">
            {[
              { name: 'Nairobi Auto Hub',   location: 'Nairobi',   rating: 4.8, count: 42, logo: '🏪' },
              { name: 'Mombasa Motors',      location: 'Mombasa',   rating: 4.6, count: 28, logo: '🚙' },
              { name: 'Highland Cars',       location: 'Eldoret',   rating: 4.9, count: 35, logo: '🏎️' },
              { name: 'Premium Auto KE',     location: 'Nairobi',   rating: 4.7, count: 51, logo: '🚗' },
            ].map(d => (
              <div key={d.name} className="premium-card premium-card--dealer">
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'var(--gold-100)', border: '2px solid rgba(200,150,42,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, margin: '0 auto 14px',
                }}>{d.logo}</div>
                <h4 style={{ fontSize: 14, marginBottom: 4 }}>{d.name}</h4>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>📍 {d.location}</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12, marginBottom: 12 }}>
                  <span style={{ color: 'var(--gold-400)' }}>★ {d.rating}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{d.count} cars</span>
                </div>
                <Badge variant="verified" icon="✓">Verified Dealer</Badge>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          TESTIMONIALS
          ═══════════════════════════════════════════════════ */}
      <section className="section section-alt" aria-label="Customer testimonials">
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Trusted by Thousands</div>
            <h2 className="section-title">What Our Customers Say</h2>
          </div>
          <div className="ui-grid-3">
            {TESTIMONIALS.map(t => (
              <div key={t.id} className="testimonial-card">
                <div style={{ marginBottom: 14 }} aria-label={`${t.rating} out of 5 stars`}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < t.rating ? 'var(--gold-400)' : 'var(--text-muted)', fontSize: 17 }}>
                      {i < t.rating ? '★' : '☆'}
                    </span>
                  ))}
                </div>
                <blockquote style={{
                  fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7,
                  marginBottom: 18, fontStyle: 'italic',
                }}>"{t.text}"</blockquote>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="ui-avatar ui-avatar--sm ui-avatar--gold" style={{ width: 42, height: 42, fontSize: 15 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.location}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Frequently asked questions">
        <div className="container" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Got Questions?</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <Accordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          CTA
          ═══════════════════════════════════════════════════ */}
      <section className="cta-section" aria-label="Call to action">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: 16 }}>
            Ready to Buy or Sell?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 520, margin: '0 auto 32px' }}>
            Join thousands of Kenyans on the most trusted marketplace. Buy with escrow protection or sell in minutes with confidence.
          </p>
          <div className="cta-dual" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/browse"><Button variant="primary" size="lg" icon="🚗">Find Your Dream Car</Button></Link>
            <Link to="/register?role=broker"><Button variant="outline" size="lg" icon="💰">List Your Car for Sale</Button></Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════ */}
      <footer className="premium-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <Link to="/" className="footer-logo">
                <span style={{ fontSize: 22 }}>🚗</span>
                KAYAD
              </Link>
              <p className="footer-desc">
                Kenya's premier car marketplace. Buy, sell, and auction vehicles with M-Pesa escrow protection.
              </p>
              <div className="footer-social">
                {['📘', '🐦', '📸', '💬'].map((icon, i) => (
                  <a key={i} href="#" className="footer-social__icon" aria-label={`Social media ${i + 1}`}>{icon}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Browse', links: [['All Cars', '/browse'], ['Live Auctions', '/auctions'], ['Featured', '/browse'], ['By Brand', '/browse']] },
              { title: 'Services', links: [['Escrow', '/escrow'], ['Pre-Inspection', '/inspection'], ['Financing', '/support'], ['Support', '/support']] },
              { title: 'Account', links: [['Sign In', '/login'], ['Register', '/register'], ['Become Dealer', '/register?role=dealer'], ['My Profile', '/profile']] },
              { title: 'Company', links: [['About Us', '/support'], ['Contact', '/support'], ['Privacy', '/support'], ['Terms', '/support']] },
            ].map(col => (
              <div key={col.title}>
                <div className="footer-col-title">{col.title}</div>
                {col.links.map(([label, to]) => (
                  <Link key={label} to={to} className="footer-link">{label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <span>© 2026 KAYAD Motors. All rights reserved.</span>
            <span>Made in Kenya 🇰🇪</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
