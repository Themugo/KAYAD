import React, { useEffect, useState } from 'react';
import { Bell, RefreshCw } from 'lucide-react';
import { Modal, Button } from './ui';
import { savedSearchAPI } from '../api/api';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SavedSearch {
  _id?: string;
  id?: string;
  name?: string;
  filters?: Record<string, unknown>;
  notify?: boolean;
  notifyOnNewMatch?: boolean;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await savedSearchAPI.list();
      setAlerts(Array.isArray(result?.searches) ? result.searches : Array.isArray(result?.data) ? result.data : []);
    } catch (err: any) {
      setAlerts([]);
      setError(err?.message || 'Unable to load your saved searches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void loadAlerts();
  }, [isOpen]);

  const toggleAlert = async (alert: SavedSearch) => {
    const id = String(alert.id || alert._id || '');
    if (!id) return;
    const enabled = !(alert.notify ?? alert.notifyOnNewMatch ?? false);
    try {
      const result = await savedSearchAPI.toggleAlerts(id, enabled);
      const updated = result?.search || result?.data || { ...alert, notify: enabled };
      setAlerts(prev => prev.map(item => String(item.id || item._id) === id ? updated : item));
    } catch (err: any) {
      setError(err?.message || 'Unable to update this alert.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<div className="flex items-center gap-2"><Bell className="w-5 h-5 text-[#176B87]" /><span>Instant Price Drop & Search Alerts</span></div>} maxWidth="md">
      <div className="space-y-4 text-xs">
        <p className="text-[#64748B] font-medium">Manage alerts attached to your saved searches. KAYAD only displays searches returned by your account.</p>
        {loading ? (
          <div className="p-8 text-center text-[#64748B]"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />Loading your saved searches…</div>
        ) : error ? (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 space-y-3"><p>{error}</p><Button variant="outline" size="sm" onClick={() => void loadAlerts()}>Try again</Button></div>
        ) : alerts.length === 0 ? (
          <div className="p-8 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] text-center"><p className="font-bold text-[#12576D]">No saved searches yet</p><p className="text-[#64748B] mt-1">Save a search from the marketplace to create an alert you can manage here.</p></div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, index) => {
              const id = String(alert.id || alert._id || alert.name || `saved-search-${index}`);
              const active = Boolean(alert.notify ?? alert.notifyOnNewMatch);
              return <button type="button" key={id} onClick={() => void toggleAlert(alert)} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${active ? 'bg-[#F3FAF9]/80 border-[#BDE5DE] text-[#176B87]' : 'bg-[#F6FAF9] border-[#D7E7E4] text-[#64748B]'}`}>
                <span className="font-bold">{alert.name || 'Saved search'}</span><span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-[#176B87] text-[#13B8A6]' : 'bg-[#DDF4F0] text-[#94A3B8]'}`}>{active ? '✓' : ''}</span>
              </button>;
            })}
          </div>
        )}
        <Button variant="primary" size="md" fullWidth onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
};

export default PriceAlertsModal;
