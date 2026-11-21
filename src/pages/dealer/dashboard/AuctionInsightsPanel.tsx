import React, { useEffect, useState } from 'react';
import { auctionEngagementAPI } from '../../../api/api';

/** Owner insights for one auction: audience totals, funnel and a 14-day trend. Aggregates only; no visitor identities. */
export default function AuctionInsightsPanel({ auctionId }: { auctionId: string }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { auctionEngagementAPI.insights(auctionId).then((d: any) => setData(d.insights)).catch((e: any) => setError(e?.response?.data?.message || 'Insights are not available yet.')); }, [auctionId]);
  if (error) return <p role="status" className="text-sm text-[#64748B]">{error}</p>;
  if (!data) return <p aria-busy="true" className="text-sm text-[#64748B]">Loading insights…</p>;
  const t = data.totals; const max = Math.max(1, ...data.daily.map((d: any) => d.visits));
  const stat = (label: string, v: number) => <div className="rounded-lg bg-white p-3"><div className="text-[11px] uppercase text-[#64748B]">{label}</div><div className="text-lg font-bold text-[#0A3340]">{Number(v).toLocaleString('en-KE')}</div></div>;
  return (
    <div data-testid="auction-insights" className="space-y-4 rounded-xl bg-[#F6FAF9] p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat('Watching now', t.liveWatchers)}{stat('Peak watchers', t.peakWatchers)}{stat('Views', t.visits)}{stat('Unique visitors', t.uniqueVisitors)}
        {stat('Followers', t.follows)}{stat('Likes', t.likes)}{stat('Comments', t.comments)}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold text-[#0A3340]">From interest to bids</h4>
        {data.funnel.map((f: any) => (
          <div key={f.key} className="mb-1.5">
            <div className="flex justify-between text-xs"><span>{f.label}</span><span>{Number(f.value).toLocaleString('en-KE')} · {f.pct}%</span></div>
            <div className="h-2 rounded bg-white"><div className="h-2 rounded bg-[#176B87]" style={{ width: `${Math.min(100, f.pct)}%` }} /></div>
          </div>
        ))}
      </div>
      {data.daily.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-[#0A3340]">Views, last 14 days</h4>
          <div className="flex h-24 items-end gap-1" role="img" aria-label="Daily views">
            {data.daily.map((d: any) => <div key={d.day} title={`${d.day}: ${d.visits} views, ${d.unique} unique`} className="flex-1 rounded-t bg-[#176B87]" style={{ height: `${Math.max(4, (d.visits / max) * 100)}%` }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
