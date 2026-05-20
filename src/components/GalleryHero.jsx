import { useState, useEffect } from 'react';
import { adminAPI } from '../api/api';

const DEFAULTS = {
  galleryTitle: 'The Gallery',
  gallerySubtitle: "Kenya's Premium Automotive Gallery",
};

export default function GalleryHero({ isMobile }) {
  const [title, setTitle] = useState(DEFAULTS.galleryTitle);
  const [subtitle, setSubtitle] = useState(DEFAULTS.gallerySubtitle);

  useEffect(() => {
    adminAPI.getConfig()
      .then(({ config: c }) => {
        if (c) {
          if (c.galleryTitle)    setTitle(c.galleryTitle);
          if (c.gallerySubtitle) setSubtitle(c.gallerySubtitle);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section style={{ padding: isMobile ? '16px 0 8px' : '28px 0 16px', background: '#050505' }}>
      <div className="container">
        <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 4 }}>
          {subtitle}
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1,
          textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          {title}
        </h1>
      </div>
    </section>
  );
}
