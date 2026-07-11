// src/pages/NotFoundPage.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function NotFoundPage() {
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
  }, []);

  return (
    <div className="page flex-center" style={{ flexDirection: 'column', textAlign: 'center', padding: 24 }}>
      <div className="gradient-text-404">404</div>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚗💨</div>
      <h2 style={{ marginBottom: 12 }}>This page drove off</h2>
      <p className="text-muted" style={{ maxWidth: 400, marginBottom: 8, fontSize: 15 }}>
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
