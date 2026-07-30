import React, { useState, useMemo } from 'react';
import { Vehicle } from '../types';
import { 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCheck, 
  Search, 
  Filter, 
  Eye, 
  ShieldAlert,
  Building2,
  UserCheck,
  Zap,
  Activity
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, LazyImage } from '../components/ui';

interface AdminViewProps {
  vehicles: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ vehicles, onQuickViewVehicle }) => {
  const [inspectedIds, setInspectedIds] = useState<string[]>(['v1', 'v2', 'v3', 'v4']);
  const [filterStatus, setFilterStatus] = useState<'all' | 'certified' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const toggleVerify = (id: string) => {
    setInspectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const isPassed = inspectedIds.includes(v.id);
      if (filterStatus === 'certified' && !isPassed) return false;
      if (filterStatus === 'pending' && isPassed) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          v.title.toLowerCase().includes(q) ||
          v.sellerName.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vehicles, inspectedIds, filterStatus, searchQuery]);

  const certifiedCount = inspectedIds.length;
  const pendingCount = Math.max(0, vehicles.length - certifiedCount);

  return (
    <div className="space-y-6">
      {/* Super Admin Command Console Header */}
      <PageHeader
        variant="navy"
        badgeIcon={<Lock className="w-4 h-4 text-amber-400" />}
        badgeText="KAYAD Verification & Audit Console"
        title="Field Inspection & Logbook Moderation Command Center"
        description="Review 150-point technical audit reports, verify NTSA TIMS logbook ownership, and authorize escrow vault participation."
        rightElement={
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="md">
              <ShieldCheck className="w-4 h-4" />
              Super Admin Control
            </Badge>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Total Inventory Queue"
          value={vehicles.length}
          trend="100% TIMS Registered"
          trendType="neutral"
          icon={<FileCheck className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Certified Listings"
          value={certifiedCount}
          trend={`${Math.round((certifiedCount / vehicles.length) * 100)}% Verified Pass Rate`}
          trendType="positive"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        />

        <StatWidget
          label="Pending Technical Audits"
          value={pendingCount}
          trend="Field Engineers Assigned"
          trendType="warning"
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Logbook Fraud Prevention"
          value="100% Protected"
          trend="Zero Escrow Claims"
          trendType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto">
          {[
            { id: 'all', label: `All Vehicles (${vehicles.length})`, icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'certified', label: `Certified Passed (${certifiedCount})`, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
            { id: 'pending', label: `Pending Review (${pendingCount})`, icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterStatus(btn.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterStatus === btn.id
                  ? 'bg-[#1E3063] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search vehicle, seller name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Moderation Queue Console Table */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-[#1E3063]">
            <Lock className="w-4 h-4 text-amber-500" />
            Field Verification & Technical Audit Approval Queue
          </CardTitle>
          <span className="text-xs font-bold text-slate-500">
            Showing {filteredVehicles.length} of {vehicles.length} listings
          </span>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle & Details</TableHead>
              <TableHead>Seller Category</TableHead>
              <TableHead>Location & Yard</TableHead>
              <TableHead>150-Point Audit Status</TableHead>
              <TableHead>Action Command</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVehicles.map((v) => {
              const isPassed = inspectedIds.includes(v.id);
              const isPrivate = v.sellerType === 'Private Seller';
              return (
                <TableRow key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div 
                      onClick={() => onQuickViewVehicle?.(v)}
                      className="flex items-center gap-3 cursor-pointer group"
                      title="Click to inspect vehicle details"
                    >
                      <LazyImage src={v.image} alt={v.title} wrapperClassName="w-14 h-10 rounded-lg border border-slate-200 shrink-0" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div>
                        <p className="font-extrabold text-[#1E3063] text-xs group-hover:text-amber-600 transition-colors flex items-center gap-1">
                          {v.title}
                          <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">Ksh {v.price.toLocaleString()} • {v.year}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 text-xs">{v.sellerName}</p>
                      <Badge variant={isPrivate ? "neutral" : "verified"} size="sm">
                        {isPrivate ? <UserCheck className="w-3 h-3 text-emerald-600" /> : <Building2 className="w-3 h-3 text-amber-400" />}
                        {v.sellerType}
                      </Badge>
                    </div>
                  </TableCell>

                  <TableCell className="font-medium text-slate-600 text-xs">
                    {v.location} ({v.county})
                  </TableCell>

                  <TableCell>
                    <Badge variant={isPassed ? 'success' : 'warning'} size="sm">
                      {isPassed ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {isPassed ? '150-Pt Certified Passed' : 'Pending Inspector Review'}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Button
                      variant={isPassed ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => toggleVerify(v.id)}
                      className="shadow-xs"
                    >
                      {isPassed ? 'Revoke Certificate' : 'Approve & Certify'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Field Inspection Audit Standard Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <p className="font-extrabold text-amber-400 flex items-center gap-1.5 font-display text-sm">
            <Zap className="w-4 h-4" /> Official KAYAD Field Engineering Protocol
          </p>
          <p className="text-slate-300">
            Every approved listing must undergo physical compression testing, chassis alignment scan, and TIMS digital NTSA logbook match before receiving the Escrow Vault badge.
          </p>
        </div>
        <Badge variant="accent" size="md">
          Standard Operating Procedure V2.4
        </Badge>
      </div>

    </div>
  );
};

export default AdminView;
