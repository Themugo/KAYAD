import { useState } from 'react';
import { announcementAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

export default function AdminBroadcast() {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title || !message) return;
    setSending(true);
    try {
      const ann = await announcementAPI.create({ title, message, audience });
      await announcementAPI.send(ann._id || ann.announcement?._id);
      toast('Broadcast sent successfully', 'success');
      setTitle('');
      setMessage('');
    } catch {
      toast('Failed to send broadcast', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, maxWidth: 600 }}>
        <h1 style={{ marginBottom: 24 }}>Broadcast Message</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input className="input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="input" placeholder="Message" value={message} onChange={e => setMessage(e.target.value)} rows={6} style={{ resize: 'vertical' }} />
          <select className="input" value={audience} onChange={e => setAudience(e.target.value)}>
            <option value="all">All Users</option>
            <option value="dealers">Dealers</option>
            <option value="buyers">Buyers</option>
          </select>
          <button className="btn btn-primary" disabled={sending || !title || !message} onClick={handleSend} style={{ alignSelf: 'flex-start' }}>
            {sending ? 'Sending…' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
