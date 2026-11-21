// Phase 13H: single reader for the human-readable text of an admin alert.
// Established payload shape (backend reconciliationService.sendAlerts -> admin_alerts):
//   { type, severity, read, data: { reportId, issueType, description, transactionId, amountDifference } }
// Older/other producers may carry top-level message|title|description. Only strings are ever returned (never objects), so the
// result is safe to render as React text; callers must not use dangerouslySetInnerHTML.
export const ALERT_MESSAGE_FALLBACK = 'Alert message unavailable';
const MAX_LEN = 300;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function getAlertMessage(alert: unknown, fallback: string = ALERT_MESSAGE_FALLBACK): string {
  if (!isRecord(alert)) return fallback;
  const data = isRecord(alert.data) ? alert.data : {};
  const found =
    str(alert.message) || str(alert.title) || str(alert.description) ||
    str(data.message) || str(data.title) || str(data.description);
  if (!found) return fallback;
  return found.length > MAX_LEN ? `${found.slice(0, MAX_LEN - 1)}…` : found;
}
