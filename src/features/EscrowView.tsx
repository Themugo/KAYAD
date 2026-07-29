import React, { useState, useMemo } from 'react';
import { EscrowTransaction } from '../types';
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  Landmark, 
  Clock, 
  ArrowRight, 
  Search, 
  ShieldCheck, 
  FileCheck, 
  UserCheck, 
  Building2,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input } from '../components/ui';

interface EscrowViewProps {
  deals: EscrowTransaction[];
}

export const EscrowView: React.FC<EscrowViewProps> = ({ deals }) => {
  const [dealSearch, setDealSearch] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<EscrowTransaction | null>(deals[0] || null);

  const steps = [
    { num: 1, title: '1. Vault Deposit', desc: 'Buyer deposits purchase price into bank-backed KAYAD Escrow Vault.' },
    { num: 2, title: '2. 150-Point Inspection', desc: 'Certified KAYAD field engineer conducts physical inspection & VIN check.' },
    { num: 3, title: '3. NTSA TIMS Transfer', desc: 'Logbook title transfer submitted and verified on NTSA portal.' },
    { num: 4, title: '4. Verified Release', desc: 'Buyer approves release and seller receives funds instantaneously.' }
  ];

  const filteredDeals = useMemo(() => {
    if (!dealSearch) return deals;
    const q = dealSearch.toLowerCase();
    return deals.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.vehicleTitle.toLowerCase().includes(q) ||
        d.buyerName.toLowerCase().includes(q) ||
        d.sellerName.toLowerCase().includes(q)
    );
  }, [deals, dealSearch]);

  const totalVaultValue = deals.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        badgeIcon={<Lock className="w-4 h-4 text-amber-500" />}
        badgeText="Bank-Grade Escrow Vault"
        title="KAYAD Protected Vehicle Transactions Portal"
        description="Eliminate car sale fraud across East Africa. Funds remain safely locked in custodian vault accounts until physical 150-point inspection and NTSA TIMS logbook transfer are certified."
        rightElement={
          <Badge variant="success" size="md">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            100% Guaranteed Zero Fraud
          </Badge>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Total Locked Vault Volume"
          value={`Ksh ${totalVaultValue.toLocaleString()}`}
          trend="Custodian Partner Banks"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Active Protected Deals"
          value={deals.length}
          trend="100% In Compliance"
          trendType="positive"
          icon={<Lock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Avg Settlement Time"
          value="< 36 Hours"
          trend="Instant Bank Transfer"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Logbook Audit Clearance"
          value="100% Authentic"
          trend="NTSA TIMS Realtime Sync"
          trendType="positive"
          icon={<FileCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Interactive 4-Step Escrow Protocol Card */}
      <Card className="p-6 bg-gradient-to-br from-[#1E3063] via-[#17244B] to-slate-900 text-white border border-amber-400/30 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider font-display">
            <Shield className="w-4 h-4" /> Official KAYAD Escrow Vault Protocol
          </div>
          <span className="text-xs text-slate-300 font-medium">
            Bank Custodian Partnership: Standard Chartered & NCBA
          </span>
        </div>

        {/* Workflow Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
          {steps.map((s) => (
            <div key={s.num} className="bg-white/10 border border-white/15 p-4 rounded-xl space-y-1.5 backdrop-blur-md">
              <span className="w-7 h-7 rounded-full bg-amber-400 text-[#17244B] font-black flex items-center justify-center text-xs font-display shadow-sm">
                {s.num}
              </span>
              <p className="font-extrabold text-white text-xs font-display pt-1">{s.title}</p>
              <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search Deal ID, vehicle name, buyer or seller..."
            value={dealSearch}
            onChange={(e) => setDealSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
          <span>Active Protected Transactions:</span>
          <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md font-extrabold">
            {filteredDeals.length} Deals
          </span>
        </div>
      </div>

      {/* Active Transactions Table */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2 text-[#1E3063]">
            <Lock className="w-4 h-4 text-amber-500" />
            Live Escrow Vault Transaction Queue
          </CardTitle>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deal Reference</TableHead>
              <TableHead>Vehicle Item</TableHead>
              <TableHead>Protected Vault Balance</TableHead>
              <TableHead>Parties Involved</TableHead>
              <TableHead>Vault Stage Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeals.map((d) => (
              <TableRow 
                key={d.id} 
                className={`hover:bg-slate-50 transition-colors ${
                  selectedDeal?.id === d.id ? 'bg-amber-50/50' : ''
                }`}
              >
                <TableCell className="font-mono font-extrabold text-xs text-[#1E3063]">{d.id}</TableCell>
                <TableCell className="font-extrabold text-xs text-[#1E3063]">{d.vehicleTitle}</TableCell>
                <TableCell className="font-black text-xs text-slate-900">Ksh {d.amount.toLocaleString()}</TableCell>
                <TableCell className="font-medium text-xs text-slate-600">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800">{d.buyerName} <span className="text-slate-400 font-normal">(Buyer)</span></p>
                    <p className="text-slate-500">{d.sellerName} <span className="text-slate-400 font-normal">(Seller)</span></p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="w-3 h-3" /> {d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedDeal(d)}
                  >
                    <span>Inspect Record</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Selected Deal Details Panel */}
      {selectedDeal && (
        <Card className="p-6 bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <span className="font-mono text-xs text-slate-400 font-bold uppercase">{selectedDeal.id}</span>
              <h3 className="text-lg font-black text-[#1E3063] font-display">{selectedDeal.vehicleTitle}</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Locked Vault Amount</p>
              <p className="text-xl font-black text-[#1E3063]">Ksh {selectedDeal.amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Buyer Verification</p>
              <p className="font-extrabold text-[#1E3063]">{selectedDeal.buyerName}</p>
              <p className="text-emerald-700 font-bold">✓ KRA PIN & National ID Verified</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Seller Verification</p>
              <p className="font-extrabold text-[#1E3063]">{selectedDeal.sellerName}</p>
              <p className="text-emerald-700 font-bold">✓ Verified Logbook Holder</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Inspection Certificate</p>
              <p className="font-extrabold text-emerald-800">150-Point Audit Certified</p>
              <p className="text-slate-500 font-medium">NTSA TIMS Clearance Passed</p>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
};

export default EscrowView;
