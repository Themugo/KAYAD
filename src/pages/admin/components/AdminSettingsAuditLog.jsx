import { adminAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';

export default function AdminSettingsAuditLog({ auditLog, setLoading }) {
  const { toast } = useToast();
  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem' }}>Immutable Audit Log</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{auditLog.length} entries</span>
        </div>
        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Admin</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No audit entries yet</td></tr>
              ) : auditLog.map((entry, i) => (
                <tr key={entry._id || i}>
                  <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: 12 }}>{auditLog.length - i}</td>
                  <td style={{ fontSize: 13 }}>{entry.action}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.admin}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString('en-KE') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>System Tools</h3>
        <button
          className="btn btn-outline btn-sm"
          onClick={async () => {
            if (!window.confirm('This will re-seed the database and may take 10-15 seconds. Continue?')) return;
            setLoading(true);
            try {
              const res = await adminAPI.reseed();
              toast.success(`Reseeded: ${res.result.webhost.length} webhost, ${res.result.admin.length} admin, ${res.result.demos.length} demos, ${res.result.cars} cars`);
            } catch (e) {
              toast.error(e?.response?.data?.message || e.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          Reseed Database
        </button>
      </div>
    </div>
  );
}
