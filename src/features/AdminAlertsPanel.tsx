import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronRight } from 'lucide-react';
import { adminAPI } from '../api/api.exports';
import { getAlertMessage } from '../utils/adminAlertMessage';

type AlertRow = { id: string; message: string; severity: string; at: string | null };
type PanelState =
  | { status: 'loading' }
  | { status: 'ready'; rows: AlertRow[] }
  | { status: 'restricted' }
  | { status: 'error' };

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// Reads only the existing alerts source. It never fabricates entries: a failed
// request is "unavailable", a 403 is an access boundary, and an empty list is "no alerts".
export default function AdminAlertsPanel() {
  const [state, setState] = useState<PanelState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body: any = await (adminAPI as any).alerts({ limit: 4 });
        const list = Array.isArray(body?.alerts) ? body.alerts : Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
        if (cancelled) return;
        if (!list) { setState({ status: 'error' }); return; }
        setState({
          status: 'ready',
          rows: list.slice(0, 4).map((a: any, index: number) => ({
            id: String(a?._id ?? a?.id ?? index),
            message: getAlertMessage(a),
            severity: text(a?.severity) || 'unspecified',
            at: text(a?.createdAt) || text(a?.timestamp) || null,
          })),
        });
      } catch (err: any) {
        if (cancelled) return;
        setState(err?.response?.status === 403 ? { status: 'restricted' } : { status: 'error' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="kayad-command-panel kayad-command-rail-panel" aria-labelledby="right-rail-alerts-heading">
      <header><h2 id="right-rail-alerts-heading">System Alerts</h2><Link to="/admin/control-room">View All</Link></header>
      <div aria-live="polite">
        {state.status === 'loading' && <p className="kayad-command-empty">Loading alerts…</p>}
        {state.status === 'error' && <p className="kayad-command-empty">Alerts are unavailable right now. This is not a confirmation that there are none.</p>}
        {state.status === 'restricted' && <p className="kayad-command-empty">Alerts are not included in your role. This is an access boundary, not an outage.</p>}
        {state.status === 'ready' && state.rows.length === 0 && <p className="kayad-command-empty">No alerts were returned.</p>}
        {state.status === 'ready' && state.rows.length > 0 && (
          <ul className="kayad-command-alert-list">
            {state.rows.map((row) => (
              <li key={row.id}>
                <Bell size={14} aria-hidden="true" />
                <span><strong>{row.message}</strong><small>{row.severity}{row.at && !Number.isNaN(Date.parse(row.at)) ? ` · ${new Date(row.at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })}` : ''}</small></span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link className="kayad-command-rail-primary" to="/admin/control-room">Operations control room <ChevronRight size={14} aria-hidden="true" /></Link>
    </section>
  );
}
