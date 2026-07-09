import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Gallery', to: '/browse' },
  { label: 'Auctions', to: '/auctions' },
  { label: 'Escrow Vault', to: '/escrow' },
  { label: 'Pre-Inspection', to: '/inspection' },
  { label: 'Support', to: '/support' },
];

export default function Navbar({ user, onLogout }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location]);

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <>
      <nav className={`kd-nav${scrolled ? ' kd-nav--scrolled' : ''}`}>
        <div className="container">
          <div className="kd-nav__inner">

            <Link to="/" className="kd-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              KAYAD
            </Link>

            <ul className="kd-nav__links">
              {NAV_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className={`kd-nav__link${isActive(to) ? ' active' : ''}`}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="kd-nav__actions">
              <Link to="/register?role=dealer" className="kd-sell-link">Sell</Link>
              {user ? (
                <button className="kd-signin" onClick={onLogout}>Sign Out</button>
              ) : (
                <Link to="/auth" className="kd-signin">Sign In</Link>
              )}
              <button
                className="kd-mobile-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  {mobileOpen
                    ? <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {mobileOpen && (
        <div className="kd-mobile-menu">
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={label} to={to} className="kd-mobile-link">{label}</Link>
          ))}
          <hr className="kd-mobile-hr" />
          <Link to="/register?role=dealer" className="kd-mobile-link">Sell</Link>
          {user
            ? <button className="kd-signin" onClick={onLogout} style={{ width: '100%', justifyContent: 'center' }}>Sign Out</button>
            : <Link to="/auth" className="kd-signin" style={{ display: 'block', textAlign: 'center' }}>Sign In</Link>
          }
        </div>
      )}
    </>
  );
}
