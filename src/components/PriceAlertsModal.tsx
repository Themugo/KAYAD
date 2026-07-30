import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Modal, Button } from './ui';

interface PriceAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PriceAlertsModal: React.FC<PriceAlertsModalProps> = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([
    { id: '1', title: 'Toyota Prado TX-L (2020-2022) under Ksh 7.0M', active: true },
    { id: '2', title: 'Subaru Outback EyeSight under Ksh 3.5M in Nairobi', active: true },
    { id: '3', title: 'Bank Auction Vehicles in Eldoret / Nakuru', active: false }
  ]);

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const title = (
    <div className="flex items-center gap-2">
      <Bell className="w-5 h-5 text-amber-500" />
      <span>Instant Price Drop & Search Alerts</span>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4 text-xs">
        <p className="text-slate-500 font-medium">
          Get notified via SMS or Email as soon as matching vehicles are listed or dealers drop prices below market average.
        </p>

        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              onClick={() => toggleAlert(a.id)}
              className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                a.active ? 'bg-amber-50/80 border-amber-300 text-[#1E3063]' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span className="font-bold">{a.title}</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                a.active ? 'bg-[#1E3063] text-amber-400' : 'bg-slate-200 text-slate-400'
              }`}>
                {a.active ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={onClose}
        >
          Save Notification Preferences
        </Button>
      </div>
    </Modal>
  );
};

export default PriceAlertsModal;
