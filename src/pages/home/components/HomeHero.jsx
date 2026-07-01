import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';
import { carsAPI } from '../../../api/api';

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1920&q=80',
];

const TRUST_INDICATORS = [
  'Escrow Protected',
  '150-Point Inspection',
  'Verified Dealers',
];

export default function HomeHero({ liveCount, isAuth, user }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState(FALLBACK_IMAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHeroImages = async () => {
      try {
        const data = await carsAPI.list({ page: 1, limit: 10, sort: '-createdAt' });
        const cars = data.cars || data.data || [];
        const withImages = cars
          .filter(c => c.images && c.images.length > 0 && c.images[0])
          .map(c => { const img = c.images[0]; return typeof img === 'string' ? img : img?.url; })
          .filter(Boolean);
        if (withImages.length >= 3) setImages(withImages.slice(0, 5));
      } catch (err) { console.error('Failed to fetch hero images:', err); }
    };
    fetchHeroImages();
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const paginate = useCallback((dir) => {
    setCurrentIndex(prev => (prev + dir + images.length) % images.length);
  }, [images.length]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/showroom?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <section className="home-hero-section" style={{
      height: '85vh', minHeight: '560px', position: 'relative', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <div className="max-w-[1400px] mx-auto h-full" style={{ padding: '0 48px' }}>
        <div className="flex h-full items-center" style={{ gap: 'clamp(24px, 4vw, 64px)' }}>
          {/* ─── LEFT: Content ─── */}
          <div className="hero-content" style={{ flex: '0 0 50%', maxWidth: '580px', zIndex: 2, position: 'relative' }}>
            <div>
              <h1 className="font-display font-black italic" style={{
                fontSize: 'clamp(2rem, 4vw, 3.6rem)',
                lineHeight: 1.05,
                color: '#fff',
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}>
                Buy and Sell Vehicles<br />
                <span style={{ color: 'var(--gold)' }}>With Complete Confidence</span>
              </h1>
              <p className="font-body" style={{
                fontSize: 'clamp(0.9rem, 1.1vw, 1.05rem)',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                marginBottom: '28px',
                maxWidth: '480px',
              }}>
                Every transaction secured by mandatory escrow. East Africa's most trusted way to buy and sell premium vehicles.
              </p>
            </div>

            <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
              <div className="flex items-center" style={{
                background: 'rgba(15,15,15,0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '100px',
                overflow: 'hidden',
                maxWidth: '520px',
              }}>
                <Search size={16} style={{ marginLeft: '18px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <input type="text" placeholder="Search by make, model, or keyword..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: '14px',
                    padding: '14px 14px', outline: 'none',
                  }}
                  className="hero-search-input" />
                <button type="submit" style={{
                  background: 'var(--gold)', color: '#000', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '10px 24px', borderRadius: '100px', marginRight: '4px', flexShrink: 0,
                  transition: 'opacity 0.2s',
                }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                   onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Search
                </button>
              </div>
            </form>

            <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
              <Link to="/showroom" className="btn-gold" style={{
                padding: '14px 36px', borderRadius: '100px', fontSize: '13px',
                fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                Browse Vehicles
              </Link>
              <Link to="/sell" className="btn-outline-gold" style={{
                padding: '14px 36px', borderRadius: '100px', fontSize: '13px',
                fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px',
                border: '1px solid rgba(212,196,168,0.25)', color: 'var(--gold)',
                transition: 'all 0.2s',
              }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,196,168,0.08)'; }}
                 onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                Sell Your Vehicle
              </Link>
            </div>

            <div className="flex items-center gap-5 flex-wrap">
              {TRUST_INDICATORS.map(text => (
                <div key={text} className="flex items-center gap-1.5">
                  <ShieldCheck size={14} style={{ color: 'rgba(212,196,168,0.5)' }} />
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: Image Slider ─── */}
          <div className="hero-slider" style={{ flex: '0 0 50%', position: 'relative', height: '70%', borderRadius: '16px', overflow: 'hidden', background: '#0A0A0A' }}>
            {images.map((src, i) => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                opacity: i === currentIndex ? 1 : 0,
                transition: 'opacity 0.8s ease, transform 0.8s ease',
                transform: i === currentIndex ? 'scale(1)' : 'scale(1.05)',
              }}>
                <LazyImage src={src} alt={`Vehicle ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.2), transparent)' }} />
            {images.length > 1 && (
              <>
                <button onClick={() => paginate(-1)} style={{
                  position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'} aria-label="Previous">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => paginate(1)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                   onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.4)'} aria-label="Next">
                  <ChevronRight size={16} />
                </button>
                <div style={{ position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIndex(i)}
                      style={{
                        width: i === currentIndex ? '24px' : '6px', height: '6px', borderRadius: '3px',
                        border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                        background: i === currentIndex ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                      }} aria-label={`Slide ${i + 1}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .home-hero-section { height: 75vh !important; min-height: 500px !important; }
          .home-hero-section > div { padding: 0 24px !important; }
        }
        @media (max-width: 768px) {
          .home-hero-section { height: auto !important; min-height: 0 !important; }
          .home-hero-section .flex { flex-direction: column !important; gap: 0 !important; }
          .hero-content { flex: none !important; max-width: 100% !important; padding: 48px 0 32px; }
          .hero-slider { flex: none !important; width: 100% !important; height: 320px !important; border-radius: 12px !important; margin-bottom: 32px; }
          .hero-search-input { font-size: 13px !important; }
        }
        @media (max-width: 480px) {
          .hero-content { padding: 36px 0 24px; }
          .hero-slider { height: 240px !important; }
          .home-hero-section > div { padding: 0 16px !important; }
        }
        .btn-outline-gold:hover { background: rgba(212,196,168,0.08) !important; }
      `}</style>
    </section>
  );
}
