import React, { useCallback, useEffect, useState } from 'react';
import { walletAPI, auctionEngagementAPI } from '../../api/api';

const msg = (e: any, f: string) => e?.response?.data?.message || e?.message || f;

/** Staff: verify dealers' own paybill/till accounts and moderate reported auction comments. */
export default function AdminAuctionAudiencePanel() {
  const [accounts, setAccounts] = useState<any[] | null>(null);
  const [reported, setReported] = useState<any[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    walletAPI.adminAccounts('pending').then((d: any) => setAccounts(d.accounts || [])).catch((e: any) => { setAccounts([]); setNote(msg(e, 'Could not load dealer accounts.')); });
    auctionEngagementAPI.reported().then((d: any) => setReported(d.comments || [])).catch((e: any) => { setReported([]); setNote(msg(e, 'Could not load reported comments.')); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const review = async (id: string, decision: 'verified' | 'disabled') => {
    if (busy) return; setBusy(id); setNote(null);
    try { await walletAPI.reviewAccount(id, decision); setAccounts((cur) => (cur || []).filter((a) => a.id !== id)); setNote(decision === 'verified' ? 'Account verified. Bidders will now pay this dealer directly.' : 'Account disabled.'); }
    catch (e) { setNote(msg(e, 'Could not update the account.')); } finally { setBusy(null); }
  };
  const hide = async (c: any) => {
    if (busy) return; setBusy(c.id); setNote(null);
    try { await auctionEngagementAPI.removeComment(c.auctionId, c.id); setReported((cur) => (cur || []).filter((x) => x.id !== c.id)); }
    catch (e) { setNote(msg(e, 'Could not hide the comment.')); } finally { setBusy(null); }
  };
  const btn = 'min-h-11 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50';
  return (
    <section aria-label="Auction audience and custody" data-testid="admin-audience-panel" style={{ marginTop: 32 }} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dealer collection accounts awaiting verification</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Check the owner against the dealer&rsquo;s verified business before approving. Until approved, KAYAD holds the commitment.</p>
        {accounts === null ? <p aria-busy="true">Loading…</p> : accounts.length === 0 ? <p className="text-sm">Nothing waiting.</p> : (
          <ul className="space-y-2">{accounts.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div className="text-sm"><strong>{a.ownerName || 'Dealer'}</strong> · {a.ownerEmail || a.userId}<br />{a.kind === 'till' ? `Till ${a.tillNumber} (shortcode ${a.shortcode})` : `Paybill ${a.shortcode}`}{a.accountLabel ? ` · ${a.accountLabel}` : ''}</div>
              <div className="flex gap-2">
                <button className={btn} disabled={busy === a.id} onClick={() => review(a.id, 'verified')}>Verify</button>
                <button className={btn} disabled={busy === a.id} onClick={() => review(a.id, 'disabled')}>Reject</button>
              </div>
            </li>))}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold">Reported auction comments</h2>
        {reported === null ? <p aria-busy="true">Loading…</p> : reported.length === 0 ? <p className="text-sm">No reported comments.</p> : (
          <ul className="space-y-2">{reported.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3">
              <div className="min-w-0 text-sm"><strong>{c.author}</strong> · {c.reports} report{c.reports === 1 ? '' : 's'}{c.reasons?.length ? ` (${c.reasons.join('; ')})` : ''}<p style={{ overflowWrap: 'anywhere', margin: '4px 0 0' }}>{c.body}</p></div>
              <button className={btn} disabled={busy === c.id} onClick={() => hide(c)}>Hide</button>
            </li>))}
          </ul>
        )}
      </div>
      {note && <p role="status" className="text-sm">{note}</p>}
    </section>
  );
}
