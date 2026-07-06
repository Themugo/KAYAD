import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';
import '../styles/about.css';

export default function AboutPage() {
  usePageMeta('About Us', 'Learn about Kayad - Kenya\'s premium automotive marketplace with live auctions, verified dealers, and secure escrow payments.');

  return (
    <div className="about-page">
      <div className="about-container">
        <div className="about-header">
          <div className="about-overline">About Kayad</div>
          <h1 className="about-title">
            Kenya's <span className="about-title-gold">Premium</span> Car Marketplace
          </h1>
          <p className="about-subtitle">
            We're building the most trusted platform for buying and selling vehicles in East Africa.
          </p>
        </div>

        <div className="about-cards">
          {[
            {
              title: 'Our Mission',
              desc: 'To eliminate fraud and build trust in Kenya\'s used car market through technology, verification, and secure transactions.',
              icon: '🎯',
            },
            {
              title: 'Live Auctions',
              desc: 'Real-time bidding with automatic time extensions. Every bid is transparent, every second counts. Our auction engine handles thousands of concurrent bidders.',
              icon: '🔨',
            },
            {
              title: 'Escrow Protection',
              desc: 'M-Pesa secured transactions held safely until delivery is confirmed. Your money stays protected until you receive exactly what you paid for.',
              icon: '🔒',
            },
            {
              title: 'Verified Dealers',
              desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers. We verify business registrations, physical locations, and transaction history.',
              icon: '✅',
            },
          ].map((item, i) => (
            <div key={i} className="about-card">
              <div className="about-card-icon">{item.icon}</div>
              <div>
                <h3 className="about-card-title">{item.title}</h3>
                <p className="about-card-desc">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="about-cta">
          <Link to="/showroom" className="btn btn-gold">Explore the Gallery</Link>
        </div>
      </div>
    </div>
  );
}
