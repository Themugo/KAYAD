export default function InspectorStatusBadge({ status }) {
  const map = {
    pending_payment: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b', label: 'Pending Payment' },
    paid:            { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Paid — Awaiting Assignment' },
    assigned:        { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Assigned' },
    in_progress:     { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)', label: 'In Progress' },
    completed:       { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Completed' },
    cancelled:       { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Cancelled' },
  };
  const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', label: status };
  return (
    <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
      {m.label}
    </span>
  );
}
