// src/components/AdBoard.jsx
// Rotating ad banner for the home page landing area.
// Fetches active ads from adsAPI (demo-mode aware). Falls back to an
// "Advertise here" CTA when no ads are live — always earns its space.
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, ExternalLink } from 'lucide-react';
import { adsAPI } from '../api/api';

// Fallback shown when no active ads exist
const FALLBACK_AD = {
  _id: 'fallback',
  clientName: 'KAYAD',
  headline: 'Advertise Your Business Here',
  subline: 'Reach 50,000+ qualified car buyers across East Africa',
  targetLink: '/advertising',
  placement: 'homepage_banner',
  imageUrl: null,
  isInternal: true,
};

export default function AdBoard({ placement = 'homepage_banner' }) {
  const [ads, setAds] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    adsAPI.list({ placement, isActive: true })
      .then(res => {
        const list = (res?.ads || res?.data || []).filter(a => a.isActive !== false);
        setAds(list.length > 0 ? list : [FALLBACK_AD]);
      })
      .catch(() => setAds([FALLBACK_AD]))
      .finally(() => setLoaded(true));
  }, [placement]);

  const advance = useCallback(() => {
    setCurrentIdx(i => (i + 1) % ads.length);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1) return;
    intervalRef.current = setInterval(advance, 6000);
    return () => clearInterval(intervalRef.current);
  }, [ads.length, advance]);

  if (!loaded || dismissed) return null;
  if (ads.length === 0) return null;

  const ad = ads[currentIdx];
  const isFallback = ad._id === 'fallback' || ad.isInternal;
  const isExternal = ad.targetLink && (ad.targetLink.startsWith('http://') || ad.targetLink.startsWith('https://'));

  const AdWrapper = ({ children, style }) =>
    isExternal ? (
      <a href={ad.targetLink} target="_blank" rel="noopener noreferrer" style={{ ...style, textDecoration: 'none' }}>
        {children}
      </a>
    ) : (
      <Link to={ad.targetLink || '/advertising'} style={{ ...style, textDecoration: 'none' }}>
        {children}
      </Link>
    );

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={ad._id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35 }}
        >
          <AdWrapper style={{ display: 'block', cursor: 'pointer' }}>
            <div
              style={{
                position: 'relative',
                background: isFallback
                  ? 'linear-gradient(135deg, rgba(212,196,168,0.06) 0%, rgba(5,5,5,1) 60%)'
                  : ad.imageUrl
                    ? 'transparent'
                    : 'rgba(255,255,255,0.025)',
                minHeight: ad.imageUrl ? 90 : 56,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 60px 14px 24px',
                overflow: 'hidden',
              }}
            >
              {/* Background image */}
              {ad.imageUrl && (
                <img
                  src={ad.imageUrl}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.35 }}
                />
              )}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16, maxWidth: 1200 }}>
                {isFallback && (
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(212,196,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Megaphone size={16} color="var(--gold)" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isFallback ? 9 : 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 3 }}>
                    {isFallback ? 'Advertising Opportunity' : `Sponsored · ${ad.clientName}`}
                  </div>
                  <div style={{ fontSize: isFallback ? 14 : 13, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                    {ad.headline || ad.clientName}
                  </div>
                  {(ad.subline || isFallback) && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                      {ad.subline || 'Reach 50,000+ qualified car buyers across East Africa'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    {isFallback ? 'Advertise Here' : 'Learn More'}
                    {isExternal ? <ExternalLink size={10} /> : null}
                  </span>
                </div>
              </div>
            </div>
          </AdWrapper>
        </motion.div>
      </AnimatePresence>

      {/* Slide indicators (only when multiple ads) */}
      {ads.length > 1 && (
        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => { clearInterval(intervalRef.current); setCurrentIdx(i); }}
              style={{ width: i === currentIdx ? 16 : 4, height: 4, borderRadius: 9999, background: i === currentIdx ? 'var(--gold)' : 'rgba(255,255,255,0.2)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all 0.3s' }}
            />
          ))}
        </div>
      )}

      {/* Dismiss */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }}
        style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.3)' }}
        aria-label="Dismiss ad"
      >
        <X size={11} />
      </button>
    </div>
  );
}
