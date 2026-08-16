import React from 'react';
import { Vehicle, AuctionSession } from '../types';
import { AuctionCreationForm } from '../features/AuctionsView/components/AuctionCreationForm';
import { X, Gavel } from 'lucide-react';
import { Card } from './ui';

interface CreateAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableVehicles: Vehicle[];
  onAuctionCreated: (newSession: AuctionSession) => void;
  currentUserRole?: string;
  isUserVerified?: boolean;
}

export const CreateAuctionModal: React.FC<CreateAuctionModalProps> = ({
  isOpen,
  onClose,
  availableVehicles,
  onAuctionCreated,
  currentUserRole = 'dealer',
  isUserVerified = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#101935]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <Card className="max-w-4xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-[#1E3063] text-white p-5 sm:p-6 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300 border border-white/20">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">KAYAD Infrastructure</span>
              <h2 className="text-xl font-black font-display text-white mt-0.5">Configure Vehicle Auction Event</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body wrapping AuctionCreationForm */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <AuctionCreationForm
            availableVehicles={availableVehicles}
            onAuctionCreated={(session) => {
              onAuctionCreated(session);
              onClose();
            }}
            onCancel={onClose}
            userRole={currentUserRole}
            isUserVerified={isUserVerified}
          />
        </div>
      </Card>
    </div>
  );
};
