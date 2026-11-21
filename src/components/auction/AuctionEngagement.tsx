import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Users, Heart, Bell, BellRing, MessageCircle, Trash2, Send, Flag } from 'lucide-react';
import { auctionEngagementAPI } from '../../api/api';
import { useSocket } from '../../context/SocketContext';

type Engagement = { watchers: number; visits: number; uniqueVisitors: number; follows: number; likes: number; comments: number; enabled: boolean; viewer: { followed: boolean; liked: boolean } };
const EMPTY: Engagement = { watchers: 0, visits: 0, uniqueVisitors: 0, follows: 0, likes: 0, comments: 0, enabled: false, viewer: { followed: false, liked: false } };
const num = (n: number) => Number(n || 0).toLocaleString('en-KE');
const errMsg = (e: any, fallback: string) => e?.response?.data?.message || e?.message || fallback;

/** Loads counters, records one visit, and keeps watchers / follows / likes / comments live over the auction socket room. */
export function useAuctionEngagement(auctionId: string | undefined, isAuth: boolean) {
  const [state, setState] = useState<Engagement>(EMPTY);
  const { on } = useSocket();
  const visited = useRef<string | null>(null);

  useEffect(() => {
    if (!auctionId) return;
    let cancelled = false;
    auctionEngagementAPI.get(auctionId).then((d: any) => { if (!cancelled && d?.engagement) setState((s) => ({ ...s, ...d.engagement })); }).catch(() => {});
    if (visited.current !== auctionId) { visited.current = auctionId; auctionEngagementAPI.visit(auctionId).catch(() => {}); }
    return () => { cancelled = true; };
  }, [auctionId, isAuth]);

  useEffect(() => {
    if (!auctionId) return;
    const offs = [
      on('auctionWatchers', (p: any) => { if (String(p?.carId) === String(auctionId)) setState((s) => ({ ...s, watchers: Number(p.watchers || 0) })); }),
      on('auctionEngagement', (p: any) => { if (String(p?.carId) === String(auctionId)) setState((s) => ({ ...s, follows: Number(p.follows ?? s.follows), likes: Number(p.likes ?? s.likes), comments: Number(p.comments ?? s.comments) })); }),
    ];
    return () => offs.forEach((off) => (typeof off === 'function' ? off() : undefined));
  }, [auctionId, on]);

  return [state, setState] as const;
}

interface BarProps { auctionId: string; state: Engagement; setState: React.Dispatch<React.SetStateAction<Engagement>>; isAuth: boolean; onNeedLogin: () => void; onMessage: (m: string) => void }

export function AuctionEngagementBar({ auctionId, state, setState, isAuth, onNeedLogin, onMessage }: BarProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (kind: 'follow' | 'like') => {
    if (!isAuth) { onNeedLogin(); return; }
    if (busy) return;
    const on = kind === 'follow' ? !state.viewer.followed : !state.viewer.liked;
    setBusy(kind);
    // optimistic, then reconcile with the server's authoritative counters
    setState((s) => ({ ...s, viewer: { ...s.viewer, [kind === 'follow' ? 'followed' : 'liked']: on }, [kind === 'follow' ? 'follows' : 'likes']: Math.max(0, (kind === 'follow' ? s.follows : s.likes) + (on ? 1 : -1)) }));
    try {
      const d: any = await auctionEngagementAPI[kind](auctionId, on);
      if (d?.engagement) setState((s) => ({ ...s, ...d.engagement }));
      if (kind === 'follow') onMessage(on ? 'Following. We will tell you when it goes live and when it ends.' : 'Unfollowed.');
    } catch (e) {
      setState((s) => ({ ...s, viewer: { ...s.viewer, [kind === 'follow' ? 'followed' : 'liked']: !on }, [kind === 'follow' ? 'follows' : 'likes']: Math.max(0, (kind === 'follow' ? s.follows : s.likes) + (on ? -1 : 1)) }));
      onMessage(errMsg(e, 'That did not go through.'));
    } finally { setBusy(null); }
  };
  const chip = 'inline-flex items-center gap-1.5 text-sm';
  const btn = 'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold';
  return (
    <section aria-label="Audience" data-testid="engagement-bar" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3" style={{ background: 'var(--surface, #fff)' }}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className={chip} data-testid="watchers"><Users size={16} aria-hidden="true" /><strong>{num(state.watchers)}</strong> watching now</span>
        <span className={chip} data-testid="visits"><Eye size={16} aria-hidden="true" /><strong>{num(state.visits)}</strong> views</span>
        <span className={chip}><MessageCircle size={16} aria-hidden="true" /><strong>{num(state.comments)}</strong> comments</span>
      </div>
      {state.enabled && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} aria-pressed={state.viewer.liked} onClick={() => toggle('like')} disabled={busy === 'like'}>
            <Heart size={16} aria-hidden="true" fill={state.viewer.liked ? 'currentColor' : 'none'} /> {state.viewer.liked ? 'Liked' : 'Like'} · {num(state.likes)}
          </button>
          <button type="button" className={btn} aria-pressed={state.viewer.followed} onClick={() => toggle('follow')} disabled={busy === 'follow'}>
            {state.viewer.followed ? <BellRing size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />} {state.viewer.followed ? 'Following' : 'Follow'} · {num(state.follows)}
          </button>
        </div>
      )}
    </section>
  );
}

interface Comment { id: string; author: string; isOrganizer: boolean; body: string; createdAt: string; mine?: boolean }

export function AuctionComments({ auctionId, isAuth, myTag, canModerate, onNeedLogin }: { auctionId: string; isAuth: boolean; myTag?: string; canModerate?: boolean; onNeedLogin: () => void }) {
  const [items, setItems] = useState<Comment[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const { on } = useSocket();

  const load = useCallback(() => auctionEngagementAPI.comments(auctionId).then((d: any) => { setItems(d.comments || []); setEnabled(d.enabled !== false); }).catch(() => setEnabled(false)), [auctionId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const offs = [
      on('auctionComment', (p: any) => { if (String(p?.carId) === String(auctionId) && p.comment) setItems((cur) => (cur.some((c) => c.id === p.comment.id) ? cur : [p.comment, ...cur])); }),
      on('auctionCommentRemoved', (p: any) => { if (String(p?.carId) === String(auctionId)) setItems((cur) => cur.filter((c) => c.id !== p.commentId)); }),
    ];
    return () => offs.forEach((off) => (typeof off === 'function' ? off() : undefined));
  }, [auctionId, on]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuth) { onNeedLogin(); return; }
    if (sending || !text.trim()) return;
    setSending(true); setNote(null);
    try {
      const d: any = await auctionEngagementAPI.comment(auctionId, text);
      setItems((cur) => (cur.some((c) => c.id === d.comment.id) ? cur : [d.comment, ...cur]));
      setText('');
    } catch (err) { setNote(errMsg(err, 'Could not post your comment.')); } finally { setSending(false); }
  };
  const remove = async (id: string) => {
    try { await auctionEngagementAPI.removeComment(auctionId, id); setItems((cur) => cur.filter((c) => c.id !== id)); } catch (err) { setNote(errMsg(err, 'Could not remove that comment.')); }
  };

  const report = async (id: string) => {
    if (!isAuth) { onNeedLogin(); return; }
    try { const d: any = await auctionEngagementAPI.report(auctionId, id, 'reported by a viewer'); setNote('Thanks. We will review it.'); if (d?.hidden) setItems((cur) => cur.filter((c) => c.id !== id)); }
    catch (err) { setNote(errMsg(err, 'Could not send your report.')); }
  };

  if (!enabled) return null;
  return (
    <section aria-label="Comments" data-testid="auction-comments" className="card" style={{ marginTop: 16 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h3 style={{ fontSize: '1rem' }}>Comments</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>You appear as your anonymous ID. No links, phone numbers or off-platform deals.</p></div>
      <form onSubmit={submit} style={{ padding: '12px 20px', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <label style={{ flex: 1, fontSize: 13 }}>
          <span className="sr-only">Add a comment</span>
          <textarea value={text} maxLength={500} rows={2} onChange={(e) => setText(e.target.value)} placeholder={isAuth ? 'Ask a question or share a thought…' : 'Sign in to comment'} onFocus={() => { if (!isAuth) onNeedLogin(); }}
            style={{ width: '100%', minHeight: 44, borderRadius: 10, border: '1px solid var(--border)', padding: '10px 12px', resize: 'vertical' }} />
        </label>
        <button type="submit" disabled={sending || !text.trim()} className="btn btn-primary" style={{ minHeight: 44, minWidth: 44 }} aria-label="Post comment"><Send size={16} aria-hidden="true" /></button>
      </form>
      {note && <p role="alert" style={{ padding: '0 20px 8px', fontSize: 13, color: 'var(--red, #b42318)' }}>{note}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: '0 0 8px', maxHeight: 360, overflowY: 'auto' }}>
        {items.length === 0 && <li style={{ padding: '20px', textAlign: 'center', fontSize: 14, color: 'var(--text-muted)' }}>No comments yet. Start the conversation.</li>}
        {items.map((c) => (
          <li key={c.id} style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{c.author}{c.isOrganizer && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--brand-light)' }}>OWNER</span>}{myTag && c.author === myTag && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--brand-light)' }}>YOU</span>}<span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
              <p style={{ margin: '4px 0 0', fontSize: 14, overflowWrap: 'anywhere' }}>{c.body}</p>
            </div>
            {myTag && c.author === myTag || canModerate ? null : <button type="button" aria-label="Report comment" onClick={() => report(c.id)} style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Flag size={15} aria-hidden="true" /></button>}
            {(canModerate || (myTag && c.author === myTag)) && <button type="button" aria-label="Remove comment" onClick={() => remove(c.id)} style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} aria-hidden="true" /></button>}
          </li>
        ))}
      </ul>
    </section>
  );
}
