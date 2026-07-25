import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import { Search, Calendar, MapPin, Shield, CheckCircle, AlertCircle, ArrowRight, ChevronDown } from 'lucide-react';

interface PreInspectionProps {
  setPage: (page: string) => void;
}

const LOCATIONS = [
  'Westlands',
  'Industrial Area',
  'Karen',
  'Thika Road',
  'Mombasa Road',
  'Kisumu',
  'Nakuru',
];

const INSPECTION_TYPES = [
  { value: 'standard', label: 'Standard 150-Point', desc: 'Comprehensive full-vehicle assessment' },
  { value: 'basic', label: 'Basic 80-Point', desc: 'Essential systems check' },
  { value: 'premium', label: 'Premium 200-Point', desc: 'Extended inspection with road test & diagnostics' },
];

const CHECK_ITEMS: { category: string; items: string[] }[] = [
  {
    category: 'Engine & Mechanical',
    items: ['Engine compression', 'Oil leaks & pressure', 'Transmission condition', 'Exhaust system'],
  },
  {
    category: 'Interior & Electronics',
    items: ['Dashboard warning lights', 'Infotainment & sensors', 'Air conditioning', 'Seat controls'],
  },
  {
    category: 'Exterior & Body',
    items: ['Panel gaps & alignment', 'Paint condition', 'Frame integrity', 'Glass & seals'],
  },
  {
    category: 'Test Drive',
    items: ['Cold start behaviour', 'Gear shift quality', 'Steering response', 'Braking distance'],
  },
  {
    category: 'Electrical Systems',
    items: ['Battery health', 'Alternator output', 'Airbag system', 'Central locking'],
  },
  {
    category: 'Documentation',
    items: ['Log book verification', 'Service history', 'Encumbrance check', 'Insurance status'],
  },
];

export default function PreInspection({ setPage }: PreInspectionProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes } = theme;

  const [location, setLocation] = useState(LOCATIONS[0]);
  const [inspectionType, setInspectionType] = useState('standard');

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
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
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: colors.heroAccent,
              marginBottom: 12,
            }}
          >
            150-Point Vehicle Assessment
          </p>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontSize: `clamp(1.75rem, 4vw, ${2.75 * sizes.headingScale}rem)`,
              color: colors.heroText,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Pre-Purchase Inspection
          </h1>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: `${1 * sizes.bodyScale}rem`,
              color: 'rgba(255,255,255,0.6)',
              maxWidth: 560,
              lineHeight: 1.6,
            }}
          >
            Every vehicle is checked by certified mechanics across 150 points before you commit. Know exactly what you're buying — no surprises after the sale.
          </p>
        </div>
      </section>

      {/* ── HERO BANNER ──────────────────────────────────────────── */}
      <section style={{ padding: `${sizes.sectionPadding / 2}px 24px` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {[
              { icon: Shield, title: 'Certified Mechanics', desc: 'All inspectors are factory-trained and licensed' },
              { icon: CheckCircle, title: '150+ Check Points', desc: 'Comprehensive bumper-to-bumper assessment' },
              { icon: AlertCircle, title: 'Full Report', desc: 'Detailed PDF report with photos and findings' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 8,
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
                <div>
                  <p style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: colors.cardHeading, marginBottom: 2 }}>
                    {title}
                  </p>
                  <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.cardBody, lineHeight: 1.5 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SCHEDULE INSPECTION FORM ─────────────────────────────── */}
      <section style={{ padding: `0 24px ${sizes.sectionPadding}px` }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
              Schedule Now
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${1.75 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
              }}
            >
              Schedule Inspection
            </h2>
          </div>

          <div
            style={{
              background: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: sizes.radius,
              padding: sizes.cardPadding + 12,
            }}
          >
            {/* Location */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.cardBody,
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Inspection Location
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.cardAccent,
                    pointerEvents: 'none',
                  }}
                />
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.headingText,
                    background: colors.pageBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 12,
                    padding: '12px 40px 12px 40px',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.cardBody,
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {/* Inspection type */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontFamily: fonts.body,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: colors.cardBody,
                  marginBottom: 6,
                  display: 'block',
                }}
              >
                Inspection Type
              </label>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.cardAccent,
                    pointerEvents: 'none',
                  }}
                />
                <select
                  value={inspectionType}
                  onChange={e => setInspectionType(e.target.value)}
                  style={{
                    width: '100%',
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.headingText,
                    background: colors.pageBg,
                    border: `1px solid ${colors.cardBorder}`,
                    borderRadius: 12,
                    padding: '12px 40px 12px 40px',
                    outline: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {INSPECTION_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: colors.cardBody,
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <p style={{ fontFamily: fonts.body, fontSize: 12, color: colors.cardBody, marginTop: 6 }}>
                {INSPECTION_TYPES.find(t => t.value === inspectionType)?.desc}
              </p>
            </div>

            <button
              style={{
                width: '100%',
                fontFamily: fonts.body,
                fontSize: 15,
                fontWeight: 700,
                color: colors.buttonText,
                background: colors.cardAccent,
                border: 'none',
                borderRadius: 12,
                padding: '14px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.2s',
              }}
            >
              Book Inspection <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── WHAT WE CHECK ────────────────────────────────────────── */}
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
              Comprehensive Assessment
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
              }}
            >
              What We Check
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {CHECK_ITEMS.map(({ category, items }) => (
              <div
                key={category}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 8,
                }}
              >
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.cardHeading,
                    marginBottom: 12,
                  }}
                >
                  {category}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map(item => (
                    <li
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 0',
                        borderTop: `1px solid ${colors.cardBorder}40`,
                      }}
                    >
                      <CheckCircle size={14} style={{ color: colors.cardAccent, flexShrink: 0 }} />
                      <span style={{ fontFamily: fonts.body, fontSize: 13, color: colors.cardBody }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
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


