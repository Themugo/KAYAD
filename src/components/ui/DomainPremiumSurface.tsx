import React from 'react';
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

type Tone = 'marketplace' | 'auction' | 'escrow';

export function DomainPremiumHeader({
  domain,
  kicker,
  title,
  description,
  action,
  meta,
}: {
  domain: Tone;
  kicker: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <section className={`domain-premium-header domain-premium-header--${domain}`}>
      <div className="domain-premium-header__glow" aria-hidden="true" />
      <div className="domain-premium-header__copy">
        <span className="domain-premium-kicker"><Sparkles size={12} /> {kicker}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {meta && <div className="domain-premium-meta">{meta}</div>}
      </div>
      {action && <div className="domain-premium-header__action">{action}</div>}
    </section>
  );
}

export function DomainPremiumStats({
  domain,
  items,
}: {
  domain: Tone;
  items: Array<{ label: string; value: React.ReactNode; detail?: string }>;
}) {
  return (
    <div className={`domain-premium-stats domain-premium-stats--${domain}`}>
      {items.map((item) => (
        <div className="domain-premium-stat" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.detail && <small>{item.detail}</small>}
        </div>
      ))}
    </div>
  );
}

export function DomainJourneyRail({
  domain,
  steps,
}: {
  domain: Tone;
  steps: Array<{ label: string; state: 'complete' | 'current' | 'pending' }>;
}) {
  return (
    <nav className={`domain-journey domain-journey--${domain}`} aria-label={`${domain} journey`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          <div className={`domain-journey__step is-${step.state}`}>
            <span className="domain-journey__icon">
              {step.state === 'complete' ? <CheckCircle2 size={13} /> : step.state === 'current' ? <Sparkles size={12} /> : <LockKeyhole size={11} />}
            </span>
            <span>{step.label}</span>
          </div>
          {index < steps.length - 1 && <span className={`domain-journey__line ${step.state === 'complete' ? 'is-complete' : ''}`} />}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function DomainTrustStrip({
  domain,
  items,
}: {
  domain: Tone;
  items: Array<{ label: string; value?: React.ReactNode }>;
}) {
  return (
    <div className={`domain-trust-strip domain-trust-strip--${domain}`}>
      {items.map((item) => (
        <span key={item.label}>
          <ShieldCheck size={13} />
          <b>{item.label}</b>{item.value && <em>{item.value}</em>}
        </span>
      ))}
    </div>
  );
}

export function DomainNextStep({ label, detail, onClick, domain }: { label: string; detail?: string; onClick?: () => void; domain: Tone }) {
  return (
    <button type="button" className={`domain-next-step domain-next-step--${domain}`} onClick={onClick}>
      <span><b>{label}</b>{detail && <small>{detail}</small>}</span>
      <ArrowRight size={16} />
    </button>
  );
}
