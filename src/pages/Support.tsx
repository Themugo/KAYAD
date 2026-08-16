import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import { HelpCircle, MessageCircle, Phone, Mail, ArrowRight, Search, Shield, ClipboardCheck, CreditCard, Tag, Banknote, Car } from 'lucide-react';

interface SupportProps {
  setPage: (page: string) => void;
}

const TOPICS = [
  { icon: Shield, title: 'Escrow Vault', desc: 'Secure payment protection and fund management', page: 'escrow-vault' },
  { icon: ClipboardCheck, title: 'Pre-Inspection', desc: '150-point vehicle assessment before purchase', page: 'pre-inspection' },
  { icon: Car, title: 'Buying a Car', desc: 'Browse, compare, and purchase with confidence', page: 'gallery' },
  { icon: Tag, title: 'Selling a Vehicle', desc: 'List your car and reach thousands of buyers', page: 'sell' },
  { icon: Banknote, title: 'Financing', desc: 'Affordable car loans from trusted partners', page: 'payments' },
  { icon: CreditCard, title: 'Insurance', desc: 'Comprehensive motor insurance for your vehicle', page: 'payments' },
];

const CONTACT_OPTIONS = [
  {
    icon: MessageCircle,
    title: 'Live Chat',
    desc: 'Chat with our team',
    detail: 'Available 24/7',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.12)',
  },
  {
    icon: Mail,
    title: 'Email',
    desc: 'support@kayad.co.ke',
    detail: 'Response within 24 hours',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.12)',
  },
  {
    icon: Phone,
    title: 'Phone',
    desc: '+254 700 123 456',
    detail: 'Mon–Fri, 8am–6pm',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    desc: '+254 700 123 456',
    detail: 'Instant messaging',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
  },
];

export default function Support({ setPage }: SupportProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes } = theme;

  const [search, setSearch] = useState('');

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
  );

  const filteredTopics = TOPICS.filter(
    t =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.pageBg, fontFamily: fonts.body }}>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: colors.heroBg,
          paddingTop: `${sizes.sectionPadding}px`,
          paddingBottom: `${sizes.sectionPadding}px`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(135deg, ${colors.heroAccent}18 0%, transparent 60%)`,
          }}
        />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `${colors.heroAccent}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <HelpCircle size={28} style={{ color: colors.heroAccent }} />
          </div>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontSize: `clamp(1.75rem, 4vw, ${2.75 * sizes.headingScale}rem)`,
              color: colors.heroText,
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Support Center
          </h1>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: `${1 * sizes.bodyScale}rem`,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            We're here to help with any questions or concerns about buying, selling, or using KAYAD.
          </p>
        </div>
      </section>

      {/* ── SEARCH BAR ───────────────────────────────────────────── */}
      <section style={{ padding: `${sizes.sectionPadding / 2}px 24px 0` }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div
            style={{
              position: 'relative',
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: sizes.radius,
              overflow: 'hidden',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 18,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.cardAccent,
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help topics..."
              style={{
                width: '100%',
                fontFamily: fonts.body,
                fontSize: 15,
                color: colors.headingText,
                background: 'transparent',
                border: 'none',
                padding: '16px 18px 16px 48px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </section>

      {/* ── POPULAR TOPICS ───────────────────────────────────────── */}
      <section style={{ padding: `${sizes.sectionPadding}px 24px` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.cardAccent,
                marginBottom: 8,
              }}
            >
              Help Library
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
              }}
            >
              Popular Topics
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {filteredTopics.map(({ icon: Icon, title, desc, page }) => (
              <button
                key={title}
                onClick={() => nav(page)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${colors.cardAccent}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} style={{ color: colors.cardAccent }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.cardHeading,
                      marginBottom: 2,
                    }}
                  >
                    {title}
                  </p>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: colors.cardBody,
                      lineHeight: 1.5,
                    }}
                  >
                    {desc}
                  </p>
                </div>
                <ArrowRight size={16} style={{ color: colors.cardAccent, marginTop: 4, flexShrink: 0 }} />
              </button>
            ))}
          </div>

          {filteredTopics.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: colors.cardBg,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: sizes.radius,
              }}
            >
              <Search size={32} style={{ color: colors.cardBorder, marginBottom: 12 }} />
              <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.cardBody }}>
                No topics match "{search}". Try a different search.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── CONTACT US ───────────────────────────────────────────── */}
      <section style={{ padding: `0 24px ${sizes.sectionPadding}px` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.cardAccent,
                marginBottom: 8,
              }}
            >
              Get in Touch
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
              }}
            >
              Contact Us
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
          >
            {CONTACT_OPTIONS.map(({ icon: Icon, title, desc, detail, color, bg }) => (
              <div
                key={title}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 8,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 15,
                    fontWeight: 700,
                    color: colors.cardHeading,
                    marginBottom: 4,
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    color: colors.cardBody,
                    marginBottom: 8,
                  }}
                >
                  {desc}
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    color: colors.cardBody,
                    opacity: 0.6,
                  }}
                >
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BACK TO MARKETPLACE ───────────────────────────────────── */}
      <section style={{ padding: '0 24px 64px', textAlign: 'center' }}>
        <button
          onClick={() => nav('gallery')}
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            fontWeight: 600,
            color: colors.cardAccent,
            background: 'none',
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: sizes.radius,
            padding: '14px 32px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          Back to Marketplace <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
