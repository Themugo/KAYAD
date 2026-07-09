// src/pages/NotFoundPage.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import usePageMeta from '../hooks/usePageMeta';

export default function NotFoundPage() {
  usePageMeta('Page Not Found', 'The page you are looking for does not exist. Browse premium cars for sale in Kenya on Kayad.');
  const navigate = useNavigate();
  const [count, setCount] = useState(5);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(id); navigate('/'); }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24, textAlign: 'center',
    }}>
      {/* Big 404 */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(6rem, 20vw, 12rem)',
        fontWeight: 700, lineHeight: 1,
        background: 'linear-gradient(135deg, var(--gold-muted), var(--gold-light))',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text', marginBottom: 8,
      }}>404</div>

      <div style={{ fontSize: 48, marginBottom: 16 }}>🚗💨</div>
      <h2 style={{ marginBottom: 12 }}>This page drove off</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: 400, marginBottom: 8, fontSize: 15 }}>
        The page you're looking for doesn't exist, was removed, or took a wrong turn.
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 32 }}>
        Redirecting to home in {count}s...
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/" className="btn btn-gold">← Go Home</Link>
        <Link to="/" className="btn btn-outline">Browse Cars</Link>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </div>
  );
}
