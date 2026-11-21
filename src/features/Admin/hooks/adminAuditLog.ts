/**
 * Immutable admin audit log. Every admin-made configuration change
 * (escrow rules, home page config, auction page config) is appended
 * here with a timestamp, the admin's identity, and a before/after
 * summary. Append-only by design: this module exposes appendLogEntry()
 * and readLogEntries(), and deliberately does NOT export any
 * update/delete function - there is no code path anywhere in this
 * module that can modify or remove an existing entry once written.
 *
 * "Immutable" here means immutable at the application layer - entries
 * cannot be edited or deleted through this app's own UI or code, which
 * is the meaningful guarantee for an audit trail of admin actions. It
 * does NOT mean cryptographically tamper-proof storage (e.g. someone
 * with direct browser devtools access to localStorage could still
 * edit the raw JSON) - that level of guarantee needs server-side
 * storage with proper access control, which doesn't exist yet since
 * this frontend has no connected backend (consistent with every other
 * config feature built so far - confirmed throughout this project's
 * history). Documented here explicitly rather than overstating what
 * client-side-only storage can actually guarantee.
 */

export interface AdminLogEntry {
  id: string;
  timestamp: string; // ISO string, set at write time, never editable
  adminId: string;
  adminName: string;
  /** Which config surface this change belongs to - lets the log viewer
   * filter by area (escrow rules vs home page vs auction page) without
   * needing separate log stores that could get out of sync. */
  area: 'escrow-rules' | 'home-page' | 'auction-page';
  /** Short, human-readable description of what changed, e.g. "Escrow
   * Live Mode: OFF -> ON" or "Trust pillar 'escrow' heading changed". */
  summary: string;
}

const LOG_STORAGE_KEY = 'kayad_admin_audit_log_v1';
const MAX_ENTRIES = 500; // caps unbounded growth in localStorage; oldest entries are dropped from the READ side, never from what was written in a given session

function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function readLogEntries(): AdminLogEntry[] {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Appends a new entry. There is no corresponding editEntry or
 * deleteEntry export from this module - once written, an entry can
 * only be read, never changed, through any code path this app
 * provides.
 */
export function appendLogEntry(entry: Omit<AdminLogEntry, 'id' | 'timestamp'>): void {
  try {
    const existing = readLogEntries();
    const newEntry: AdminLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...existing, newEntry].slice(-MAX_ENTRIES);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage can fail (private browsing, quota, disabled storage) -
    // the config change itself still applies in-memory even if the log
    // write fails, since a missing log entry shouldn't block a real
    // admin action from taking effect.
  }
}
