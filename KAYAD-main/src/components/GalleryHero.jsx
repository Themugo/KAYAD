import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';

const DEFAULTS = {
  galleryTitle: 'The Gallery',
  gallerySubtitle: "Kenya's Premium Automotive Gallery",
};

export default function GalleryHero() {
  const [title, setTitle] = useState(DEFAULTS.galleryTitle);
  const [subtitle, setSubtitle] = useState(DEFAULTS.gallerySubtitle);

  useEffect(() => {
    adminAPI.getConfig()
      .then(({ config: c }) => {
        if (c) {
          if (c.galleryTitle) setTitle(c.galleryTitle);
          if (c.gallerySubtitle) setSubtitle(c.gallerySubtitle);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={{
      padding: '50px 0 24px',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(212,168,67,0.02) 100%)',
        border: '1px solid rgba(212,168,67,0.1)',
        borderRadius: 16, padding: '28px 32px', textAlign: 'center',
        maxWidth: 640, margin: '0 auto',
      }}>
        <div style={{
          fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 6,
        }}>
          {subtitle}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(1.4rem, 3vw, 2rem)', lineHeight: 1.1,
          textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          {title}
        </h1>
      </div>
    </section>
  );
}
