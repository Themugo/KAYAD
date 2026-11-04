import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Phone, ShieldCheck } from 'lucide-react';
import { auctionEngagementAPI } from '../../api/api';

/** Winner-only "what happens next": the four steps, and (dealer auctions, after payment) the dealer's contact to arrange collection directly. */
export default function WinnerHandoverPanel({ auctionId, refreshKey }: { auctionId: string; refreshKey?: unknown }) {
  const [h, setH] = useState<any>(null);
  useEffect(() => { auctionEngagementAPI.handover(auctionId).then((d: any) => setH(d.handover)).catch(() => setH(null)); }, [auctionId, refreshKey]);
  if (!h) return null;
  return (
    <section aria-label="What happens next" data-testid="winner-handover" className="card" style={{ margin: '12px 0', padding: 20 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>What happens next</h3>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {h.steps.map((s: any) => (
          <li key={s.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: s.state === 'pending' ? 0.55 : 1 }} aria-current={s.state === 'current' ? 'step' : undefined}>
            {s.state === 'done' ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" strokeWidth={s.state === 'current' ? 3 : 1.5} />}
            <div style={{ fontSize: 14 }}>
              <strong>{s.label}</strong>
              {s.key === 'pay' && s.state === 'current' && Number(s.amount) > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>KES {Number(s.amount).toLocaleString('en-KE')}{s.dueAt ? ` by ${new Date(s.dueAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</div>}
            </div>
          </li>
        ))}
      </ol>
      {h.contact && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 13 }}>Payment received. Arrange collection and paperwork directly with <strong>{h.contact.name}</strong>. KAYAD is not part of that arrangement.</p>
          <a href={`tel:${h.contact.phone}`} className="btn btn-outline" style={{ marginTop: 10, minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Phone size={16} aria-hidden="true" /> {h.contact.phone}</a>
        </div>
      )}
      {h.coordinatedByKayad && <p style={{ marginTop: 14, fontSize: 13, display: 'flex', gap: 8 }}><ShieldCheck size={16} aria-hidden="true" /> For your safety, KAYAD coordinates collection for private sellers. We will contact you.</p>}
    </section>
  );
}
