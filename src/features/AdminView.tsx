import React, { useEffect, useMemo, useState } from 'react';
import type { Vehicle } from '../types';
import { adminAPI } from '../api/api.exports';
import {
  AlertTriangle,
  Ban,
  Car,
  CheckCircle2,
  Compass,
  FileCheck,
  History,
  LifeBuoy,
  Send,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wrench as ProvidersIcon,
} from 'lucide-react';
import { Badge, Button, Card, Input, StatWidget, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import AdminCommunications from '../pages/admin/AdminCommunications';
import AdminNavigationControl from './AdminNavigationControl';
import AdminProviderGovernance from './AdminProviderGovernance';
import AdminSupportWorkspace from './AdminSupportWorkspace';
// STAGE 5A (Gate D): the owner onboarding settings page was built in Stage 5 but never mounted anywhere reachable.
import AdminSettingsOnboarding from '../pages/admin/AdminSettingsOnboarding';
// STAGE 5B: owner membership management (owner-only on the server; the tab is shown only to owners).
import AdminOwnerManagement from '../pages/admin/AdminOwnerManagement';
import AdminAuctionVerification from './AdminAuctionVerification'; // STAGE 5F.10
import { useAuth } from '../context/AuthContext';

interface AdminViewProps {
  vehicles: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

type AdminStats = Record<string, number | null>;
type QueueFilter = 'pendingDealers' | 'pendingVehicles' | null;
type AdminUser = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  isBanned?: boolean;
  approved?: boolean;
  status?: string;
};
type AdminCar = {
  _id: string;
  title?: string;
  status?: string;
  auctionStatus?: string;
  price?: number;
  dealer?: { name?: string; email?: string };
  seller?: { name?: string; email?: string };
};
type AuditRecord = {
  _id?: string;
  id?: string;
  action?: string;
  module?: string;
  actor?: { name?: string; email?: string };
  user?: { name?: string; email?: string };
  targetId?: string;
  createdAt?: string;
  timestamp?: string;
};

function unwrap<T = any>(value: any): T {
  if (value && typeof value === 'object' && 'data' in value) return value.data as T;
  return value as T;
}

export const AdminView: React.FC<AdminViewProps> = ({ vehicles, onQuickViewVehicle }) => {
  const { user: sessionUser } = useAuth();
  const isOwner = (sessionUser as { isOwner?: boolean } | null)?.isOwner === true; // display only — the server enforces owner authority on every call
  const [stats, setStats] = useState<AdminStats>({});
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [cars, setCars] = useState<AdminCar[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [module, setModule] = useState<'overview' | 'users' | 'cars' | 'audit' | 'communications' | 'navigation' | 'providers' | 'support' | 'onboarding' | 'auctions' | 'owners'>('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statsStatus, setStatsStatus] = useState<'loading' | 'ready' | 'stale' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Queue tiles open their destination list already filtered to the rows the tile counts.
  const [queue, setQueue] = useState<QueueFilter>(null);
  // Sources the server refused for this role (403). That is an access boundary, not an outage, and is reported as such.
  const [restricted, setRestricted] = useState<string[]>([]);

  const load = async (activeQueue: QueueFilter = queue) => {
    setLoading(true);
    setError(null);
    setStatsStatus((current) => current === 'ready' || current === 'stale' ? 'stale' : 'loading');

    // Dashboard sources are independent. One failed source must not erase successful
    // results from the others or make the entire command centre look unavailable.
    const results = await Promise.allSettled([
      adminAPI.stats(),
      adminAPI.users({ page: 1, limit: 50, search: search || undefined, ...(activeQueue === 'pendingDealers' ? { role: 'dealer', pendingApproval: true } : {}) }),
      adminAPI.cars({ page: 1, limit: 50, search: search || undefined, ...(activeQueue === 'pendingVehicles' ? { status: 'pending' } : {}) }),
      adminAPI.getAuditLog({ page: 1, limit: 25 }),
    ] as const);

    const failures: string[] = [];
    const denied: string[] = [];
    const [statsResult, usersResult, carsResult, auditResult] = results;
    const isDenied = (r: PromiseSettledResult<unknown>) => r.status === 'rejected' && (r.reason as any)?.response?.status === 403;
    const note = (r: PromiseSettledResult<unknown>, label: string, failLabel: string) => {
      if (isDenied(r)) denied.push(label); else failures.push(failLabel);
    };

    if (statsResult.status === 'fulfilled') {
      const payload = unwrap<any>(statsResult.value);
      const nextStats = payload?.stats ?? payload;
      if (nextStats && typeof nextStats === 'object' && !Array.isArray(nextStats)) {
        setStats(nextStats);
        setStatsStatus('ready');
      } else {
        setStatsStatus((current) => current === 'stale' ? 'stale' : 'error');
        failures.push('dashboard statistics returned an invalid response');
      }
    } else {
      setStatsStatus((current) => current === 'stale' ? 'stale' : 'error');
      note(statsResult, 'dashboard statistics', 'dashboard statistics');
    }

    if (usersResult.status === 'fulfilled') {
      const payload = unwrap<any>(usersResult.value);
      if (Array.isArray(payload?.users)) {
        // The API returns `id` in some deployments rather than Mongo-style `_id`.
        setUsers(payload.users.map((u: any) => ({ ...u, _id: u._id ?? u.id })));
      } else {
        failures.push('user records (invalid response)');
      }
    } else {
      note(usersResult, 'user records', 'user records');
    }

    if (carsResult.status === 'fulfilled') {
      const payload = unwrap<any>(carsResult.value);
      if (Array.isArray(payload?.cars)) {
        setCars(payload.cars.map((c: any) => ({ ...c, _id: c._id ?? c.id })));
      } else {
        failures.push('vehicle records (invalid response)');
      }
    } else {
      note(carsResult, 'vehicle records', 'vehicle records');
    }

    if (auditResult.status === 'fulfilled') {
      const payload = unwrap<any>(auditResult.value);
      const entries = payload?.entries ?? payload?.logs ?? payload?.auditLogs;
      if (Array.isArray(entries)) setAuditLogs(entries);
      else failures.push('audit log (invalid response)');
    } else {
      note(auditResult, 'audit log', 'audit log');
    }
    setRestricted(denied);

    setError(failures.length
      ? `Some operational data sources are unavailable: ${failures.join(', ')}. Other successful results remain available.`
      : null);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase().includes(q));
  }, [users, search]);

  const filteredCars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter((c) => `${c.title || ''} ${c._id} ${c.status || ''}`.toLowerCase().includes(q));
  }, [cars, search]);

  const toggleBan = async (user: AdminUser) => {
    setBusyId(user._id);
    setActionError(null);
    try {
      await adminAPI.toggleBan(user._id);
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'The server rejected this account action.');
    } finally {
      setBusyId(null);
    }
  };

  // STAGE 5A (Gate F): the dealer/seller decision and listing moderation controls existed only on pages that are not mounted
  // anywhere reachable. The server remains the authority (owner_only / admins policy); these buttons only call it and show its answer.
  const decideSeller = async (user: AdminUser, action: 'approve' | 'reject') => {
    setBusyId(user._id);
    setActionError(null);
    try {
      if (action === 'approve') await adminAPI.approveDealer(user._id);
      else await adminAPI.verifyDealer(user._id, { action: 'reject', reason: 'Application not approved' });
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'The server rejected this application decision.');
    } finally {
      setBusyId(null);
    }
  };

  const moderateListing = async (car: AdminCar, action: 'approve' | 'hide') => {
    setBusyId(car._id);
    setActionError(null);
    try {
      await adminAPI.moderateCar(car._id, { action });
      await load();
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'The server rejected this listing decision.');
    } finally {
      setBusyId(null);
    }
  };

  const verifyCar = async (car: AdminCar) => {
    setBusyId(car._id);
    setActionError(null);
    try {
      await adminAPI.verifyCar(car._id, { ntsaVerified: true, logbookVerified: true });
      await load();
    } catch (err: any) {
      setActionError(err?.message || 'The server rejected this vehicle verification action.');
    } finally {
      setBusyId(null);
    }
  };

  // Missing or malformed metrics must never masquerade as a healthy zero.
  // A numeric zero is shown only when the API actually returned zero.
  const stat = (key: string) => {
    const value = stats[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return statsStatus === 'loading' || (loading && statsStatus !== 'stale') ? 'Loading…' : 'Unavailable';
    }
    return value.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#CFE2E7] bg-white shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#0B3440] via-[#176B87] to-[#13B8A6]" />
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#0F7A74]">
              <ShieldCheck className="h-4 w-4 shrink-0" /> KAYAD Operations
              <span className="rounded-full border border-[#D7E7E4] bg-[#F4FAF9] px-2 py-1 tracking-normal text-[#49656D]">{isOwner ? 'Owner access' : 'Administration'}</span>
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#0B3440] sm:text-3xl">Command centre</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#58717A]">Review marketplace decisions, operational queues and administration activity from the protected KAYAD backend.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="text-xs text-[#64748B]" aria-live="polite">{loading ? 'Refreshing operational data…' : error ? (statsStatus === 'stale' ? 'Showing last successful statistics; some sources failed' : 'Some operational data is unavailable') : 'Latest request completed'}</div>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh administration data"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
          </div>
        </div>
      </section>

      {(error || actionError) && (
        <Card className="p-4 border-[#BDE5DE] bg-[#F3FAF9] text-[#0A3340] text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError || error}</span>
        </Card>
      )}

      {restricted.length > 0 && (
        <p role="note" className="text-xs text-[#58717A]">Not included in your role: {restricted.join(', ')}. This is an access boundary, not an outage.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {([...(['overview', 'users', 'cars', 'audit', 'communications', 'navigation', 'providers', 'support', 'onboarding', 'auctions'] as const), ...(isOwner ? (['owners'] as const) : [])]).map((item) => (
          <Button key={item} variant={module === item ? 'primary' : 'outline'} size="sm" onClick={() => setModule(item)}>
            {item === 'overview' && <ShieldCheck className="w-4 h-4" />}
            {item === 'users' && <Users className="w-4 h-4" />}
            {item === 'cars' && <Car className="w-4 h-4" />}
            {item === 'audit' && <History className="w-4 h-4" />}
            {item === 'communications' && <Send className="w-4 h-4" />}
            {item === 'navigation' && <Compass className="w-4 h-4" />}
            {item === 'providers' && <ProvidersIcon className="w-4 h-4" />}
            {item === 'support' && <LifeBuoy className="w-4 h-4" />}
            {item === 'onboarding' && <Compass className="w-4 h-4" />}
            {item[0].toUpperCase() + item.slice(1)}
          </Button>
        ))}
        {module !== 'overview' && module !== 'navigation' && module !== 'providers' && module !== 'support' && module !== 'onboarding' && module !== 'auctions' && module !== 'owners' && <div className="ml-auto min-w-[240px]"><Input aria-label="Search administration records" placeholder="Search live records…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
      </div>

      {module === 'overview' && (
        <>
          <section aria-labelledby="marketplace-overview-heading" className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#58717A]">Marketplace snapshot</p><h2 id="marketplace-overview-heading" className="mt-1 text-lg font-bold text-[#0B3440]">Platform at a glance</h2></div>
              <span className="hidden text-xs text-[#58717A] sm:inline">Values reflect the latest API response</span>
            </div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-4">
              <StatWidget label="Total users" value={stat('totalUsers')} icon={<Users className="w-4 h-4" />} />
              <StatWidget label="Vehicles" value={stat('totalCars')} icon={<Car className="w-4 h-4" />} />
              <StatWidget label="Active listings" value={stat('activeListings')} icon={<CheckCircle2 className="w-4 h-4" />} />
              <StatWidget label="Live auctions" value={stat('activeAuctions')} icon={<FileCheck className="w-4 h-4" />} />
              <StatWidget label="Open escrows" value={stat('openEscrows')} icon={<ShieldCheck className="w-4 h-4" />} />
            </div>
          </section>

          <section aria-labelledby="operations-queues-heading" className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#58717A]">Work requiring attention</p><h2 id="operations-queues-heading" className="mt-1 text-lg font-bold text-[#0B3440]">Operational queues</h2></div>
              <p className="text-xs text-[#58717A]">Unavailable values are not reported as zero.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {[
                { title: 'Marketplace decisions', description: 'Dealer and vehicle workflows.', items: [
                  { label: 'Pending dealers', value: stat('pendingDealers'), destination: 'users' as const, queue: 'pendingDealers' as const },
                  { label: 'Pending vehicles', value: stat('pendingCars'), destination: 'cars' as const, queue: 'pendingVehicles' as const },
                  { label: 'Verification queue', value: stat('verificationQueue') },
                  { label: 'Pending reviews', value: stat('pendingReviews') },
                ] },
                { title: 'Customer & risk operations', description: 'Support demand, disputes and risk signals.', items: [
                  { label: 'Support queue', value: stat('supportQueue'), destination: 'support' as const },
                  { label: 'Disputes', value: stat('pendingReports') },
                  { label: 'Fraud alerts', value: stat('fraudAlerts') },
                  { label: 'Unread alerts', value: stat('activeAlerts') },
                ] },
              ].map((group) => (
                <Card key={group.title} className="p-4 sm:p-5">
                  <div className="border-b border-[#E3ECEF] pb-3"><h3 className="font-bold text-[#0B3440]">{group.title}</h3><p className="mt-1 text-xs leading-5 text-[#58717A]">{group.description}</p></div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {group.items.map((item) => {
                      const content = <><div className="text-[10px] font-bold uppercase leading-4 tracking-wide text-[#4B646D] sm:text-[11px]">{item.label}</div><div className="mt-2 break-words text-2xl font-extrabold tracking-tight text-[#176B87]">{item.value}</div>{item.destination && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#176B87]">Open workflow <span aria-hidden="true">→</span></span>}</>;
                      return item.destination
                        ? <button key={item.label} type="button" onClick={() => { setSearch(''); const q = ('queue' in item ? item.queue : null) as QueueFilter; setQueue(q); setModule(item.destination!); if (q !== queue) void load(q); }} className="min-w-0 rounded-lg border border-[#DCE8EB] bg-[#F8FBFB] p-3 text-left transition hover:border-[#176B87] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B87] focus-visible:ring-offset-2 sm:p-4" aria-label={`Open ${item.label.toLowerCase()} workflow`}>{content}</button>
                        : <div key={item.label} className="min-w-0 rounded-lg border border-[#DCE8EB] bg-[#F8FBFB] p-3 sm:p-4">{content}</div>;
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      {queue && (module === 'users' || module === 'cars') && ((queue === 'pendingDealers' && module === 'users') || (queue === 'pendingVehicles' && module === 'cars')) && (
        <div className="flex items-center gap-2 text-sm text-[#0B3440]" data-testid="queue-filter">
          <Badge variant="warning">{queue === 'pendingDealers' ? 'Showing pending dealers only' : 'Showing pending vehicles only'}</Badge>
          <Button size="sm" variant="outline" onClick={() => { setQueue(null); void load(null); }}>Show all</Button>
        </div>
      )}

      {module === 'users' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.map((u) => <TableRow key={u._id}>
                <TableCell><div className="font-bold">{u.name || 'Unnamed user'}</div><div className="text-xs text-[#64748B]">{u.email || 'No email returned'}</div></TableCell>
                <TableCell><Badge variant="neutral">{u.role || 'unknown'}</Badge></TableCell>
                <TableCell>{u.isBanned ? <Badge variant="warning">Banned</Badge> : u.status === 'pending' ? <Badge variant="warning">Pending approval</Badge> : u.status === 'rejected' ? <Badge variant="warning">Not approved</Badge> : <Badge variant="success">Active</Badge>}</TableCell>
                <TableCell><div className="flex flex-wrap gap-2">
                  {(u.role === 'dealer' || u.role === 'individual_seller') && u.status !== 'approved' && <Button size="sm" variant="primary" disabled={busyId === u._id} onClick={() => void decideSeller(u, 'approve')}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</Button>}
                  {u.role === 'dealer' && u.status === 'pending' && <Button size="sm" variant="outline" disabled={busyId === u._id} onClick={() => void decideSeller(u, 'reject')}>Reject</Button>}
                  <Button size="sm" variant="outline" disabled={busyId === u._id} onClick={() => void toggleBan(u)}><Ban className="w-3.5 h-3.5" /> {u.isBanned ? 'Unban' : 'Ban'}</Button>
                </div></TableCell>
              </TableRow>)}
              {!filteredUsers.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#64748B]">No live users returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {module === 'cars' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCars.map((c) => <TableRow key={c._id}>
                <TableCell><div className="font-bold">{c.title || 'Untitled vehicle'}</div><div className="text-xs text-[#64748B]">{c._id}</div></TableCell>
                <TableCell><Badge variant="neutral">{c.status || 'unknown'}</Badge></TableCell>
                <TableCell>{typeof c.price === 'number' ? `Ksh ${c.price.toLocaleString()}` : 'Not provided'}</TableCell>
                <TableCell><div className="flex flex-wrap gap-2">{c.status === 'pending' && <Button size="sm" variant="primary" disabled={busyId === c._id} onClick={() => void moderateListing(c, 'approve')}>Approve</Button>}{(c.status === 'pending' || c.status === 'available') && <Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => void moderateListing(c, 'hide')}>Hide</Button>}<Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => void verifyCar(c)}><FileCheck className="w-3.5 h-3.5" /> Verify</Button>{onQuickViewVehicle && <Button size="sm" variant="outline" onClick={() => { const v = vehicles.find((x) => x.id === c._id); if (v) onQuickViewVehicle(v); }}>View</Button>}</div></TableCell>
              </TableRow>)}
              {!filteredCars.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#64748B]">No live vehicles returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {module === 'communications' && <AdminCommunications />}

      {module === 'navigation' && <AdminNavigationControl />}
      {module === 'providers' && <AdminProviderGovernance />}
      {module === 'support' && <AdminSupportWorkspace />}
      {module === 'auctions' && <AdminAuctionVerification />}
      {module === 'onboarding' && <AdminSettingsOnboarding />}
      {module === 'owners' && isOwner && <AdminOwnerManagement />}

      {module === 'audit' && (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Target</TableHead><TableHead>Actor</TableHead></TableRow></TableHeader>
            <TableBody>
              {auditLogs.map((log, i) => <TableRow key={log._id || log.id || i}>
                <TableCell className="text-xs">{log.createdAt || log.timestamp || 'Not provided'}</TableCell>
                <TableCell className="font-semibold">{log.action || 'Unknown action'}</TableCell>
                <TableCell>{log.module || '—'}</TableCell>
                <TableCell className="font-mono text-xs">{log.targetId || '—'}</TableCell>
                <TableCell>{log.actor?.email || log.user?.email || 'Server record'}</TableCell>
              </TableRow>)}
              {!auditLogs.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#64748B]">No live audit records returned by the server.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminView;
