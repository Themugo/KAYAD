import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Lock, Globe, Plus } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function InternalNotes({ disputeId, notes, onRefresh }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);

  const handleAdd = async () => {
    if (!note.trim()) return;
    setAdding(true);
    try {
      await disputeAPI.addNote(disputeId, { note: note.trim(), isPrivate });
      toast('Note added', 'success');
      setNote('');
      setShowForm(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to add note', 'error');
    } finally {
      setAdding(false);
    }
  };

  const visibleNotes = notes?.filter(n => !n.isPrivate || isAdmin) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
          Notes {visibleNotes.length > 0 && <span className="text-gray-500">({visibleNotes.length})</span>}
        </h3>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 text-xs text-gold hover:text-gold/80">
            <Plus size={14} /> Add Note
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Type your note..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gold resize-none" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="accent-gold" />
              {isPrivate ? <><Lock size={12} /> Private (admin only)</> : <><Globe size={12} /> Visible to parties</>}
            </label>
            <button onClick={handleAdd} disabled={!note.trim() || adding}
              className="px-3 py-1.5 bg-gold text-black text-xs font-semibold rounded-lg hover:bg-gold/90 disabled:opacity-50">
              {adding ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {visibleNotes.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">No notes yet</p>
      ) : (
        visibleNotes.map((n, i) => (
          <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{n.note}</p>
              {n.isPrivate && <Lock size={12} className="text-gray-600 shrink-0 mt-1" />}
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{n.addedBy?.name || 'Admin'}</span>
              <span>{formatDistanceToNow(new Date(n.addedAt), { addSuffix: true })}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
