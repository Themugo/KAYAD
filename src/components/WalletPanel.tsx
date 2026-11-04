import React, { useCallback, useEffect, useRef, useState } from 'react';
import { walletAPI, formatKES } from '../api/api';

interface Props { auctionId?: string }

/** Wallet balance, loser commitment refunds (keep in wallet or send to own M-Pesa) and withdrawals. */
export default function WalletPanel({ auctionId }: Props) {
  const [wallet, setWallet] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const key = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const load = useCallback(() => walletAPI.get().then((d: any) => { setWallet(d.wallet); setError(null); }).catch((e: any) => setError(e?.response?.data?.message || 'Could not load your wallet.')), []);
  useEffect(() => { void load(); }, [load]);

  const act = async (fn: () => Promise<any>, ok: string) => {
    if (busy) return;
    setBusy(true); setNote(null);
    try { await fn(); setNote(ok); key.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`; await load(); }
    catch (e: any) { setNote(e?.response?.data?.message || e?.message || 'That did not go through. Your money is safe.'); }
    finally { setBusy(false); }
  };

  if (error) return <div role="alert" className="rounded-xl border p-4 text-sm">{error}</div>;
  if (!wallet) return <div className="rounded-xl border p-4 text-sm" aria-busy="true">Loading wallet…</div>;
  const refundable = (wallet.refundable || []).filter((r: any) => !auctionId || r.auctionId === auctionId);
  const btn = 'min-h-11 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50';

  return (
    <section aria-label="Wallet" data-testid="wallet-panel" className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--surface, #fff)' }}>
      <div className="flex items-baseline justify-between"><h3 className="text-base font-semibold">Wallet</h3><strong data-testid="wallet-balance">{formatKES(wallet.balance)}</strong></div>

      {refundable.map((r: any) => (
        <div key={r.holdId} className="rounded-lg border p-3 space-y-2" data-testid="refund-option">
          <p className="text-sm">Your bid commitment of <strong>{formatKES(r.amount)}</strong> is ready to be refunded.</p>
          {r.custody === 'dealer'
            ? <p className="text-sm">This commitment was paid straight to the dealer, so the dealer refunds it. KAYAD cannot move it for you.</p>
            : <div className="flex flex-wrap gap-2">
                <button className={btn} disabled={busy} onClick={() => act(() => walletAPI.refund(r.holdId, 'wallet'), 'Refund added to your wallet.')}>Keep in wallet</button>
                <button className={btn} disabled={busy} onClick={() => act(() => walletAPI.refund(r.holdId, 'mpesa'), 'Refund sent to your M-Pesa number. It can take a minute to arrive.')}>Send to my M-Pesa</button>
              </div>}
        </div>
      ))}

      {wallet.balance > 0 && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void act(() => walletAPI.withdraw(Number(amount), key.current), 'Withdrawal requested to your M-Pesa number.'); }}>
          <label className="text-sm">Withdraw to my M-Pesa (KES)
            <input className="mt-1 block min-h-11 w-40 rounded-lg border px-3" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button className={btn} type="submit" disabled={busy || !Number(amount) || Number(amount) > wallet.balance}>Withdraw</button>
          <button className={btn} type="button" disabled={busy} onClick={() => setAmount(String(Math.floor(wallet.balance)))}>All</button>
        </form>
      )}
      {note && <p role="status" className="text-sm">{note}</p>}
      {(wallet.transactions || []).length > 0 && (
        <ul className="text-sm space-y-1">
          {wallet.transactions.slice(0, 5).map((t: any) => <li key={t.id} className="flex justify-between"><span>{String(t.reason).replace(/_/g, ' ')}</span><span>{t.direction === 'credit' ? '+' : '−'}{formatKES(t.amount)}</span></li>)}
        </ul>
      )}
    </section>
  );
}
