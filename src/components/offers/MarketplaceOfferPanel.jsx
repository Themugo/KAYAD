import { useCallback, useEffect, useMemo, useState } from 'react';
import { leadApi } from '../../services/leadApi';
import { useAuth } from '../../context/AuthContext';

const money = (value) => `KES ${Number(value || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
const key = () => (globalThis.crypto?.randomUUID?.() || `offer-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const statusColor = { pending: '#b7791f', accepted: '#15803d', rejected: '#b91c1c', withdrawn: '#64748b', countered: '#176b87', expired: '#64748b' };

/** Buyer/seller negotiation surface backed exclusively by the canonical lead offer API. */
export default function MarketplaceOfferPanel({ leadId, compact = false }) {
  const { user } = useAuth();
  const userId = String(user?.id || user?._id || '');
  const [offers, setOffers] = useState([]);
  const [events, setEvents] = useState([]);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [counterAmounts, setCounterAmounts] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const result = await leadApi.offers(leadId);
      setOffers(result.offers || []);
      setEvents(result.events || []);
    } catch (err) {
      setError(err?.message || 'Unable to load negotiation history.');
    } finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { refresh(); }, [refresh]);

  const pending = useMemo(() => [...offers].reverse().find((offer) => offer.status === 'pending'), [offers]);
  const submit = async (event) => {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) { setError('Enter a valid offer amount.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await leadApi.submitOffer(leadId, { amount: parsed, message: message.trim() || undefined, idempotencyKey: key() });
      setAmount(''); setMessage(''); setNotice('Offer sent. The other participant can now respond.'); await refresh();
    } catch (err) { setError(err?.message || 'Offer could not be submitted.'); }
    finally { setBusy(false); }
  };

  const act = async (offer, action) => {
    const counter = Number(counterAmounts[offer.id]);
    if (action === 'counter' && (!Number.isFinite(counter) || counter <= 0)) { setError('Enter a valid counter-offer amount.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      await leadApi.respondToOffer(leadId, offer.id, {
        action,
        ...(action === 'counter' ? { amount: counter } : {}),
        idempotencyKey: key(),
      });
      setCounterAmounts((old) => ({ ...old, [offer.id]: '' }));
      setNotice(action === 'accept' ? 'Offer accepted.' : action === 'reject' ? 'Offer declined.' : action === 'withdraw' ? 'Offer withdrawn.' : 'Counter-offer sent.');
      await refresh();
    } catch (err) { setError(err?.message || 'That offer action could not be completed.'); }
    finally { setBusy(false); }
  };

  return (
    <section aria-label="Buyer and seller offer negotiation" style={{ marginTop: 12, padding: compact ? 12 : 16, border: '1px solid rgba(23,107,135,.25)', borderRadius: 12, background: 'rgba(23,107,135,.045)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <strong style={{ color: 'var(--brand, #13b8a6)', fontSize: 13 }}>Offers & negotiation</strong>
        <button type="button" onClick={refresh} disabled={loading || busy} style={smallButton}>Refresh</button>
      </div>
      {loading ? <p style={muted}>Loading negotiation…</p> : null}
      {error ? <p role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{error}</p> : null}
      {notice ? <p role="status" style={{ color: '#15803d', fontSize: 12 }}>{notice}</p> : null}
      {!loading && offers.length === 0 ? <p style={muted}>No offers yet. Make the first offer to start a recorded negotiation.</p> : null}
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {offers.map((offer) => {
          const mine = String(offer.sender_id) === userId;
          const recipient = String(offer.recipient_id) === userId;
          return <article key={offer.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 9, padding: 11, color: '#0f172a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <strong>{money(offer.amount)}</strong>
              <span style={{ color: statusColor[offer.status] || '#475569', fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{offer.status}</span>
            </div>
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 3 }}>{mine ? 'You sent this offer' : 'You received this offer'} · {offer.created_at ? new Date(offer.created_at).toLocaleString() : ''}</div>
            {offer.message ? <p style={{ fontSize: 12, margin: '7px 0 0', whiteSpace: 'pre-wrap' }}>{offer.message}</p> : null}
            {offer.expires_at && offer.status === 'pending' ? <div style={{ color: '#64748b', fontSize: 10, marginTop: 5 }}>Expires {new Date(offer.expires_at).toLocaleString()}</div> : null}
            {offer.status === 'pending' && recipient ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <button type="button" disabled={busy} onClick={() => act(offer, 'accept')} style={actionButton('#15803d')}>Accept</button>
              <button type="button" disabled={busy} onClick={() => act(offer, 'reject')} style={actionButton('#b91c1c')}>Decline</button>
              <input aria-label="Counter-offer amount in KES" inputMode="numeric" type="number" min="1" value={counterAmounts[offer.id] || ''} onChange={(e) => setCounterAmounts((old) => ({ ...old, [offer.id]: e.target.value }))} placeholder="Counter amount" style={counterInput} />
              <button type="button" disabled={busy} onClick={() => act(offer, 'counter')} style={actionButton('#176b87')}>Counter</button>
            </div> : null}
            {offer.status === 'pending' && mine ? <div style={{ marginTop: 8 }}><button type="button" disabled={busy} onClick={() => act(offer, 'withdraw')} style={smallButton}>Withdraw offer</button></div> : null}
          </article>;
        })}
      </div>
      {!pending ? <form onSubmit={submit} style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <label style={labelStyle}>New offer amount (KES)
          <input required type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1850000" style={formInput} />
        </label>
        <label style={labelStyle}>Message (optional)
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={2} placeholder="Add terms or context for your offer" style={{ ...formInput, resize: 'vertical' }} />
        </label>
        <button type="submit" disabled={busy || !userId} style={actionButton('#176b87')}>{busy ? 'Sending…' : 'Submit offer'}</button>
      </form> : null}
      {!loading && events.length > 0 ? <details style={{ marginTop: 10 }}><summary style={{ cursor: 'pointer', color: '#64748b', fontSize: 11 }}>View negotiation activity ({events.length})</summary><ol style={{ paddingLeft: 18, color: '#64748b', fontSize: 11 }}>{events.map((event) => <li key={event.id}>{event.event_type} · {money(event.amount)} · {new Date(event.created_at).toLocaleString()}</li>)}</ol></details> : null}
    </section>
  );
}

const muted = { color: '#64748b', fontSize: 11 };
const labelStyle = { display: 'grid', gap: 4, color: '#475569', fontSize: 11, fontWeight: 700 };
const formInput = { width: '100%', border: '1px solid #cbd5e1', borderRadius: 7, padding: '9px 10px', background: '#fff', color: '#0f172a', fontSize: 13 };
const counterInput = { minWidth: 120, flex: 1, border: '1px solid #cbd5e1', borderRadius: 7, padding: '7px 8px', fontSize: 12 };
const smallButton = { border: '1px solid #cbd5e1', borderRadius: 7, background: '#fff', color: '#475569', padding: '6px 9px', fontSize: 11, cursor: 'pointer' };
const actionButton = (color) => ({ border: 0, borderRadius: 7, background: color, color: '#fff', padding: '8px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer' });
