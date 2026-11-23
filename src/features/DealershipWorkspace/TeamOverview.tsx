import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CommandCentreData } from '../../pages/dealer/dashboard/CommandCentrePanel';

/**
 * Overview for a delegated team member. It renders ONLY what GET /api/dealer-platform/command-centre returned for this member's permissions
 * (the server decides; nothing is hidden here that was sent, and nothing is guessed). It never shows banking, payout, escrow, fee, refund or
 * settlement data: the server does not send them to members. Information model: reports/DEALER-TEAM-WORKSPACE-OVERVIEW.md.
 */
export type WorkspaceTab = 'inventory' | 'leads' | 'customers';
type Props = { data: CommandCentreData; tabs: WorkspaceTab[]; onOpenTab: (tab: WorkspaceTab) => void };

// Where an attention item can go INSIDE the team workspace. Anything else is shown as information only (no invented destination).
const TAB_FOR: Record<string, WorkspaceTab> = { inventory: 'inventory', leads: 'leads' };
const ACTION_LABEL: Record<string, string> = { dealer_hide: 'Paused a listing', dealer_publish: 'Published a listing', dealer_mark_sold: 'Marked a vehicle sold' };
const ksh = (n: number) => `Ksh ${Math.round(n).toLocaleString('en-KE')}`;

export const hasOverviewContent = (d: CommandCentreData | null | undefined) =>
  !!d && !!(d.listings || d.leads || d.financial?.releasedRevenue || d.auctions || (d.attention && d.attention.length));

const Tile = ({ id, label, value }: { id: string; label: string; value: React.ReactNode }) => (
  <div data-testid={id} className="rounded-xl border border-[#D7E7E4] bg-white p-3"><p className="text-xs font-semibold text-[#475569]">{label}</p><p className="mt-1 text-xl font-black text-[#0A3340]">{value}</p></div>
);

export default function TeamOverview({ data, tabs, onOpenTab }: Props) {
  const { listings, leads, auctions, financial, attention = [], myActivity } = data;
  const missing = new Set(data.unavailable || []);
  return (
    <section aria-label="Your overview" data-testid="team-overview" className="space-y-4">
      {missing.size > 0 && <p role="status" data-testid="team-overview-partial" className="rounded-lg border border-[#FEDF89] bg-[#FFFAEB] p-3 text-sm text-[#7A2E0E]">Some figures are not available yet ({[...missing].join(', ').replace(/_/g, ' ')}). They are hidden rather than shown as zero.</p>}
      <div className="rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-3 sm:p-4">
        <h2 id="to-attention" className="flex items-center gap-2 font-bold text-[#0A3340]"><AlertCircle className="h-4 w-4 text-[#176B87]" aria-hidden="true" />Needs your attention</h2>
        {attention.length === 0 ? (
          <p data-testid="team-attention-empty" className="mt-3 flex items-center gap-2 rounded-lg bg-white p-3 text-sm text-[#475569]"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />Nothing needs your attention right now.</p>
        ) : (
          <ul aria-labelledby="to-attention" className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="team-attention">
            {attention.map((item) => {
              const tab = TAB_FOR[item.target.section];
              const go = tab && tabs.includes(tab) ? tab : null;
              const body = <><span className="font-semibold">{item.count}</span> {item.label}{item.detail ? <span className="block text-xs text-[#64748B]">{item.detail}</span> : null}</>;
              return (
                <li key={item.id}>
                  {go
                    ? <button type="button" data-testid={`team-attention-${item.id}`} onClick={() => onOpenTab(go)} aria-label={`${item.count} ${item.label}. Open ${go}`} className="min-h-11 w-full rounded-lg border border-[#D7E7E4] bg-white p-3 text-left text-sm text-[#0A3340] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176B87]">{body}</button>
                    : <div data-testid={`team-attention-${item.id}`} className="rounded-lg border border-[#D7E7E4] bg-white p-3 text-sm text-[#0A3340]">{body}</div>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {(listings || leads || financial?.releasedRevenue || auctions) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="team-tiles">
          {listings && <><Tile id="to-active" label="Active listings" value={listings.active} /><Tile id="to-pending" label="Pending approval" value={listings.pendingApproval} /><Tile id="to-draft" label="Drafts" value={listings.draft} /><Tile id="to-sold" label="Sold vehicles" value={listings.sold} /></>}
          {leads && <><Tile id="to-enquiries" label="New enquiries" value={leads.newEnquiries} /><Tile id="to-unanswered" label="Unanswered leads" value={leads.unansweredLeads} />{!missing.has('offers') && <Tile id="to-offers" label="Open offers" value={leads.offersAwaitingDecision} />}</>}
          {auctions && <><Tile id="to-live-auctions" label="Live auctions" value={auctions.active} /><Tile id="to-upcoming-auctions" label="Upcoming auctions" value={auctions.upcoming} /></>}
          {financial?.releasedRevenue && <Tile id="to-revenue" label="Released sales revenue" value={ksh(financial.releasedRevenue.amount)} />}
        </div>
      )}
      {myActivity && (
        <div className="rounded-xl border border-[#D7E7E4] bg-white p-3 sm:p-4">
          <h2 className="font-bold text-[#0A3340]">Your recent activity</h2>
          {myActivity.length === 0 ? <p data-testid="team-my-activity-empty" className="mt-2 text-sm text-[#64748B]">No recorded activity yet.</p> : (
            <ul className="mt-2 divide-y divide-[#E1EDEB] text-sm" data-testid="team-my-activity">{myActivity.map((a) => <li key={a.id} className="flex justify-between gap-3 py-2"><span>{ACTION_LABEL[a.action] || 'Updated a listing'}</span><time className="text-xs text-[#64748B]" dateTime={a.at}>{new Date(a.at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</time></li>)}</ul>
          )}
        </div>
      )}
    </section>
  );
}
