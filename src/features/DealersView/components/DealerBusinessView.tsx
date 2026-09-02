import React from 'react';
import type { Vehicle } from '../../../types';

export interface DealerBusinessViewProps {
  vehicles: Vehicle[];
  onAddVehicle?: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
  onStartEscrow?: (vehicle: Vehicle) => void;
}

/**
 * Dealer management requires an authenticated dealer context and backend
 * contracts for leads, auctions, finance, appointments and settlements.
 * This route intentionally fails closed instead of rendering fabricated
 * operational records when that context is unavailable.
 */
export const DealerBusinessView: React.FC<DealerBusinessViewProps> = () => (
  <div className="p-8 text-center">
    <h2 className="text-xl font-bold text-[#1E3063]">Dealer management unavailable</h2>
    <p className="mt-2 text-sm text-slate-500">Authenticated dealer data and the required backend operational contracts must be available before this console can display records.</p>
  </div>
);

export default DealerBusinessView;
