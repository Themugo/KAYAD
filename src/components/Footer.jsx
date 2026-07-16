import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="kd-footer-logo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
              <span>KAYAD</span>
            </div>
            <p className="footer-desc">
              East Africa's trusted car marketplace. Buy, sell, and bid on verified vehicles with secure M-Pesa escrow and real-time live auctions.
            </p>
            <div className="footer-social">
              {['𝕏', 'f', 'in', '▶'].map((icon, i) => (
                <button key={i} className="social-icon" aria-label={`Social ${i}`}>{icon}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="footer-col-title">Marketplace</div>
            <div className="footer-links">
              <Link to="/browse">Gallery</Link>
              <Link to="/auctions">Live Auctions</Link>
              <Link to="/browse?type=new">New Arrivals</Link>
              <Link to="/browse?type=featured">Featured</Link>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Services</div>
            <div className="footer-links">
              <a href="#">Escrow Vault</a>
              <a href="#">Pre-Inspection</a>
              <a href="#">Sell a Vehicle</a>
              <a href="#">Dealer Registration</a>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Support</div>
            <div className="footer-links">
              <a href="#">Help Center</a>
              <a href="#">Contact Us</a>
              <a href="#">Report Fraud</a>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="footer-col-title">Contact</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.8 }}>
                +254 700 123 456<br />
                hello@kayad.co.ke<br />
                Westlands, Nairobi
              </p>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} KAYAD Ltd. All rights reserved. Registered in Kenya.</p>
          <div className="footer-bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
