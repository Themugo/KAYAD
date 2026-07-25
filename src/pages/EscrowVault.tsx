import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import { Shield, CheckCircle, ArrowRight, AlertCircle, ChevronDown, Lock } from 'lucide-react';

interface EscrowVaultProps {
  setPage: (page: string) => void;
}

const STEPS = [
  {
    icon: Shield,
    title: 'Purchase Agreement',
    desc: 'Buyer and seller agree on terms. A digital purchase agreement is created and both parties sign it electronically.',
  },
  {
    icon: AlertCircle,
    title: 'Payment Secured',
    desc: 'The buyer deposits funds into the KAYAD Escrow Vault — a ring-fenced account held by a licensed custodian.',
  },
  {
    icon: CheckCircle,
    title: 'Inspection & Verification',
    desc: 'The buyer inspects the vehicle and confirms it matches the listing. A 150-point report validates the condition.',
  },
  {
    icon: Lock,
    title: 'Release Funds',
    desc: "Once confirmed, payment is instantly released to the seller's account. The entire cycle completes within 48 hours.",
  },
];

const VEHICLE_DETAILS = [
  { label: 'Color', value: 'White Pearl' },
  { label: 'Year', value: '2024' },
  { label: 'Mileage', value: '12,400 km' },
  { label: 'Transmission', value: 'Automatic' },
  { label: 'Engine', value: '4.6L V8' },
  { label: 'Price', value: 'KES 18,500,000' },
];

export default function EscrowVault({ setPage }: EscrowVaultProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes } = theme;

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
        <div
          style={{
            position: 'relative',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `${colors.heroAccent}25`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={28} style={{ color: colors.heroAccent }} />
          </div>
          <div>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.heroAccent,
                marginBottom: 4,
              }}
            >
              Secure Payment Protection
            </p>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontSize: `clamp(1.75rem, 4vw, ${2.75 * sizes.headingScale}rem)`,
                color: colors.heroText,
                fontWeight: 700,
              }}
            >
              Escrow Vault
            </h1>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding: `${sizes.sectionPadding}px 24px` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
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
              Step-by-Step
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
              }}
            >
              How It Works
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                style={{
                  position: 'relative',
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 8,
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 20,
                    fontFamily: fonts.heading,
                    fontSize: 48,
                    fontWeight: 700,
                    color: colors.cardBorder,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: colors.cardAccent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Icon size={22} style={{ color: colors.buttonText }} />
                </div>
                <h3
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: `${1.1 * sizes.headingScale}rem`,
                    color: colors.cardHeading,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    color: colors.cardBody,
                    lineHeight: 1.6,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ACTIVE VAULT TRANSACTION ──────────────────────────────── */}
      <section style={{ padding: `0 24px ${sizes.sectionPadding}px` }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div
            style={{
              background: colors.heroBg,
              borderRadius: sizes.radius,
              padding: sizes.cardPadding + 12,
              border: `1px solid ${colors.heroAccent}30`,
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${colors.heroAccent}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={20} style={{ color: colors.heroAccent }} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.heroText,
                  }}
                >
                  Active Vault Transaction
                </p>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  Toyota Land Cruiser V8
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 99,
                  background: 'rgba(52,211,153,0.15)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#34d399',
                  }}
                />
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#34d399',
                  }}
                >
                  Protected
                </span>
              </div>
            </div>

            {/* Buyer & Seller */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Buyer', value: 'James Mwangi' },
                { label: 'Seller', value: 'Premium Motors Ltd' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <p style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {label}
                  </p>
                  <p style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.heroText }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* Vehicle details */}
            <div
              style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {VEHICLE_DETAILS.map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                      {label}
                    </p>
                    <p style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: colors.heroText }}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* KES Amount + Fund button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: `${colors.heroAccent}12`,
                borderRadius: 12,
                border: `1px solid ${colors.heroAccent}30`,
              }}
            >
              <div>
                <p style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Escrow Amount
                </p>
                <p style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: colors.heroAccent }}>
                  KES 18,500,000
                </p>
              </div>
              <button
                style={{
                  fontFamily: fonts.body,
                  fontSize: 13,
                  fontWeight: 700,
                  color: colors.buttonText,
                  background: colors.cardAccent,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'opacity 0.2s',
                }}
              >
                Fund Vault <ArrowRight size={16} />
              </button>
            </div>

            {/* Status */}
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} style={{ color: '#fbbf24' }} />
              <p style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                Status: Awaiting buyer confirmation — funds are securely held
              </p>
            </div>
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
