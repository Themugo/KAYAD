import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { adminAPI } from '../api/api.exports';

type Status = 'healthy' | 'degraded' | 'down' | 'unavailable' | 'unknown';
type ServiceRow = { label: string; status: Status; latency: number | null };
type PanelState =
  | { status: 'loading' }
  | { status: 'ready'; services: ServiceRow[]; checkedAt: Date | null }
  | { status: 'unverifiable' }
  | { status: 'restricted' }
  | { status: 'error' };

const STATUS_LABEL: Record<Status, string> = {
  healthy: 'Healthy', degraded: 'Degraded', down: 'Down', unavailable: 'Check unavailable', unknown: 'Unknown',
};

const safeDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Reads only the existing protected health contract (`/ecp/health`). A service is listed only if the
// response names it; a status is shown only if the response states one; latency and the check time
// appear only when they are genuinely measured. Nothing is inferred from configuration.
export default function AdminSystemHealthPanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response: any = await (adminAPI as any).getInfrastructureHealth();
        if (cancelled) return;
        const health = response?.data?.health || response?.health || response?.data || response;
        const raw = Array.isArray(health?.services) ? health.services : [];
        const services: ServiceRow[] = raw
          .filter((s: any) => s && typeof s.name === 'string' && s.name.trim())
          .map((s: any) => {
            const rawStatus = typeof s.status === 'string' ? s.status.toLowerCase() : '';
            const status: Status = (['healthy', 'degraded', 'down', 'unavailable'] as const).includes(rawStatus as any) ? (rawStatus as Status) : 'unknown';
            const latency = s.latency != null && Number.isFinite(Number(s.latency)) && Number(s.latency) >= 0 ? Number(s.latency) : null;
            return { label: s.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()), status, latency };
          });
        if (!services.length) { setState({ status: 'unverifiable' }); return; }
        setState({ status: 'ready', services: services.slice(0, 6), checkedAt: safeDate(health?.checkedAt || response?.timestamp) });
      } catch (err: any) {
        if (cancelled) return;
        setState(err?.response?.status === 403 ? { status: 'restricted' } : { status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div aria-live="polite">
      {state.status === 'loading' && <p className="kayad-command-empty">Checking service health…</p>}
      {state.status === 'error' && <p className="kayad-command-empty">Service health could not be checked, so the current state is unknown. No status is assumed without a health check.</p>}
      {state.status === 'unverifiable' && <p className="kayad-command-empty">The health source returned no verifiable service checks, so the current state is unknown. No status is assumed without a health check.</p>}
      {state.status === 'restricted' && <p className="kayad-command-empty">Service health is not included in your role. This is an access boundary, not an outage.</p>}
      {state.status === 'ready' && (
        <>
          <ul className="kayad-command-health-list">
            {state.services.map((service) => (
              <li key={service.label} data-status={service.status}>
                <span className="kayad-command-health-dot" aria-hidden="true" />
                <strong>{service.label}</strong>
                <span>{STATUS_LABEL[service.status]}{service.latency !== null ? ` · ${Math.round(service.latency)} ms` : ''}</span>
              </li>
            ))}
          </ul>
          <p className="kayad-command-data-note">
            {state.checkedAt
              ? `Checked ${state.checkedAt.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}.`
              : 'Check time not provided by the health source.'}
          </p>
        </>
      )}
      <Link className="kayad-command-inline-link" to="/admin/control-room">Open system monitoring <ChevronRight size={14} aria-hidden="true" /></Link>
    </div>
  );
}
