import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw } from 'lucide-react';
import type { EscrowProgram } from '../../services/escrowApi';
import { formatKes } from './escrowModel';

export type ProgramState = { status: 'loading' } | { status: 'unavailable' } | { status: 'ready'; program: EscrowProgram };

interface Props {
  program: ProgramState;
  signedIn: boolean;
  onRetryProgram: () => void;
  onOpenAuth?: () => void;
  onOpenDeals: () => void;
  onNavigate?: (nav: string) => void;
}

const STEPS: Array<{ title: string; body: string }> = [
  { title: 'Check that escrow applies', body: 'Escrow is offered only on vehicles and sellers KAYAD has approved for it. Look for the Escrow badge on the listing; if it is not there, the purchase is not escrow-protected.' },
  { title: 'Fund the escrow', body: 'The buyer pays using the funding method shown for that deal. A payment you have started is not a payment KAYAD has confirmed — the escrow is marked funded only after KAYAD’s records show the money received.' },
  { title: 'Inspect and accept', body: 'Before accepting, check the vehicle against the listing. You can arrange an independent inspection through KAYAD. Accepting tells KAYAD you are satisfied; it does not pay the seller on its own.' },
  { title: 'Seller confirms delivery', body: 'After the buyer has accepted the vehicle, the seller confirms the handover.' },
  { title: 'Release', body: 'KAYAD staff release the funds after the buyer asks for release, or the escrow becomes eligible for automatic release once its release window has passed with no dispute. A dispute stops release until staff decide.' },
  { title: 'Payout and closing', body: 'Releasing an escrow and paying the seller are separate steps. Closing is KAYAD’s administrative record that the escrow is finished.' },
];

const NOT_PROMISED: string[] = [
  'Escrow is not insurance, and it is not an automatic refund promise. A refund happens only when KAYAD staff approve one through the dispute process.',
  'KAYAD does not inspect a vehicle for you unless you book an inspection, and an escrow badge says nothing about the vehicle’s condition.',
  'Escrow does not transfer ownership. Collection and ownership transfer are separate steps recorded by the seller.',
  'KAYAD does not claim a banking or trust-account licence on this page. Do not rely on any other page for such a claim.',
];

export const PublicEscrowExplainer: React.FC<Props> = ({ program, signedIn, onRetryProgram, onOpenAuth, onOpenDeals, onNavigate }) => (
  <div className="space-y-8">
    <section aria-labelledby="escrow-status-heading" className="rounded-2xl border border-[#D7E7E4] bg-white p-5">
      <h2 id="escrow-status-heading" className="text-sm font-extrabold uppercase tracking-wide text-[#176B87]">Is escrow available right now?</h2>
      <div className="mt-3" aria-live="polite">
        {program.status === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-[#64748B]"><Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> Checking the current escrow programme…</p>
        )}
        {program.status === 'unavailable' && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="flex items-start gap-2 text-sm text-[#12576D]"><AlertTriangle className="w-4 h-4 mt-0.5 text-[#176B87] shrink-0" aria-hidden="true" /> We couldn’t check whether escrow is switched on right now, so we won’t say either way.</p>
            <button type="button" onClick={onRetryProgram} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-[#BDE5DE] text-sm font-bold text-[#12576D] hover:bg-[#F6FAF9]"><RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again</button>
          </div>
        )}
        {program.status === 'ready' && program.program.enabled && (
          <div className="space-y-2">
            <p className="flex items-start gap-2 text-sm text-[#0A3340]"><CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" aria-hidden="true" /> <span><strong>Escrow is switched on.</strong> It still applies only to vehicles and sellers approved for it.</span></p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3"><dt className="text-xs font-bold uppercase text-[#64748B]">Automatic release window</dt><dd className="mt-1 font-bold text-[#0A3340]">{program.program.releaseDays} day{program.program.releaseDays === 1 ? '' : 's'} after funding</dd></div>
              <div className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3"><dt className="text-xs font-bold uppercase text-[#64748B]">Minimum</dt><dd className="mt-1 font-bold text-[#0A3340]">{program.program.minimumAmount > 0 ? formatKes(program.program.minimumAmount) : 'No minimum set'}</dd></div>
              <div className="rounded-xl bg-[#F6FAF9] border border-[#D7E7E4] p-3"><dt className="text-xs font-bold uppercase text-[#64748B]">Maximum</dt><dd className="mt-1 font-bold text-[#0A3340]">{program.program.maximumAmount != null ? formatKes(program.program.maximumAmount) : 'No maximum set'}</dd></div>
            </dl>
          </div>
        )}
        {program.status === 'ready' && !program.program.enabled && (
          <p className="flex items-start gap-2 text-sm text-[#0A3340]"><Info className="w-4 h-4 mt-0.5 text-[#176B87] shrink-0" aria-hidden="true" /> <span><strong>Escrow is currently paused.</strong> Vehicles can still be bought directly, but no escrow protection applies to new purchases while it is paused. Existing escrows continue to be handled.</span></p>
        )}
      </div>
    </section>

    <section aria-labelledby="escrow-how-heading">
      <h2 id="escrow-how-heading" className="text-lg font-extrabold text-[#0A3340]">How a protected transaction works</h2>
      <ol className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-2xl border border-[#D7E7E4] bg-white p-4 flex gap-3">
            <span aria-hidden="true" className="shrink-0 w-8 h-8 rounded-full bg-[#176B87] text-white text-sm font-black flex items-center justify-center">{i + 1}</span>
            <div><h3 className="text-sm font-extrabold text-[#0A3340]">{s.title}</h3><p className="mt-1 text-sm text-[#64748B] leading-relaxed">{s.body}</p></div>
          </li>
        ))}
      </ol>
    </section>

    <section aria-labelledby="escrow-limits-heading" className="rounded-2xl border border-[#BDE5DE] bg-[#F3FAF9] p-5">
      <h2 id="escrow-limits-heading" className="text-base font-extrabold text-[#0A3340]">What escrow does not promise</h2>
      <ul className="mt-3 space-y-2 text-sm text-[#12576D] list-disc pl-5">{NOT_PROMISED.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>

    <section aria-labelledby="escrow-next-heading" className="rounded-2xl border border-[#D7E7E4] bg-white p-5">
      <h2 id="escrow-next-heading" className="text-base font-extrabold text-[#0A3340]">What you can do next</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={() => onNavigate?.('marketplace')} className="min-h-[44px] px-4 rounded-xl bg-[#176B87] text-white text-sm font-bold hover:bg-[#12556b]">Browse vehicles</button>
        <button type="button" onClick={() => onNavigate?.('auctions')} className="min-h-[44px] px-4 rounded-xl border border-[#BDE5DE] text-sm font-bold text-[#12576D] hover:bg-[#F6FAF9]">See auctions</button>
        {signedIn
          ? <button type="button" onClick={onOpenDeals} className="min-h-[44px] px-4 rounded-xl border border-[#BDE5DE] text-sm font-bold text-[#12576D] hover:bg-[#F6FAF9]">Go to my protected deals</button>
          : <button type="button" onClick={onOpenAuth} className="min-h-[44px] px-4 rounded-xl border border-[#BDE5DE] text-sm font-bold text-[#12576D] hover:bg-[#F6FAF9]">Sign in to follow your deals</button>}
      </div>
    </section>
  </div>
);

export const HowDealsStart: React.FC<{ signedIn: boolean; onOpenDeals: () => void; onOpenAuth?: () => void }> = ({ signedIn, onOpenDeals, onOpenAuth }) => (
  <section aria-labelledby="escrow-start-heading" className="rounded-2xl border border-[#D7E7E4] bg-white p-5 space-y-3">
    <h2 id="escrow-start-heading" className="text-lg font-extrabold text-[#0A3340]">How a deal enters escrow</h2>
    <p className="text-sm text-[#12576D] leading-relaxed">You can’t open an escrow from this page. A deal is opened by KAYAD’s purchase and auction-settlement workflows for a vehicle that is approved for escrow, and it then appears under <strong>My protected deals</strong> for both the buyer and the seller.</p>
    <ul className="list-disc pl-5 text-sm text-[#12576D] space-y-1">
      <li>Check the listing for the Escrow badge before you pay anyone.</li>
      <li>Agree the price and handover details with the seller in KAYAD messages, so the conversation is on the record.</li>
      <li>If you have paid for an escrow vehicle and no deal appears, contact KAYAD support with your payment reference; do not pay a second time.</li>
    </ul>
    {signedIn
      ? <button type="button" onClick={onOpenDeals} className="min-h-[44px] px-4 rounded-xl bg-[#176B87] text-white text-sm font-bold hover:bg-[#12556b]">Open my protected deals</button>
      : <button type="button" onClick={onOpenAuth} className="min-h-[44px] px-4 rounded-xl bg-[#176B87] text-white text-sm font-bold hover:bg-[#12556b]">Sign in</button>}
  </section>
);
