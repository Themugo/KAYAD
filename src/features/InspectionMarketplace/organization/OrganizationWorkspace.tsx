import React, { useMemo, useRef, useState } from 'react';
import organizationApi from '../services/organizationApi';
import { ROLE_LABEL, can } from './orgAccess';
import { Loading, ErrorBox, Pill, useLoader } from './orgUi';
import BranchesPanel from './BranchesPanel';
import TeamPanel from './TeamPanel';
import OperationsPanel from './OperationsPanel';
import OrgReportPanel from './OrgReportPanel';

type TabId = 'operations' | 'branches' | 'team' | 'report';

/** One workspace for the whole organization -> branches -> team model. Tabs shown depend on the role the SERVER reports for the
 *  signed-in person right now; the server rechecks every request, so a stale tab can never act beyond the person's real standing. */
export const OrganizationWorkspace: React.FC<{ organizationId: string; onClose?: () => void }> = ({ organizationId }) => {
  const org = useLoader(() => organizationApi.get(organizationId), [organizationId]);
  const [tab, setTab] = useState<TabId | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabs = useMemo(() => {
    const role = org.data?.you.role;
    return ([
      { id: 'operations' as const, label: role === 'inspector' || role === 'technician' ? 'My inspections' : 'Bookings', show: can(role, 'bookings') },
      { id: 'branches' as const, label: 'Branches', show: can(role, 'branches') },
      { id: 'team' as const, label: 'Team', show: can(role, 'team') },
      { id: 'report' as const, label: 'Report', show: can(role, 'report') },
    ]).filter((t) => t.show);
  }, [org.data]);

  if (org.loading && !org.data) return <Loading label="Opening your workspace…" />;
  if (org.error || !org.data) return <ErrorBox error={org.error} what="this organization" onRetry={org.reload} />;
  const o = org.data; const active = tab && tabs.some((t) => t.id === tab) ? tab : tabs[0]?.id;
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const move = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -i : e.key === 'End' ? tabs.length - 1 - i : 0;
    if (!move) return; e.preventDefault();
    const next = tabs[(i + move + tabs.length) % tabs.length]; setTab(next.id); refs.current[next.id]?.focus();
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black text-[#0A3340] break-words">{o.name}</h1>
        <Pill tone="neutral">{ROLE_LABEL[o.you.role]}</Pill>
        {o.lifecycleStage !== 'ACTIVE' && <Pill tone="warn">{o.lifecycleStage.replace(/_/g, ' ').toLowerCase()}</Pill>}
      </header>
      {o.lifecycleStage !== 'ACTIVE' && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">This business is not currently active on KAYAD, so it cannot take new jobs. You can still review existing work.</p>}
      {tabs.length === 0 ? (
        <p role="status" className="rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm text-[#64748B]">Your role has no workspace screens. Your assigned inspections appear under “Businesses you work with”.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Organization workspace" className="flex gap-1 overflow-x-auto border-b border-[#D7E7E4]">
            {tabs.map((t, i) => (
              <button key={t.id} ref={(el) => { refs.current[t.id] = el; }} id={`org-tab-${t.id}`} role="tab" type="button" aria-selected={active === t.id} aria-controls={`org-panel-${t.id}`} tabIndex={active === t.id ? 0 : -1}
                onKeyDown={(e) => onKey(e, i)} onClick={() => setTab(t.id)}
                className={`min-h-[44px] whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#13B8A6] ${active === t.id ? 'border-[#12576D] text-[#12576D]' : 'border-transparent text-[#64748B]'}`}>{t.label}</button>
            ))}
          </div>
          <div role="tabpanel" id={`org-panel-${active}`} aria-labelledby={`org-tab-${active}`} tabIndex={0}>
            {active === 'operations' && <OperationsPanel org={o} />}
            {active === 'branches' && <BranchesPanel org={o} />}
            {active === 'team' && <TeamPanel org={o} />}
            {active === 'report' && <OrgReportPanel org={o} />}
          </div>
        </>
      )}
    </div>
  );
};
export default OrganizationWorkspace;
