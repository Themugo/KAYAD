import { useCallback, useEffect, useState } from 'react';
import leadApi from '../../../services/leadApi';
import MarketplaceOfferPanel from '../../../components/offers/MarketplaceOfferPanel';
import { RefreshCw, ChevronDown, ChevronUp, MessageSquareText } from 'lucide-react';

export default function BuyerNegotiationsPanel({ onOpenConversation = null } = {}) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await leadApi.myNegotiations();
      setLeads(Array.isArray(result?.leads) ? result.leads : []);
    } catch (err) {
      setError(err?.message || 'Unable to load your negotiations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    leadApi.myNegotiations()
      .then((result) => { if (active) setLeads(Array.isArray(result?.leads) ? result.leads : []); })
      .catch((err) => { if (active) setError(err?.message || 'Unable to load your negotiations.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <section aria-label="My offers and negotiations" className="rounded-2xl border border-[#D7E7E4] bg-white p-4 sm:p-5" data-kayad-buyer-negotiations="true">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8F7F3] text-[#0D766F]"><MessageSquareText size={17}/></span>
          <div><h2 className="text-base font-black text-[#0A3340]">My offers & negotiations</h2><p className="text-xs text-[#64748B]">Recorded offers and responses for your vehicle enquiries.</p></div>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#D7E7E4] px-3 text-xs font-bold text-[#12576D] disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh</button>
      </div>
      {loading ? <p role="status" className="mt-4 text-sm text-[#64748B]">Loading your offers…</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{error}</p> : null}
      {!loading && !error && leads.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-[#BDE5DE] bg-[#F8FBFA] p-5 text-center"><p className="text-sm font-bold text-[#0A3340]">No offer conversations yet</p><p className="mt-1 text-xs text-[#64748B]">Your vehicle enquiries and offer conversations will appear here.</p></div> : null}
      <div className="mt-4 grid gap-3">
        {leads.map((lead) => {
          const id = String(lead.id);
          const isExpanded = expanded === id;
          return (
            <article key={id} className="rounded-xl border border-[#D7E7E4] p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0"><p className="text-sm font-bold text-[#0A3340]">Vehicle enquiry</p><p className="mt-1 text-xs text-[#64748B]">Reference {id.slice(0, 8)} · {String(lead.stage || 'new').replace(/[_-]+/g, ' ')}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  {lead.chatId && onOpenConversation && <button type="button" onClick={() => onOpenConversation(lead.chatId)} className="min-h-9 rounded-lg border border-[#BDE5DE] px-3 text-xs font-bold text-[#12576D]">Open conversation</button>}
                  <button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => current === id ? '' : id)} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0A3340] px-3 text-xs font-bold text-white">{isExpanded ? 'Hide offers' : 'View offers'}{isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                </div>
              </div>
              {isExpanded ? <MarketplaceOfferPanel leadId={id} compact /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
