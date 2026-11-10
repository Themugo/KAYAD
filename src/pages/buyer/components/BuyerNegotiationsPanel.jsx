import { useEffect, useState } from 'react';
import leadApi from '../../../services/leadApi';
import MarketplaceOfferPanel from '../../../components/offers/MarketplaceOfferPanel';

export default function BuyerNegotiationsPanel() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState('');

  useEffect(() => {
    let active = true;
    leadApi.myNegotiations()
      .then((result) => { if (active) setLeads(result.leads || []); })
      .catch((err) => { if (active) setError(err?.message || 'Unable to load your negotiations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section className="ov-card" style={{ marginTop: 18, padding: 16 }} aria-label="My offers and negotiations">
      <div className="ov-card-header-inner"><div className="activity-title">My offers & negotiations</div></div>
      {loading ? <p className="spending-empty">Loading your offers…</p> : null}
      {error ? <p role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</p> : null}
      {!loading && !error && leads.length === 0 ? <p className="spending-empty">Your vehicle enquiries and offer conversations will appear here.</p> : null}
      <div style={{ display: 'grid', gap: 9 }}>
        {leads.map((lead) => {
          const id = String(lead.id);
          return <div key={id} style={{ border: '1px solid var(--dealer-border, #e2e8f0)', borderRadius: 10, padding: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div><strong style={{ fontSize: 12 }}>Vehicle enquiry</strong><div style={{ color: '#64748b', fontSize: 10 }}>Reference {id.slice(0, 8)} · {lead.stage || 'new'}</div></div>
              <button type="button" onClick={() => setExpanded((current) => current === id ? '' : id)} style={{ border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', padding: '7px 10px', fontSize: 11, cursor: 'pointer' }}>{expanded === id ? 'Hide offers' : 'View offers'}</button>
            </div>
            {expanded === id ? <MarketplaceOfferPanel leadId={id} compact /> : null}
          </div>;
        })}
      </div>
    </section>
  );
}
