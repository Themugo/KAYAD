import { useCallback, useEffect, useState } from 'react';
import { announcementAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const MAX_TITLE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 5000;

const audienceLabels = {
  all: 'All Users',
  dealers: 'Dealers and Individual Sellers',
  buyers: 'Buyers',
  specific_users: 'Selected Users',
};

const statusLabels = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  partial: 'Partially delivered',
};

const getAnnouncementId = (response) => {
  const candidate = response?.announcement || response?.data?.announcement || response?.data || response;
  return candidate?._id || candidate?.id || response?._id || response?.id || null;
};

export default function AdminBroadcast() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [sendResult, setSendResult] = useState(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await announcementAPI.list({ page: 1, limit: 10 });
      const records = response?.announcements || response?.data?.announcements;
      if (!Array.isArray(records)) throw new Error('The broadcast service returned an unexpected history response.');
      setHistory(records);
    } catch (error) {
      setHistoryError(error?.message || 'Broadcast history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const handleSend = async () => {
    const normalizedTitle = title.trim();
    const normalizedMessage = message.trim();
    if (!normalizedTitle || !normalizedMessage) {
      toast('Enter both a title and a message before sending.', 'error');
      return;
    }
    if (normalizedTitle.length > MAX_TITLE_LENGTH || normalizedMessage.length > MAX_MESSAGE_LENGTH) {
      toast('The title or message exceeds the permitted length.', 'error');
      return;
    }

    const audienceLabel = audienceLabels[audience] || audienceLabels.all;
    const confirmed = window.confirm(
      `Send this broadcast to ${audienceLabel}?\n\nTitle: ${normalizedTitle}\n\nThis action may notify many accounts and cannot be automatically undone.`,
    );
    if (!confirmed) return;

    setSending(true);
    setSendResult(null);
    try {
      const createdResponse = await announcementAPI.create({
        title: normalizedTitle,
        message: normalizedMessage,
        audience,
        type: 'info',
      });
      const announcementId = getAnnouncementId(createdResponse);
      if (!announcementId) {
        throw new Error('The broadcast was saved but the server did not return its ID. Check broadcast history before trying again.');
      }

      const sendResponse = await announcementAPI.send(announcementId);
      const announcement = sendResponse?.announcement || sendResponse?.data?.announcement || {};
      const stats = announcement.stats || sendResponse?.stats || {};
      const result = {
        id: announcement._id || announcement.id || announcementId,
        status: announcement.status || (sendResponse?.partial ? 'partial' : 'sent'),
        totalRecipients: Number(stats.totalRecipients) || 0,
        successCount: Number(stats.successCount) || 0,
        failCount: Number(stats.failCount) || 0,
        partial: Boolean(sendResponse?.partial || sendResponse?.success === false),
        message: sendResponse?.message || 'Broadcast processing finished.',
      };
      setSendResult(result);
      if (result.partial || result.failCount > 0) {
        toast(`Broadcast partially processed: ${result.successCount} notification records created; ${result.failCount} failed.`, 'error');
      } else {
        toast(`Broadcast processed for ${result.successCount} recipients.`, 'success');
      }
      setTitle('');
      setMessage('');
      await loadHistory();
    } catch (error) {
      toast(error?.message || 'Broadcast could not be sent. Check broadcast history before retrying.', 'error');
      await loadHistory();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-muted, #64748b)', marginBottom: 6 }}>Business Management</p>
          <h1 style={{ marginBottom: 8 }}>Broadcast Message</h1>
          <p style={{ color: 'var(--color-muted, #64748b)', margin: 0, lineHeight: 1.6 }}>
            Send an administrative announcement to all users, dealers and individual sellers, or buyers. Confirm the audience before sending.
          </p>
        </div>

        <section className="card" aria-labelledby="broadcast-compose-title" style={{ padding: 24, marginBottom: 28 }}>
          <h2 id="broadcast-compose-title" style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 18 }}>Compose broadcast</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, fontSize: 13 }}>
              Title
              <input
                className="input"
                placeholder="Announcement title"
                value={title}
                maxLength={MAX_TITLE_LENGTH}
                onChange={(event) => setTitle(event.target.value)}
                aria-label="Broadcast title"
                required
              />
              <span style={{ color: '#64748b', fontWeight: 400, fontSize: 11, textAlign: 'right' }}>{title.length}/{MAX_TITLE_LENGTH}</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, fontSize: 13 }}>
              Message
              <textarea
                className="input"
                placeholder="Write the message to be delivered…"
                value={message}
                maxLength={MAX_MESSAGE_LENGTH}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                style={{ resize: 'vertical', lineHeight: 1.6 }}
                aria-label="Broadcast message"
                required
              />
              <span style={{ color: '#64748b', fontWeight: 400, fontSize: 11, textAlign: 'right' }}>{message.length}/{MAX_MESSAGE_LENGTH}</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600, fontSize: 13 }}>
              Audience
              <select aria-label="Audience" className="input" value={audience} onChange={(event) => setAudience(event.target.value)}>
                <option value="all">All Users</option>
                <option value="dealers">Dealers and Individual Sellers</option>
                <option value="buyers">Buyers</option>
              </select>
              <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12, lineHeight: 1.5 }}>
                The recipient group is resolved by the server when the broadcast is sent. All Users can include every account in the system.
              </span>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={sending || !title.trim() || !message.trim() || title.trim().length > MAX_TITLE_LENGTH || message.trim().length > MAX_MESSAGE_LENGTH}
                onClick={handleSend}
              >
                {sending ? 'Processing broadcast…' : 'Send Broadcast'}
              </button>
              {sending && <span role="status" style={{ fontSize: 12, color: '#64748b' }}>Please keep this page open until the request finishes.</span>}
            </div>
          </div>
        </section>

        {sendResult && (
          <section role="status" className="card" style={{ padding: 20, marginBottom: 28, border: `1px solid ${sendResult.partial ? '#f59e0b' : '#10b981'}` }}>
            <h2 style={{ marginTop: 0, fontSize: 16 }}>{sendResult.partial ? 'Broadcast completed with failures' : 'Broadcast processing result'}</h2>
            <p style={{ marginBottom: 12, color: '#64748b', fontSize: 13 }}>{sendResult.message}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              <div><strong style={{ display: 'block', fontSize: 22 }}>{sendResult.totalRecipients}</strong><span style={{ fontSize: 12, color: '#64748b' }}>Target accounts</span></div>
              <div><strong style={{ display: 'block', fontSize: 22 }}>{sendResult.successCount}</strong><span style={{ fontSize: 12, color: '#64748b' }}>Notification records created</span></div>
              <div><strong style={{ display: 'block', fontSize: 22 }}>{sendResult.failCount}</strong><span style={{ fontSize: 12, color: '#64748b' }}>Notification-record failures</span></div>
            </div>
            <p style={{ marginBottom: 0, marginTop: 12, fontSize: 11, color: '#64748b' }}>These counts describe in-app notification-record creation. They do not certify email or SMS provider delivery.</p>
          </section>
        )}

        <section aria-labelledby="broadcast-history-title">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <h2 id="broadcast-history-title" style={{ margin: 0, fontSize: 18 }}>Recent broadcasts</h2>
              <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12 }}>Latest 10 saved announcements and their recorded processing results.</p>
            </div>
            <button type="button" className="btn" onClick={() => void loadHistory()} disabled={historyLoading}>{historyLoading ? 'Refreshing…' : 'Refresh history'}</button>
          </div>

          {historyError && <div role="alert" style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 12 }}>
            {historyError} <button type="button" onClick={() => void loadHistory()} style={{ textDecoration: 'underline', marginLeft: 8 }}>Retry</button>
          </div>}
          {historyLoading && <p role="status" style={{ color: '#64748b', fontSize: 13 }}>Loading broadcast history…</p>}
          {!historyLoading && !historyError && history.length === 0 && <div className="card" style={{ padding: 24, color: '#64748b', fontSize: 13 }}>No broadcasts have been recorded yet.</div>}
          {!historyLoading && !historyError && history.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.map((item) => {
              const stats = item.stats || {};
              const status = item.status || 'draft';
              return (
                <article key={item._id || item.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 14, overflowWrap: 'anywhere' }}>{item.title || 'Untitled broadcast'}</h3>
                      <p style={{ margin: '6px 0', fontSize: 12, color: '#64748b', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.message || ''}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{audienceLabels[item.audience] || item.audience || 'Audience unavailable'} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Date unavailable'}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 9px', borderRadius: 999, background: status === 'partial' ? '#fef3c7' : status === 'sent' ? '#d1fae5' : '#f1f5f9', color: status === 'partial' ? '#92400e' : status === 'sent' ? '#065f46' : '#475569', whiteSpace: 'nowrap' }}>{statusLabels[status] || status}</span>
                  </div>
                  {item.stats && <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12, fontSize: 11, color: '#64748b' }}>
                    <span>Targets: {Number(stats.totalRecipients) || 0}</span>
                    <span>Records created: {Number(stats.successCount) || 0}</span>
                    <span>Record failures: {Number(stats.failCount) || 0}</span>
                  </div>}
                </article>
              );
            })}
          </div>}
        </section>
      </div>
    </div>
  );
}
