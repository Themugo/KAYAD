import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import { adminAPI } from '../api/api.exports';
import {
  AlertTriangle,
  Ban,
  Building2,
  ChevronRight,
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
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import AdminCommunications from '../pages/admin/AdminCommunications';
import AdminNavigationControl from './AdminNavigationControl';
import AdminProviderGovernance from './AdminProviderGovernance';
import AdminSupportWorkspace from './AdminSupportWorkspace';
// STAGE 5A (Gate D): the owner onboarding settings page was built in Stage 5 but never mounted anywhere reachable.
import AdminSettingsOnboarding from '../pages/admin/AdminSettingsOnboarding';
// STAGE 5B: owner membership management (owner-only on the server; the tab is shown only to owners).
import AdminOwnerManagement from '../pages/admin/AdminOwnerManagement';
import AdminAuctionVerification from './AdminAuctionVerification'; // STAGE 5F.10
import AdminDepartmentCapabilities from './AdminDepartmentCapabilities';
import './admin-command-centre.css';
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
  auction_status?: string;
  currentBid?: number;
  current_bid?: number;
  price?: number;
  bidsCount?: number;
  bids_count?: number;
  auctionEnd?: string;
  auction_end?: string;
  year?: number | string;
  images?: Array<string | { url?: string; thumb?: string }>;
  image?: string;
  imageUrl?: string;
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [module, setModule] = useState<'overview' | 'users' | 'cars' | 'audit' | 'communications' | 'navigation' | 'providers' | 'support' | 'onboarding' | 'auctions' | 'owners' | 'departments'>('overview');
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
  const [failedVehicleImages, setFailedVehicleImages] = useState<string[]>([]);
  // Only the latest dashboard request may publish results. This prevents a slow
  // refresh from overwriting newer queue-filter or post-action data.
  const loadSequence = useRef(0);

  const load = async (activeQueue: QueueFilter = queue) => {
    const sequence = ++loadSequence.current;
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

    if (sequence !== loadSequence.current) return;

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

  useEffect(() => {
    void load();
    return () => { loadSequence.current += 1; };
    // The dashboard performs its initial load once; explicit refresh and action
    // handlers call load directly with the current queue when needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 sm:space-y-6" data-testid="admin-command-centre">
      <section aria-labelledby="admin-command-centre-title" className="kayad-command-hero">
        <div className="kayad-command-hero-content">
          <div className="kayad-command-eyebrow"><ShieldCheck size={15} /> KAYAD BUSINESS COMMAND CENTRE</div>
          <h1 id="admin-command-centre-title">Welcome back, <span>{(typeof sessionUser?.name === 'string' ? sessionUser.name.split(' ')[0] : '') || 'Administrator'}</span></h1>
          <p>Oversee your marketplace, team, operations and systems — all from one portal.</p>
          <div className="kayad-command-meta"><span>{new Intl.DateTimeFormat('en-KE', { dateStyle: 'full', timeZone: 'Africa/Nairobi' }).format(new Date())}</span><span>{error || restricted.length > 0 || statsStatus === 'error' ? 'Some operational data unavailable or restricted' : loading ? 'Loading operational data' : 'Operational data loaded'}</span></div>
        </div>
        <div className="kayad-command-actions" aria-label="Quick Actions">
          <strong>Quick Actions</strong>
          <div>
            <Link to="/admin/staff">Add Staff</Link>
            <Link to="/admin/dealer-verifications">Approve Dealer</Link>
            <Link to="/admin/cars">View Vehicles</Link>
            <Link to="/admin/reports">View Reports</Link>
          </div>
        </div>
      </section>
      <div className="kayad-command-toolbar"><span>{statsStatus === 'stale' ? 'Showing last successful statistics' : statsStatus === 'ready' ? 'Values reflect the latest API response' : 'Live data pending'}</span><Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh administration data"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button></div>
      {(error || actionError) && (
        <Card role="alert" className="flex items-start gap-2 border-[#BDE5DE] bg-[#F3FAF9] p-4 text-sm text-[#0A3340]">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{actionError || error}</span>
        </Card>
      )}

      {restricted.length > 0 && (
        <p role="note" className="text-xs text-[#58717A]">Not included in your role: {restricted.join(', ')}. This is an access boundary, not an outage.</p>
      )}

      <div className="kayad-command-specialists">
        <button type="button" onClick={() => setToolsOpen(!toolsOpen)} aria-expanded={toolsOpen} aria-controls="kayad-specialist-tools">{toolsOpen ? 'Hide' : 'Show'} specialist tools <ChevronRight className="inline h-4 w-4" /></button>
        {toolsOpen && <div id="kayad-specialist-tools" className="kayad-command-tool-links">
          {([['overview', 'Dashboard'], ['users', 'User review'], ['cars', 'Vehicle review'], ['audit', 'Audit records'], ['communications', 'Communications'], ['navigation', 'Navigation settings'], ['providers', 'Providers'], ['support', 'Support'], ['onboarding', 'Onboarding'], ['auctions', 'Auction verification'], ...(isOwner ? [['owners', 'Owner management'], ['departments', 'Departments']] : [])] as [typeof module, string][]).map(([key, label]) => <button type="button" key={key} className={module === key ? 'selected' : ''} onClick={() => { setModule(key); setToolsOpen(false); }}>{label}</button>)}
          {module !== 'overview' && <Input aria-label="Search administration records" placeholder="Search live records…" value={search} onChange={(e) => setSearch(e.target.value)} />}
        </div>}
      </div>
      {module === 'overview' && (
        <div className="kayad-command-overview">
          <section aria-label="Marketplace metrics" className="kayad-command-kpis">
            {[
              { label: 'Total Users', value: stat('totalUsers'), icon: <Users size={22} />, to: '/admin/users' },
              { label: 'Active Staff', value: 'View staff', icon: <ShieldCheck size={22} />, to: '/admin/staff' },
              { label: 'Verified Dealers', value: stat('verifiedDealers'), icon: <Building2 size={22} />, to: '/admin/dealer-verifications' },
              { label: 'Vehicles', value: stat('totalCars'), icon: <Car size={22} />, to: '/admin/cars' },
              { label: 'Live Auctions', value: stat('activeAuctions'), icon: <FileCheck size={22} />, to: '/admin/auctions' },
              { label: 'Open Escrows', value: stat('openEscrows'), icon: <ShieldCheck size={22} />, to: '/admin/escrows' },
            ].map(item => <Link to={item.to} className="kayad-command-kpi" key={item.label}><div className="kayad-command-kpi-icon">{item.icon}</div><div><small>{item.label}</small><strong>{item.value}</strong></div></Link>)}
          </section>
          <div className="kayad-command-main-grid">
            <section className="kayad-command-panel" aria-labelledby="approval-workflows-heading" data-testid="approval-workbench">
              <header><h2 id="approval-workflows-heading">Approval Workflows</h2><Link to="/admin/dealer-verifications">View All</Link></header>
              <div className="kayad-command-queue-tabs">
                {[
                  { label: 'Dealers', href: '/admin/dealer-verifications', count: stat('pendingDealers') },
                  { label: 'Sellers', href: '/admin/sellers' },
                  { label: 'Inspectors', href: '/admin/inspector-applications' },
                  { label: 'Vehicle Listings', href: '/admin/moderation', count: stat('pendingCars') },
                  { label: 'Document Verification', href: '/admin/ntsa-queue' },
                  { label: 'Inspections', href: '/admin/inspections' },
                ].map((item) => <Link key={item.href} to={item.href} aria-label={`Open ${item.label.toLowerCase()} approval workflow`}>{item.label}{item.count !== undefined && <b>{item.count}</b>}</Link>)}
              </div>
              <div className="kayad-command-approval-list">
                {users.filter(u => u.role === 'dealer' && (u.status === 'pending' || u.approved === false)).slice(0, 4).map(u => <div key={u._id}><div><strong>{u.name || 'Dealer application'}</strong><small>{u.email || 'No email provided'}</small></div><span className="kayad-command-pending">Pending Review</span><button type="button" aria-label={`Review dealer application for ${u.name || u.email || 'dealer'}`} onClick={() => { setQueue('pendingDealers'); setModule('users'); void load('pendingDealers'); }}>Review</button></div>)}
                {!users.some(u => u.role === 'dealer' && (u.status === 'pending' || u.approved === false)) && <p className="kayad-command-empty">{loading ? 'Loading approval records…' : restricted.includes('user records') ? 'Dealer records are restricted for this role. Use the authorized dealer verification workspace.' : error ? 'Approval records may be unavailable. Open the dealer verification queue for the authoritative list.' : 'No pending dealers in the loaded records. View all to inspect the full queue.'}</p>}
              </div>
            </section>
            <section className="kayad-command-panel" aria-labelledby="system-health-heading">
              <header><h2 id="system-health-heading">System Health</h2><Link to="/admin/control-room">View All</Link></header>
              <p className="kayad-command-empty">Service-level health and response times are available in the existing operations control room. No status is assumed without a health check.</p>
              <Link className="kayad-command-inline-link" to="/admin/control-room">Open system monitoring <ChevronRight size={14}/></Link>
            </section>
            <section className="kayad-command-panel" aria-labelledby="recent-submissions-heading">
              <header><h2 id="recent-submissions-heading">Recent Vehicle Submissions</h2><Link to="/admin/cars">View All</Link></header>
              <div className="kayad-command-vehicles">
                {cars.slice(0, 4).map(car => { const firstImage = car.images?.[0]; const imageUrl = (typeof firstImage === 'string' ? firstImage : firstImage?.thumb || firstImage?.url) || car.imageUrl || car.image; return <div key={car._id} className="kayad-command-vehicle"><div className="kayad-command-vehicle-art">{imageUrl && !failedVehicleImages.includes(`${car._id}:${imageUrl}`) ? <img src={imageUrl} alt={car.title || 'Vehicle submission'} loading="lazy" onError={() => setFailedVehicleImages((current) => current.includes(`${car._id}:${imageUrl}`) ? current : [...current, `${car._id}:${imageUrl}`])} /> : <Car size={32} aria-hidden="true" />}</div><strong>{car.title || 'Untitled vehicle'}</strong><small>{car.year ? `${car.year} · ` : ''}{typeof car.price === 'number' ? `KES ${car.price.toLocaleString()}` : 'Price not provided'}</small><span>{car.status || 'Status unavailable'}</span></div>; })}
                {!cars.length && <p className="kayad-command-empty">{loading ? 'Loading submissions…' : restricted.includes('vehicle records') ? 'Vehicle records are restricted for this role.' : error ? 'Vehicle records unavailable.' : 'No vehicle submissions in the loaded records.'}</p>}
              </div>
            </section>
            <section className="kayad-command-panel" aria-labelledby="customer-risk-heading">
              <header><h2 id="customer-risk-heading">Customer &amp; Risk Operations</h2><Link to="/admin/support" aria-label="Open support queue">View Support</Link></header>
              <p className="kayad-command-empty">Review customer support demand and route operational issues through the existing authorized workspaces.</p>
              <div className="kayad-command-risk-links">
                <Link to="/admin/support" aria-label="Open support tickets queue"><LifeBuoy size={16} /> Support queue <ChevronRight size={14} /></Link>
                <Link to="/admin/escrows" aria-label="Open escrow operations"><ShieldCheck size={16} /> Escrow operations <ChevronRight size={14} /></Link>
              </div>
            </section>
            <section className="kayad-command-panel" aria-labelledby="live-auctions-heading">
              <header><h2 id="live-auctions-heading">Live Auctions</h2><Link to="/admin/auctions">View All</Link></header>
              {cars.filter(car => (car.auctionStatus || car.auction_status || '').toLowerCase() === 'live').slice(0, 4).map(car => <div className="kayad-command-auction-row" key={car._id}><div className="kayad-command-auction-thumb"><Car size={20}/></div><div className="kayad-command-auction-info"><strong>{car.title || 'Live vehicle auction'}</strong><small>{typeof (car.currentBid ?? car.current_bid) === 'number' ? `KES ${(car.currentBid ?? car.current_bid as number).toLocaleString()}` : typeof car.price === 'number' ? `Starting price KES ${car.price.toLocaleString()}` : 'Current bid unavailable'}</small></div><span className="kayad-command-live">Live</span></div>)}
              {!cars.some(car => (car.auctionStatus || car.auction_status || '').toLowerCase() === 'live') && <p className="kayad-command-empty">{loading ? 'Loading auction records…' : restricted.includes('vehicle records') ? 'Auction details are restricted with the vehicle records for this role.' : error ? 'Auction records may be unavailable.' : 'No live auctions in the loaded vehicle records. Open the auction workspace for the authoritative list.'}</p>}
              <Link className="kayad-command-inline-link" to="/admin/auctions">Open live auction operations <ChevronRight size={14}/></Link>
            </section>
            <section className="kayad-command-panel" aria-labelledby="team-heading"><header><h2 id="team-heading">Team Members</h2><Link to="/admin/staff">View All</Link></header>{users.filter(u => ['superadmin','admin','moderator','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','ghost_checker'].includes((u.role || '').toLowerCase())).slice(0, 3).map(u => <div className="kayad-command-team-row" key={u._id}><span className="kayad-command-team-avatar">{(u.name || u.email || 'S').charAt(0).toUpperCase()}</span><div><strong>{u.name || 'Staff member'}</strong><small>{u.role || 'Staff role unavailable'}</small></div></div>)}{!users.some(u => ['superadmin','admin','moderator','marketing','technical_support','hr','accounts','escrow_officer','ad_manager','ghost_checker'].includes((u.role || '').toLowerCase())) && <p className="kayad-command-empty">{loading ? 'Loading team records…' : restricted.includes('user records') ? 'Team records are restricted for this role.' : error ? 'Team records may be unavailable. Open staff management for the authoritative list.' : 'No staff accounts found in the current user sample. Open staff management for the authoritative list.'}</p>}<Link className="kayad-command-inline-link" to="/admin/staff">Manage staff <ChevronRight size={14}/></Link></section>
            <section className="kayad-command-panel" aria-labelledby="rbac-heading"><header><h2 id="rbac-heading">Role-Based Access Control</h2><Link to="/admin/staff-permissions">Manage Roles</Link></header><div className="kayad-command-role-summary">{Array.from(new Set<string>(users.map(u => (u.role || '').trim()).filter((role): role is string => Boolean(role)))).slice(0, 4).map((role: string) => <div key={role}><span>{role.replace(/_/g, ' ')}</span><b>{users.filter(u => (u.role || '').trim() === role).length}</b></div>)}</div><p className="kayad-command-data-note">{restricted.includes('user records') ? 'Role membership is restricted for this role; no counts are available here.' : 'Counts reflect only the current loaded user sample, not total role membership.'}</p><Link className="kayad-command-inline-link" to="/admin/staff-permissions">Review permissions <ChevronRight size={14}/></Link></section>
          </div>
          <aside className="kayad-command-rail" aria-label="Account and system information">
            <section className="kayad-command-panel"><header><h2>My Account</h2></header><div className="kayad-command-account"><div className="kayad-command-avatar">{(typeof sessionUser?.name === 'string' ? sessionUser.name.charAt(0) : '') || 'A'}</div><div><strong>{sessionUser?.name || 'Administrator'}</strong><small>{sessionUser?.role || 'Staff'}</small></div></div><Link to="/admin">Operations Dashboard</Link><Link to="/admin/settings">Account Settings</Link><Link to="/admin/security-log">Audit & Logs</Link></section>
            <section className="kayad-command-panel"><header><h2>Department Overview</h2><Link to="/admin/staff">View All</Link></header><p className="kayad-command-empty">Department information is managed in the existing staff and departmental workspace.</p><Link to="/admin/staff">Staff & Departments</Link></section>
            <section className="kayad-command-panel"><header><h2>Provider Status</h2><Link to="/admin/provider-governance">View All</Link></header><p className="kayad-command-empty">Provider connectivity is not assumed. Review the verified status in provider governance.</p><Link to="/admin/provider-governance">Providers & Integrations</Link></section>
          </aside>
        </div>
      )}

      {queue && (module === 'users' || module === 'cars') && ((queue === 'pendingDealers' && module === 'users') || (queue === 'pendingVehicles' && module === 'cars')) && (
        <div className="flex items-center gap-2 text-sm text-[#0B3440]" data-testid="queue-filter">
          <Badge variant="warning">{queue === 'pendingDealers' ? 'Showing pending dealers only' : 'Showing pending vehicles only'}</Badge>
          <Button size="sm" variant="outline" onClick={() => { setQueue(null); void load(null); }}>Show all</Button>
        </div>
      )}

      {module === 'users' && (
        <Card className="min-w-0 overflow-x-auto border-[#DCE8EB]">
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
              {!filteredUsers.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#64748B]">{restricted.includes('user records') ? 'User records are restricted for this role.' : error ? 'User records are unavailable. Refresh or use an authorized workspace.' : 'No users matched the current search.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}

      {module === 'cars' && (
        <Card className="min-w-0 overflow-x-auto border-[#DCE8EB]">
          <Table>
            <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCars.map((c) => <TableRow key={c._id}>
                <TableCell><div className="font-bold">{c.title || 'Untitled vehicle'}</div><div className="text-xs text-[#64748B]">{c._id}</div></TableCell>
                <TableCell><Badge variant="neutral">{c.status || 'unknown'}</Badge></TableCell>
                <TableCell>{typeof c.price === 'number' ? `Ksh ${c.price.toLocaleString()}` : 'Not provided'}</TableCell>
                <TableCell><div className="flex flex-wrap gap-2">{c.status === 'pending' && <Button size="sm" variant="primary" disabled={busyId === c._id} onClick={() => void moderateListing(c, 'approve')}>Approve</Button>}{(c.status === 'pending' || c.status === 'available') && <Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => void moderateListing(c, 'hide')}>Hide</Button>}<Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => void verifyCar(c)}><FileCheck className="w-3.5 h-3.5" /> Verify</Button>{onQuickViewVehicle && <Button size="sm" variant="outline" onClick={() => { const v = vehicles.find((x) => x.id === c._id); if (v) onQuickViewVehicle(v); }}>View</Button>}</div></TableCell>
              </TableRow>)}
              {!filteredCars.length && <TableRow><TableCell colSpan={4} className="text-center py-8 text-[#64748B]">{restricted.includes('vehicle records') ? 'Vehicle records are restricted for this role.' : error ? 'Vehicle records are unavailable. Refresh or use an authorized workspace.' : 'No vehicles matched the current search.'}</TableCell></TableRow>}
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
      {module === 'departments' && isOwner && <AdminDepartmentCapabilities />}

      {module === 'audit' && (
        <Card className="min-w-0 overflow-x-auto border-[#DCE8EB]">
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
              {!auditLogs.length && <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#64748B]">{restricted.includes('audit log') ? 'Audit records are restricted for this role.' : error ? 'Audit records are unavailable. Refresh or use an authorized workspace.' : 'No audit records returned by the server.'}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

export default AdminView;
