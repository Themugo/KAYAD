import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, CircleHelp, ShieldAlert, Wrench } from 'lucide-react';

type CapabilityStatus = 'IMPLEMENTED AND VERIFIED' | 'IMPLEMENTED BUT UNVERIFIED' | 'PARTIAL' | 'NOT IMPLEMENTED';
type Capability = { name: string; status: CapabilityStatus; evidence: string; href?: string };
type Department = { name: string; summary: string; access: string; capabilities: Capability[] };

// This is a source-audited capability inventory, not a live health or KPI feed.
// Status describes code/contract evidence and deliberately does not claim runtime certification.
export const DEPARTMENT_CAPABILITIES: Department[] = [
  {
    name: 'Sales & Orders',
    summary: 'Existing listing, transaction and auction workflows.',
    access: 'Admin route guards and existing sales/transaction APIs; individual operations retain their backend authorization.',
    capabilities: [
      { name: 'Listing and vehicle administration', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Canonical vehicle and moderation pages; /api/cars and related listing routes.', href: '/admin/cars' },
      { name: 'Transaction oversight', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'AdminTransactions uses the existing payment API; transaction and payment routes are mounted.', href: '/admin/transactions' },
      { name: 'Auction operations', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing auction admin and fulfilment/settlement route families.', href: '/admin/auctions' },
      { name: 'Unified order-management lifecycle', status: 'PARTIAL', evidence: 'Existing transaction, marketplace fulfilment and auction fulfilment domains are separate; a single order lifecycle is not established by this inventory.' },
    ],
  },
  {
    name: 'Accounting & Finance',
    summary: 'Existing payments, escrow, ledger and reconciliation domains.',
    access: 'Ledger writes require MANAGE_FINANCE; other finance/reconciliation routes have their own role allowlists. Read and write boundaries require further certification.',
    capabilities: [
      { name: 'Payment/transaction oversight', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'AdminTransactions and /api/payments, /api/transactions routes.', href: '/admin/transactions' },
      { name: 'Escrow and custody', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing escrow pages and /api/escrow routes; no second ledger introduced.', href: '/admin/escrows' },
      { name: 'Ledger and reconciliation', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: '/api/ledger, /api/reconciliation and /api/finance; ledger writes have MANAGE_FINANCE guard. Existing escrow operations surface exposes reconciliation exceptions.', href: '/admin/escrows' },
      { name: 'Certified financial close and unified reporting', status: 'PARTIAL', evidence: 'Reports and reconciliation exist, but end-to-end runtime, database and separation-of-duties certification is not available in this checkpoint.' },
    ],
  },
  {
    name: 'Technical Operations',
    summary: 'Platform health, provider governance, security logs and operations views.',
    access: 'Detailed control-room and some platform tooling are Super Admin restricted; health endpoints and logs retain their route-level guards.',
    capabilities: [
      { name: 'Platform health and provider governance', status: 'PARTIAL', evidence: 'AdminPlatformHealth and provider governance sources exist; the prior report flags active composition/runtime certification as unresolved.', href: '/admin/provider-governance' },
      { name: 'Operations control room', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Canonical /admin/control-room route is marked Super Admin only.', href: '/admin/control-room' },
      { name: 'Security log', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Canonical security-log page and security/audit route families.', href: '/admin/security-log' },
      { name: 'Incident lifecycle and on-call acknowledgement', status: 'NOT IMPLEMENTED', evidence: 'No verified end-to-end incident ownership/acknowledgement contract was established in this audit.' },
    ],
  },
  {
    name: 'Inspections',
    summary: 'Inspection operations and inspector applications remain distinct workflows.',
    access: 'Existing inspection route family and MANAGE_INSPECTIONS permission where applied; inspector application decisions retain their own authorization.',
    capabilities: [
      { name: 'Inspection scheduling and operations', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing AdminInspections page and canonical inspection route family.', href: '/admin/inspections' },
      { name: 'Inspector application review', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Dedicated inspector application page and /api/inspector-applications.', href: '/admin/inspector-applications' },
      { name: 'Vehicle/document verification queue', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing NTSA verification queue and verification APIs.', href: '/admin/ntsa-queue' },
      { name: 'End-to-end inspection SLA reporting', status: 'PARTIAL', evidence: 'Inspection and analytics surfaces exist, but a certified cross-stage SLA contract was not established.' },
    ],
  },
  {
    name: 'Support & Disputes',
    summary: 'Existing support workspace, ticket, feedback and dispute domains.',
    access: 'Support viewer/agent access is separately guarded; dispute endpoints have their own protected route middleware.',
    capabilities: [
      { name: 'Support workspace and tickets', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'AdminSupportWorkspace, support-ticket routes and support dashboard routes.', href: '/admin/support' },
      { name: 'Dispute workflow', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'The protected /api/disputes route family and canonical escrow-centric dispute UI exist; the legacy AdminDisputes page itself is not registered as a separate canonical route.', href: '/admin/escrows' },
      { name: 'Feedback and conversation moderation', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing feedback/chat moderation pages and backend route families.', href: '/admin/feedback' },
      { name: 'Unified case-to-resolution SLA analytics', status: 'PARTIAL', evidence: 'Support analytics and dispute workflows exist separately; unified case correlation is not verified.' },
    ],
  },
  {
    name: 'Marketing & Communications',
    summary: 'Existing provider governance, communication controls, broadcast and content surfaces.',
    access: 'Admin-only communication template/provider controls; campaign/content tools retain existing route permissions.',
    capabilities: [
      { name: 'Communication templates, controls and delivery history', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: '/api/communications/admin/* and AdminCommunications.', href: '/admin/communications' },
      { name: 'Provider governance', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing AdminProviderGovernance component and provider-health/governance contracts.', href: '/admin/provider-governance' },
      { name: 'Broadcast and ad placement', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing broadcast and ad manager pages/routes.', href: '/admin/broadcast' },
      { name: 'Unified campaign attribution and ROI', status: 'PARTIAL', evidence: 'Analytics and campaign-adjacent capabilities exist, but a single verified campaign attribution/ROI contract was not established.' },
    ],
  },
  {
    name: 'Administration',
    summary: 'Staff governance, role permissions, settings and audit surfaces.',
    access: 'Staff, staff-permission and owner-management routes are Super Admin restricted; backend authorization remains authoritative.',
    capabilities: [
      { name: 'Staff directory and permission governance', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing staff pages, role/permission utilities and admin RBAC APIs.', href: '/admin/staff' },
      { name: 'Owner management', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing owner-management page and owner-only route guard.', href: '/admin/owners' },
      { name: 'Platform settings', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'Existing settings page and configuration routes.', href: '/admin/settings' },
      { name: 'Certified department-level access matrix', status: 'PARTIAL', evidence: 'Role catalog and route guards exist, but authorization is not uniformly expressed as a department capability contract.' },
    ],
  },
  {
    name: 'Reporting & Analytics',
    summary: 'Existing domain-specific reports; no invented consolidated totals.',
    access: 'Report, sales, finance and executive analytics endpoints retain their own route-level access controls.',
    capabilities: [
      { name: 'Submitted reports and moderation', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: 'AdminReports and /api/reports admin endpoints.', href: '/admin/reports' },
      { name: 'Sales and operations analytics APIs', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: '/api/v1/analytics/sales, /api/operations-dashboard and executive analytics route families. No unified owner-facing analytics page was verified.' },
      { name: 'Finance reconciliation reports', status: 'IMPLEMENTED BUT UNVERIFIED', evidence: '/api/finance and /api/reconciliation report contracts; existing escrow operations exposes reconciliation exceptions.', href: '/admin/escrows' },
      { name: 'Single cross-department reporting semantic model', status: 'NOT IMPLEMENTED', evidence: 'No verified shared metric definitions and cross-domain aggregation contract was found; do not calculate totals from UI samples.' },
    ],
  },
];

const STATUS_STYLE: Record<CapabilityStatus, string> = {
  'IMPLEMENTED AND VERIFIED': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'IMPLEMENTED BUT UNVERIFIED': 'border-sky-200 bg-sky-50 text-sky-800',
  PARTIAL: 'border-warning/30 bg-warning/10 text-warning',
  'NOT IMPLEMENTED': 'border-slate-300 bg-slate-100 text-slate-700',
};

function StatusBadge({ status }: { status: CapabilityStatus }) {
  return <span className={`inline-flex max-w-full rounded-full border px-2 py-1 text-[10px] font-bold leading-4 ${STATUS_STYLE[status]}`}>{status}</span>;
}

export default function AdminDepartmentCapabilities() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CapabilityStatus | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredDepartments = useMemo(() => DEPARTMENT_CAPABILITIES.map((department) => ({
    ...department,
    capabilities: department.capabilities.filter((capability) => {
      const matchesStatus = statusFilter === 'ALL' || capability.status === statusFilter;
      const searchable = `${department.name} ${department.summary} ${department.access} ${capability.name} ${capability.evidence}`.toLocaleLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    }),
  })).filter((department) => (departmentFilter === 'ALL' || department.name === departmentFilter) && department.capabilities.length > 0), [normalizedQuery, statusFilter, departmentFilter]);
  const visibleCapabilities = filteredDepartments.reduce((count, department) => count + department.capabilities.length, 0);

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5" aria-labelledby="department-capability-heading" data-testid="department-capability-matrix">
      <header className="rounded-xl border border-[#DCE8EB] bg-white p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[#EAF4F5] p-3 text-[#176B87]"><Building2 className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#58717A]">Owner capability inventory</p>
            <h2 id="department-capability-heading" className="mt-1 text-xl font-bold text-[#0B3440]">Departmental operations</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#58717A]">This is a source-audited map of existing capabilities, not a live operational dashboard. “Implemented but unverified” means relevant code and routes exist; it does not certify runtime behavior, production data or end-to-end workflow completion.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Capability status definitions">
          {(['IMPLEMENTED AND VERIFIED', 'IMPLEMENTED BUT UNVERIFIED', 'PARTIAL', 'NOT IMPLEMENTED'] as CapabilityStatus[]).map((status) => <StatusBadge key={status} status={status} />)}
        </div>
      </header>

      <section aria-label="Filter department capabilities" className="grid min-w-0 gap-3 rounded-xl border border-[#DCE8EB] bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="min-w-0 text-xs font-semibold text-[#45636C]">Search departments and capabilities
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workflows, routes or evidence…" className="mt-1 min-h-11 w-full rounded-lg border border-[#BFD3D9] bg-white px-3 text-sm text-[#0B3440] placeholder:text-[#789099] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2" type="search" />
        </label>
        <label className="min-w-0 text-xs font-semibold text-[#45636C]">Capability status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as CapabilityStatus | 'ALL')} className="mt-1 min-h-11 w-full rounded-lg border border-[#BFD3D9] bg-white px-3 text-sm text-[#0B3440] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2">
            <option value="ALL">All statuses</option>
            {(['IMPLEMENTED AND VERIFIED', 'IMPLEMENTED BUT UNVERIFIED', 'PARTIAL', 'NOT IMPLEMENTED'] as CapabilityStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-xs font-semibold text-[#45636C]">Department
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-[#BFD3D9] bg-white px-3 text-sm text-[#0B3440] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2">
            <option value="ALL">All departments</option>
            {DEPARTMENT_CAPABILITIES.map((department) => <option key={department.name} value={department.name}>{department.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[#58717A] sm:col-span-2 xl:col-span-3" aria-live="polite" role="status">
          <span>Showing {visibleCapabilities} of {DEPARTMENT_CAPABILITIES.reduce((count, department) => count + department.capabilities.length, 0)} capabilities across {filteredDepartments.length} departments.</span>
          <button type="button" onClick={() => { setQuery(''); setStatusFilter('ALL'); setDepartmentFilter('ALL'); }} className="min-h-10 rounded-lg px-3 font-semibold text-[#176B87] hover:bg-[#EAF4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2" disabled={!query && statusFilter === 'ALL' && departmentFilter === 'ALL'}>Reset filters</button>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {filteredDepartments.map((department) => (
          <article key={department.name} className="min-w-0 rounded-xl border border-[#DCE8EB] bg-white p-4 sm:p-5" aria-labelledby={`department-${department.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 id={`department-${department.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="font-bold text-[#0B3440]">{department.name}</h3>
                <p className="mt-1 text-sm leading-5 text-[#58717A]">{department.summary}</p>
              </div>
              <Wrench className="mt-1 h-4 w-4 shrink-0 text-[#176B87]" aria-hidden="true" />
            </div>
            <p className="mt-3 rounded-lg bg-[#F6FAFA] p-3 text-xs leading-5 text-[#45636C]"><strong>Access:</strong> {department.access}</p>
            <ul className="mt-3 space-y-3">
              {department.capabilities.map((capability) => (
                <li key={capability.name} className="min-w-0 border-t border-[#E7EFF0] pt-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-[#173E48]">{capability.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[#58717A]">{capability.evidence}</p>
                    </div>
                    <StatusBadge status={capability.status} />
                  </div>
                  {capability.href && <Link to={capability.href} className="mt-2 inline-flex min-h-10 items-center gap-1 rounded-md pr-2 text-xs font-semibold text-[#176B87] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2" aria-label={`Open existing ${capability.name} workflow`}>Open existing workflow <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
                </li>
              ))}
            </ul>
          </article>
        ))}
        {filteredDepartments.length === 0 && <div className="rounded-xl border border-dashed border-[#BFD3D9] bg-white p-8 text-center xl:col-span-2" role="status"><p className="font-semibold text-[#0B3440]">No matching capabilities</p><p className="mt-1 text-sm text-[#58717A]">Try another search term or reset the filters.</p><button type="button" onClick={() => { setQuery(''); setStatusFilter('ALL'); setDepartmentFilter('ALL'); }} className="mt-3 min-h-10 rounded-lg border border-[#BFD3D9] px-4 text-sm font-semibold text-[#176B87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87]">Clear filters</button></div>}
      </div>
      <aside className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning" role="note">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>Financial controls remain a release risk: existing routes use different role/permission guards. This inventory does not grant access, alter role permissions or authorize financial writes. Do not treat Super Admin visibility as a substitute for audit trails or separation of duties.</p>
      </aside>
      <p className="flex items-start gap-2 text-xs leading-5 text-[#58717A]"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> No new records, database tables, financial totals, or department-specific backend APIs are created by this inventory.</p>
    </section>
  );
}
