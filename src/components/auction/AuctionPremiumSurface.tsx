import React from 'react';
import { ArrowRight, Check, Circle, LockKeyhole, Sparkles } from 'lucide-react';

export function AuctionPremiumHeader({ kicker, title, description, action }: { kicker: string; title: string; description?: string; action?: React.ReactNode }) {
  return <section className="auction-premium-header">
    <div className="auction-premium-header-glow" aria-hidden="true" />
    <div className="auction-premium-header-copy">
      <span className="auction-premium-kicker"><Sparkles size={12} /> {kicker}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {action && <div className="auction-premium-header-action">{action}</div>}
  </section>;
}

export function AuctionPremiumStats({ items }: { items: Array<{ label: string; value: React.ReactNode; detail?: string }> }) {
  return <div className="auction-premium-stats">{items.map((item) => <div className="auction-premium-stat" key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.detail && <small>{item.detail}</small>}</div>)}</div>;
}

export function AuctionFulfilmentTimeline({ steps }: { steps: Array<{ label: string; detail?: string; state?: 'complete' | 'current' | 'pending' }> }) {
  return <div className="auction-fulfilment-timeline" aria-label="Auction fulfilment progress">{steps.map((step, index) => <React.Fragment key={step.label}>
    <div className={`auction-fulfilment-step is-${step.state || 'pending'}`}>
      <div className="auction-fulfilment-dot">{step.state === 'complete' ? <Check size={13} /> : step.state === 'current' ? <Circle size={9} fill="currentColor" /> : <LockKeyhole size={11} />}</div>
      <div><strong>{step.label}</strong>{step.detail && <span>{step.detail}</span>}</div>
    </div>
    {index < steps.length - 1 && <div className={`auction-fulfilment-line ${step.state === 'complete' ? 'is-complete' : ''}`} />}
  </React.Fragment>)}</div>;
}

export function AuctionPremiumNextStep({ label, detail, onClick }: { label: string; detail?: string; onClick?: () => void }) {
  return <button type="button" className="auction-premium-next" onClick={onClick}><span><b>{label}</b>{detail && <small>{detail}</small>}</span><ArrowRight size={16} /></button>;
}
