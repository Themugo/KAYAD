import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatKES } from '../utils/helpers';

interface ValuationData {
  make: string;
  model: string;
  year: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceChange: number; // percentage
  listingsCount: number;
  daysOnMarket: number;
}

interface MarketValuationMatrixProps {
  vehicle?: {
    make?: string;
    model?: string;
    year?: number;
    price?: number;
  };
}

export default function MarketValuationMatrix({ vehicle }: MarketValuationMatrixProps) {
  // Demo data
  const valuations: ValuationData[] = [
    {
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2023,
      avgPrice: 16500000,
      minPrice: 14800000,
      maxPrice: 18200000,
      priceChange: 3.2,
      listingsCount: 45,
      daysOnMarket: 12,
    },
    {
      make: 'Toyota',
      model: 'Prado',
      year: 2023,
      avgPrice: 12800000,
      minPrice: 11500000,
      maxPrice: 14200000,
      priceChange: -1.5,
      listingsCount: 62,
      daysOnMarket: 18,
    },
    {
      make: 'Mercedes-Benz',
      model: 'GLE',
      year: 2023,
      avgPrice: 13500000,
      minPrice: 12200000,
      maxPrice: 15000000,
      priceChange: 2.1,
      listingsCount: 28,
      daysOnMarket: 8,
    },
    {
      make: 'Range Rover',
      model: 'Sport',
      year: 2023,
      avgPrice: 15800000,
      minPrice: 14200000,
      maxPrice: 17500000,
      priceChange: 4.8,
      listingsCount: 19,
      daysOnMarket: 22,
    },
  ];

  const currentVehicle = vehicle ? valuations.find(
    v => v.make.toLowerCase() === vehicle.make?.toLowerCase() && 
    v.model.toLowerCase() === vehicle.model?.toLowerCase()
  ) : null;

  const getTrendIcon = (change: number) => {
    if (change > 2) return <TrendingUp size={14} className="text-emerald-500" />;
    if (change < -2) return <TrendingDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-warm-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 2) return 'text-emerald-600';
    if (change < -2) return 'text-red-600';
    return 'text-warm-600';
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-cream-200 flex items-center justify-between">
        <div>
          <h3 className="font-serif text-lg text-charcoal-900 font-bold">Market Valuation</h3>
          <p className="font-sans text-xs text-warm-400 mt-0.5">Based on similar listings in Kenya</p>
        </div>
        <button className="p-2 hover:bg-cream-50 rounded-lg transition-colors">
          <Info size={16} className="text-warm-400" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-cream-50">
              <th className="px-4 py-3 text-left font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">Vehicle</th>
              <th className="px-4 py-3 text-right font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">Avg. Price</th>
              <th className="px-4 py-3 text-right font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">Range</th>
              <th className="px-4 py-3 text-right font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">Trend</th>
              <th className="px-4 py-3 text-right font-sans text-[10px] text-warm-400 font-bold uppercase tracking-wider">Listings</th>
            </tr>
          </thead>
          <tbody>
            {valuations.map((v, idx) => {
              const isMatch = currentVehicle?.model === v.model;
              return (
                <tr
                  key={idx}
                  className={`border-b border-cream-100 hover:bg-cream-50 transition-colors ${
                    isMatch ? 'bg-gold-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isMatch && (
                        <div className="w-1.5 h-1.5 bg-gold-500 rounded-full" />
                      )}
                      <div>
                        <p className={`font-sans text-sm font-semibold ${isMatch ? 'text-gold-700' : 'text-charcoal-900'}`}>
                          {v.make} {v.model}
                        </p>
                        <p className="font-sans text-xs text-warm-400">{v.year}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-sans text-sm font-semibold text-charcoal-900">
                      {formatKES(v.avgPrice)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-sans text-xs text-warm-500">
                      {formatKES(v.minPrice)} - {formatKES(v.maxPrice)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`flex items-center justify-end gap-1 font-sans text-xs font-semibold ${getTrendColor(v.priceChange)}`}>
                      {getTrendIcon(v.priceChange)}
                      <span>{v.priceChange > 0 ? '+' : ''}{v.priceChange}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-sans text-xs text-warm-500">{v.listingsCount}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-cream-50 border-t border-cream-200">
        <p className="font-sans text-[10px] text-warm-400 text-center">
          Prices updated daily · Based on {valuations.reduce((sum, v) => sum + v.listingsCount, 0)} active listings
        </p>
      </div>
    </div>
  );
}
