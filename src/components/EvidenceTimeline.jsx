import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Eye, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { disputeAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const TYPE_META = {
  image:             { icon: '📷', label: 'Image', color: 'text-blue-400' },
  video:             { icon: '🎥', label: 'Video', color: 'text-purple-400' },
  document:          { icon: '📄', label: 'Document', color: 'text-yellow-400' },
  inspection_report: { icon: '🔍', label: 'Inspection Report', color: 'text-green-400' },
  payment_record:    { icon: '💳', label: 'Payment Record', color: 'text-emerald-400' },
  chat_log:          { icon: '💬', label: 'Chat Log', color: 'text-cyan-400' },
};

export default function EvidenceTimeline({ evidence, disputeId, onRefresh }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState(null);
  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);

  const handleDelete = async (evidenceId) => {
    if (!confirm('Delete this evidence?')) return;
    try {
      await disputeAPI.deleteEvidence(disputeId, evidenceId);
      toast('Evidence deleted', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast(err?.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleVerify = async (evidenceId) => {
    try {
      await disputeAPI.verifyEvidence(disputeId, evidenceId);
      toast('Evidence verified', 'success');
      if (onRefresh) onRefresh();
    } catch (err) {
      toast('Verification failed', 'error');
    }
  };

  if (!evidence || evidence.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-3xl mb-2">📁</p>
        <p className="text-sm">No evidence uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evidence.map((item) => {
        const meta = TYPE_META[item.type] || { icon: '📄', label: item.type, color: 'text-gray-400' };
        const isOwner = item.uploadedBy?._id === user?.id || item.uploadedBy === user?.id;

        return (
          <div key={item._id} className="bg-gray-900 border border-gray-700 rounded-lg p-3 flex items-start gap-3 group">
            <span className={`text-xl mt-1 ${meta.color}`}>{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{item.fileName}</p>
              <p className="text-xs text-gray-500">{meta.label}</p>
              {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>{(item.size / 1024).toFixed(0)}KB</span>
                <span>{item.uploadedBy?.name || 'Unknown'}</span>
                <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</span>
                {item.verified && <span className="text-green-400 flex items-center gap-1"><CheckCircle size={12} /> Verified</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={() => setPreviewUrl(previewUrl === item.url ? null : item.url)}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200" title="Preview">
                <Eye size={16} />
              </button>
              <a href={item.url} download={item.fileName}
                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-gray-200" title="Download">
                <Download size={16} />
              </a>
              {isAdmin && !item.verified && (
                <button onClick={() => handleVerify(item._id)}
                  className="p-1.5 hover:bg-gray-700 rounded text-green-400 hover:text-green-300" title="Verify">
                  <CheckCircle size={16} />
                </button>
              )}
              {(isAdmin || isOwner) && (
                <button onClick={() => handleDelete(item._id)}
                  className="p-1.5 hover:bg-gray-700 rounded text-red-400 hover:text-red-300" title="Delete">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {previewUrl.match(/\.(mp4|webm|mov)$/i) ? (
              <video src={previewUrl} controls className="max-h-[80vh] rounded-lg" />
            ) : previewUrl.match(/\.pdf$/i) ? (
              <iframe src={previewUrl} className="w-full h-[80vh] rounded-lg" />
            ) : (
              <img src={previewUrl} alt="evidence" className="max-h-[80vh] rounded-lg" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
