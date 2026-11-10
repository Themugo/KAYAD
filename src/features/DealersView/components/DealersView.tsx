import React, { useEffect, useMemo, useState } from 'react';
import { Building2, ExternalLink, Filter, MapPin, Search, ShieldCheck } from 'lucide-react';
import { PageHeader, Card, Badge, Button, Input, LazyImage } from '../../../components/ui';
import { api } from '../../../api/api';
import type { Dealer } from '../../../types';

interface DealersViewProps {
  onSelectDealerVehicles: (dealerName: string, dealerId?: string) => void;
}

export const DealersView: React.FC<DealersViewProps> = ({ onSelectDealerVehicles }) => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [county, setCounty] = useState('All');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.get('/users/dealers')
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data?.dealers) ? data.dealers : [];
        setDealers(rows.map((row: any) => {
          const location = String(row.location || 'Location not provided');
          const countyName = location.split(',').map((part: string) => part.trim()).filter(Boolean)[0] || 'Not specified';
          return {
            id: String(row.id),
            name: String(row.name || 'KAYAD dealer'),
            type: 'Enterprise Dealer',
            location,
            county: countyName,
            verifiedSince: row.approvedAt || '',
            rating: 0,
            reviewsCount: 0,
            activeListingsCount: 0,
            logo: row.avatar || '',
            badges: row.verification?.dealerApproved ? ['KAYAD dealer approval'] : [],
            phone: '',
            email: '',
            description: row.description || undefined,
          } as Dealer;
        }));
        setError(null);
      })
      .catch(() => {
        if (active) setError('Dealer directory is temporarily unavailable. Please try again.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retryKey]);

  const filteredDealers = useMemo(() => dealers.filter((dealer) => {
    if (county !== 'All' && dealer.county.toLowerCase() !== county.toLowerCase()) return false;
    if (!search.trim()) return true;
    const query = search.trim().toLowerCase();
    return dealer.name.toLowerCase().includes(query)
      || dealer.location.toLowerCase().includes(query);
  }), [dealers, county, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        badgeIcon={<Building2 className="w-4 h-4 text-[#176B87]" />}
        badgeText="Public Dealer Directory"
        title="Explore KAYAD Dealer Showrooms"
        description="Browse dealerships with an approved KAYAD dealer account. Approval confirms the dealer account status; it is not a guarantee of vehicle condition or transaction outcome."
      />

      <div className="bg-white rounded-2xl p-4 shadow-card border border-[#D7E7E4] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="Search dealership or location (e.g. Nairobi, Westlands, Nyali)…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium bg-[#F6FAF9] px-3.5 py-2.5 rounded-xl border border-[#D7E7E4] shrink-0">
          <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
          <label htmlFor="dealer-directory-county">County:</label>
          <select
            id="dealer-directory-county"
            value={county}
            onChange={(event) => setCounty(event.target.value)}
            className="bg-transparent font-bold text-[#176B87] focus:outline-none cursor-pointer"
          >
            <option value="All">All Counties</option>
            <option value="Nairobi">Nairobi</option>
            <option value="Mombasa">Mombasa</option>
            <option value="Nakuru">Nakuru</option>
            <option value="Kiambu">Kiambu</option>
          </select>
        </div>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-[#64748B]">Loading approved dealer showrooms…</Card>
      ) : error ? (
        <Card className="p-8 text-center space-y-3">
          <p className="font-bold text-[#12576D]">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setLoading(true); setRetryKey((key) => key + 1); }}>Retry</Button>
        </Card>
      ) : filteredDealers.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Building2 className="w-10 h-10 text-[#BDE5DE] mx-auto" />
          <p className="font-bold text-[#12576D]">No approved dealer showrooms match your search</p>
          <p className="text-xs text-[#64748B]">Try broadening your search or resetting the location filter.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCounty('All'); }}>Reset filters</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDealers.map((dealer) => (
            <Card key={dealer.id} className="p-6 flex flex-col justify-between space-y-4 hover:border-[#91CEC5] transition-all border border-[#D7E7E4]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <LazyImage
                    src={dealer.logo}
                    alt={dealer.name}
                    wrapperClassName="w-14 h-14 rounded-2xl border-2 border-[#BDE5DE] shadow-sm"
                    className="w-full h-full object-cover"
                  />
                  {dealer.verifiedSince && (
                    <Badge variant="verified" size="md">
                      <ShieldCheck className="w-3.5 h-3.5" /> KAYAD approved dealer
                    </Badge>
                  )}
                </div>
                <div>
                  <Badge variant="verified" size="sm"><Building2 className="w-3 h-3" /> Enterprise Dealer</Badge>
                  <h3 className="text-lg font-extrabold text-[#176B87] font-display mt-2">{dealer.name}</h3>
                  <p className="text-xs text-[#64748B] font-medium flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#176B87] shrink-0" /> {dealer.location}
                  </p>
                </div>
                {dealer.description && (
                  <p className="text-xs text-[#64748B] line-clamp-2 bg-[#F6FAF9] p-2.5 rounded-xl border border-[#D7E7E4]">{dealer.description}</p>
                )}
              </div>
              <div className="pt-3 border-t border-[#D7E7E4]">
                <Button variant="primary" size="md" fullWidth onClick={() => onSelectDealerVehicles(dealer.name, dealer.id)}>
                  <span>View showroom stock</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#13B8A6]" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealersView;
