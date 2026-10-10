import React, { useState } from 'react';
import { Vehicle } from '../types';
import { isEscrowApplicable, getEscrowBadgeLabel } from '../utils/escrow';
import { X, Lock, ArrowRightLeft, Sparkles, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { Modal, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Button, Badge, LazyImage } from './ui';

interface CompareModalProps {
  vehicles: Vehicle[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onStartEscrow: (vehicle: Vehicle) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  vehicles,
  onClose,
  onRemove,
  onStartEscrow,
  onQuickViewVehicle
}) => {
  const [highlightDifferences, setHighlightDifferences] = useState<boolean>(false);

  if (vehicles.length === 0) return null;

  // Calculate lowest price for best value tag
  const lowestPrice = Math.min(...vehicles.map((v) => v.price));

  // Helper function to check if values differ across columns
  const areValuesDifferent = (extractor: (v: Vehicle) => any) => {
    if (vehicles.length < 2) return false;
    const firstVal = extractor(vehicles[0]);
    return vehicles.some((v) => extractor(v) !== firstVal);
  };

  const title = (
    <div className="flex items-center justify-between w-full pr-8">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-[#176B87]" />
        <span>Vehicle Comparison Matrix ({vehicles.length} Selected)</span>
      </div>

      <button
        onClick={() => vehicles.forEach((v) => onRemove(v.id))}
        className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
      >
        <X className="w-3.5 h-3.5" /> Clear All
      </button>
    </div>
  );

  return (
    <Modal isOpen={vehicles.length > 0} onClose={onClose} title={title} maxWidth="5xl">
      <div className="space-y-4">
        {/* Toggle Highlight Differences Bar */}
        <div className="flex items-center justify-between bg-[#F6FAF9] p-3 rounded-xl border border-[#D7E7E4] text-xs">
          <span className="text-[#64748B] font-medium">
            Comparing specifications side-by-side across East Africa certified inventory
          </span>

          <label className="flex items-center gap-2 font-bold text-[#176B87] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={highlightDifferences}
              onChange={(e) => setHighlightDifferences(e.target.checked)}
              className="accent-[#176B87] w-4 h-4 rounded"
            />
            <Sparkles className="w-3.5 h-3.5 text-[#176B87]" />
            <span>Highlight Differences</span>
          </label>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto border border-[#D7E7E4] rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44 bg-[#EEF7F5] font-bold text-[#12576D]">Specification</TableHead>
                {vehicles.map((v) => (
                  <TableHead key={v.id} className="min-w-[220px] bg-[#F6FAF9]">
                    <div className="space-y-2 relative pt-2">
                      <button
                        onClick={() => onRemove(v.id)}
                        className="absolute top-0 right-0 p-1 bg-[#DDF4F0] hover:bg-rose-500 hover:text-white text-[#64748B] rounded-full transition-colors"
                        title="Remove vehicle from compare"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div
                        className="h-32 rounded-lg overflow-hidden border border-[#D7E7E4] relative group cursor-pointer"
                        onClick={() => onQuickViewVehicle?.(v)}
                        title="View vehicle details"
                      >
                        <LazyImage src={v.image} alt={v.title} wrapperClassName="h-full w-full" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        {v.price === lowestPrice && vehicles.length > 1 && (
                          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded shadow">
                            Lowest Price
                          </span>
                        )}
                      </div>

                      <div
                        className="cursor-pointer group"
                        onClick={() => onQuickViewVehicle?.(v)}
                      >
                        <p className="font-extrabold text-[#176B87] line-clamp-1 text-xs font-display group-hover:text-[#176B87] transition-colors">{v.title}</p>
                        <p className="text-[10px] text-[#64748B] font-medium">{v.location} ({v.county})</p>
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {/* Row: Price */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.price) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Price (Ksh)</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-black text-base text-[#176B87] font-display">
                    Ksh {v.price.toLocaleString()}
                    {v.marketPriceAvg && (
                      <span className="block text-[10px] text-[#94A3B8] font-normal line-through">
                        Avg: Ksh {v.marketPriceAvg.toLocaleString()}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Year & Mileage */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.year}-${v.mileage}`) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Year / Mileage</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-bold text-[#0A3340]">
                    {v.year} • {v.mileage.toLocaleString()} km
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Fuel & Transmission */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.fuelType}-${v.transmission}`) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Fuel & Transmission</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-[#12576D]">
                    {v.fuelType} ({v.transmission})
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Engine & Drive */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.engineSize}-${v.driveType}`) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Engine / Drive</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-[#12576D]">
                    {v.engineSize || 'N/A'} • {v.driveType || '2WD'}
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Body Style & Condition */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.bodyStyle}-${v.condition}`) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Body & Condition</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-medium text-[#12576D]">
                    {v.bodyStyle || 'N/A'} ({v.condition || 'Used'})
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Seller & Rating */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.sellerName) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Seller & Rating</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="font-semibold text-[#0A3340]">
                    <p>{v.sellerName}</p>
                    <p className="text-[#176B87] font-bold text-[11px] flex items-center gap-1 mt-0.5">
                      ★ {v.sellerRating} <span className="text-[#94A3B8] font-normal">({v.sellerType})</span>
                    </p>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: 150-Point Inspection */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.inspectionPassed) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Pre-purchase inspection</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Badge variant={v.inspectionPassed ? 'success' : 'neutral'}>
                      {v.inspectionPassed ? '✓ Certified Passed' : 'Pending'}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Escrow Protection */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => isEscrowApplicable(v)) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Escrow Protection</TableCell>
                {vehicles.map((v) => {
                  const escrowActive = isEscrowApplicable(v);
                  return (
                    <TableCell key={v.id}>
                      <Badge variant={escrowActive ? 'escrow' : 'neutral'}>
                        {escrowActive ? `✓ ${getEscrowBadgeLabel(v)}` : 'Standard Deal'}
                      </Badge>
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Row: Financing Availability */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => v.financeAvailable) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Financing</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Badge variant={v.financeAvailable ? 'success' : 'neutral'}>
                      {v.financeAvailable ? '✓ Asset Finance Ready' : 'Cash Deal'}
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: Response Time & Freshness */}
              <TableRow className={highlightDifferences && areValuesDifferent((v) => `${v.responseTime}-${v.listingFreshness}`) ? 'bg-[#F3FAF9]/70' : ''}>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Response & Freshness</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id} className="text-[11px] font-medium text-[#12576D]">
                    <p className="font-bold text-[#12576D]">{v.responseTime || '< 15 mins'}</p>
                    <p className="text-[#94A3B8]">{v.listingFreshness}</p>
                  </TableCell>
                ))}
              </TableRow>

              {/* Row: CTA Actions */}
              <TableRow>
                <TableCell className="font-bold text-[#64748B] bg-[#F6FAF9]/50">Purchase Option</TableCell>
                {vehicles.map((v) => (
                  <TableCell key={v.id}>
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        onClose();
                        onStartEscrow(v);
                      }}
                    >
                      <Lock className="w-3.5 h-3.5 text-[#13B8A6]" />
                      Buy with Escrow
                    </Button>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </Modal>
  );
};

export default CompareModal;
