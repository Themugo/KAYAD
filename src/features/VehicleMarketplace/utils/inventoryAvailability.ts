import { VehicleApiError } from '../../../services/vehicleApi';

/**
 * Honest classification of a failed public-inventory request. A failure is never presented as an empty
 * marketplace, and the cause is only named when the response actually carries it:
 *  - maintenance : HTTP 503 whose body says `maintenance: true` (a platform-wide pause)
 *  - restricted  : HTTP 401/403 (the request was refused for this visitor)
 *  - timeout     : the request did not finish in time (HTTP 408/504 or a client timeout)
 *  - network     : no HTTP response at all (offline, DNS, blocked)
 *  - unavailable : any other server-side failure (5xx, e.g. DATABASE_UNAVAILABLE)
 */
export type InventoryFailureKind = 'maintenance' | 'restricted' | 'timeout' | 'network' | 'unavailable';

export interface InventoryFailure {
  kind: InventoryFailureKind;
  /** Short status text for the compact header pill. */
  pill: string;
  /** Heading of the full error panel. */
  title: string;
  body: string;
  /** HTTP status, when the failure carried one. */
  status?: number;
}

const TEXT: Record<InventoryFailureKind, Omit<InventoryFailure, 'kind' | 'status'>> = {
  maintenance: {
    pill: 'Inventory paused',
    title: 'Inventory is paused for maintenance',
    body: 'KAYAD is under scheduled maintenance, so vehicle listings are paused. Your filters and saved vehicles are kept. Please try again shortly.',
  },
  restricted: {
    pill: 'Inventory restricted',
    title: 'Inventory could not be shown for this session',
    body: 'The request was refused. Signing in again may help. Your filters and saved vehicles are kept.',
  },
  timeout: {
    pill: 'Inventory timed out',
    title: 'Inventory took too long to respond',
    body: 'The request timed out before vehicles could load. Check your connection and retry. Your filters and saved vehicles are kept.',
  },
  network: {
    pill: 'Can’t reach inventory',
    title: 'We can’t reach KAYAD right now',
    body: 'Check your internet connection and retry. Your filters and saved vehicles are kept.',
  },
  unavailable: {
    pill: 'Inventory unavailable',
    title: 'Inventory is temporarily unavailable',
    body: 'We couldn’t load vehicles just now. This is usually brief. Your filters and saved vehicles are kept, so you can pick up right where you left off.',
  },
};

const statusIn = (text: string): number | undefined => {
  const code = /\b([45]\d\d)\b/.exec(text)?.[1];
  return code ? Number(code) : undefined;
};

const kindFor = (status: number | undefined, text: string, maintenance: boolean): InventoryFailureKind => {
  if (maintenance) return 'maintenance';
  if (status === 401 || status === 403) return 'restricted';
  if (status === 408 || status === 504 || /time(d)?[ -]?out|timeout|ECONNABORTED/i.test(text)) return 'timeout';
  if (status === undefined) return /unable to reach|network|offline|failed to fetch/i.test(text) ? 'network' : 'unavailable';
  return 'unavailable';
};

/**
 * Accepts the structured error thrown by the vehicle API, or the plain message string the app shell keeps
 * (`loadError`). A string can only be classified from its own words, so anything unrecognised stays the
 * generic "unavailable" state rather than guessing a cause.
 */
export function classifyInventoryFailure(source: unknown): InventoryFailure {
  if (source instanceof VehicleApiError) {
    const kind = kindFor(source.status, source.message, source.maintenance === true && source.status === 503);
    return { kind, status: source.status, ...TEXT[kind] };
  }
  const text = typeof source === 'string' ? source : source instanceof Error ? source.message : '';
  const kind = kindFor(statusIn(text), text, /maintenance/i.test(text));
  return { kind, status: statusIn(text), ...TEXT[kind] };
}
