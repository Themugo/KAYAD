export default function InspectorStatusBadge({ status }) {
  const map = {
    pending_payment: { bg: 'rgba(19, 184, 166, 0.1)', color: '#176b87', label: 'Pending Payment' },
    paid:            { bg: 'rgba(23, 107, 135, 0.1)', color: '#176B87', label: 'Paid — Awaiting Assignment' },
    assigned:        { bg: 'rgba(139,92,246,0.1)', color: '#5aafa4', label: 'Assigned' },
    in_progress:     { bg: 'rgba(23, 107, 135, 0.12)', color: 'var(--brand)', label: 'In Progress' },
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
