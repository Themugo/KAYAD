import { HelpCircle, MessageCircle, Mail, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const SUPPORT_ITEMS = [
  { icon: MessageCircle, label: 'Live Chat', desc: 'Chat with our support team', color: '#22c55e', action: '#chat' },
  { icon: Mail, label: 'Email Support', desc: 'support@kayad.co.ke', color: '#3b82f6', action: 'mailto:support@kayad.co.ke' },
  { icon: BookOpen, label: 'Documentation', desc: 'Read the dealer guide', color: 'var(--gold)', action: '/seller/guide' },
];

export default function DealerSupportPage() {
  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Support</h1>
            <p className="page-subtitle">Get help with your dealership account</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          {SUPPORT_ITEMS.map(item => (
            <Link key={item.label} to={item.action}
              style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, textDecoration: 'none', transition: 'all 0.2s', display: 'block' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(37, 99, 235,0.2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <item.icon size={20} style={{ color: item.color }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
            </Link>
          ))}
        </div>

        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: '#fff', margin: '0 0 12px' }}>Need urgent help?</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Our support team typically responds within 2 hours</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <a href="tel:+254700000000" style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Call Support
            </a>
            <a href="mailto:support@kayad.co.ke" style={{ padding: '10px 24px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Send Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
