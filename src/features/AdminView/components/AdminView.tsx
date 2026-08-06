import React, { useState } from 'react';
import { Vehicle } from '../../../types';
import { Lock, ShieldCheck, Search, ShieldAlert, Building2, Zap, LayoutDashboard, Car, Users, Wrench, Landmark, Shield, Gavel, ClipboardCheck, AlertOctagon, Ticket, FileText, PieChart, CreditCard, Percent, Settings, History, Key, Server, Download, Unlock, TrendingUp, Sliders } from 'lucide-react';
import { PageHeader, StatWidget, Card, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Input, LazyImage, Select } from '../../../components/ui';
import { MockEnterpriseData, DealerRecord, PrivateSellerRecord, EscrowTxnRecord, DisputeRecord, FraudFlagRecord, AuditLogRecord } from '../../../data/mockEnterpriseData';

interface AdminViewProps {
  vehicles: Vehicle[];
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export type EnterpriseModule = 
  | 'executive'
  | 'marketplace'
  | 'dealers'
  | 'sellers'
  | 'mechanics'
  | 'banks'
  | 'escrow'
  | 'auctions'
  | 'inspections'
  | 'disputes'
  | 'fraud'
  | 'support'
  | 'moderation'
  | 'reports'
  | 'billing'
  | 'commission'
  | 'settings'
  | 'audit'
  | 'rbac'
  | 'api';

export const AdminView: React.FC<AdminViewProps> = ({ vehicles, onQuickViewVehicle }) => {
  // State management
  const [activeModule, setActiveModule] = useState<EnterpriseModule>('executive');
  const [adminRole, setAdminRole] = useState<string>('Super Admin (CPO)');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unmaskedIds, setUnmaskedIds] = useState<Record<string, boolean>>({});

  // Enterprise Data state
  const [inspectedIds, setInspectedIds] = useState<string[]>(['v1', 'v2', 'v3', 'v4']);
  const [dealers, setDealers] = useState<DealerRecord[]>(MockEnterpriseData.dealers);
  const [privateSellers, setPrivateSellers] = useState<PrivateSellerRecord[]>(MockEnterpriseData.privateSellers);
  const [escrowTxns, setEscrowTxns] = useState<EscrowTxnRecord[]>(MockEnterpriseData.escrowTxns);
  const [disputes, setDisputes] = useState<DisputeRecord[]>(MockEnterpriseData.disputes);
  const [fraudFlags, setFraudFlags] = useState<FraudFlagRecord[]>(MockEnterpriseData.fraudFlags);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(MockEnterpriseData.auditLogs);

  // Helper to record audit log
  const recordAuditLog = (action: string, module: string, targetId: string) => {
    const newLog: AuditLogRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      adminUser: adminRole,
      role: adminRole,
      action: action,
      module: module,
      targetId: targetId,
      ipAddress: '197.237.114.42',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      integrityHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Unmask sensitive PII with Audit Logging
  const toggleUnmaskPII = (id: string, entityType: string) => {
    const nextState = !unmaskedIds[id];
    setUnmaskedIds(prev => ({ ...prev, [id]: nextState }));
    if (nextState) {
      recordAuditLog(`UNMASK_SENSITIVE_PII (${entityType})`, 'PII Security Compliance', id);
    }
  };

  // Listing Certification toggle
  const toggleVerify = (id: string, title: string) => {
    const isPassed = inspectedIds.includes(id);
    if (isPassed) {
      setInspectedIds(prev => prev.filter(i => i !== id));
      recordAuditLog('REVOKE_150PT_CERTIFICATION', 'Marketplace Moderation', title);
    } else {
      setInspectedIds(prev => [...prev, id]);
      recordAuditLog('APPROVE_150PT_CERTIFICATION', 'Marketplace Moderation', title);
    }
  };

  // Export CSV mock handler
  const handleExportCSV = (filename: string) => {
    recordAuditLog('EXPORT_ENCRYPTED_CSV', activeModule, filename);
    alert(`Exporting encrypted enterprise ledger report: ${filename}.csv\nAudit log registered.`);
  };

  // Modules catalog definition
  const modulesList: { id: EnterpriseModule; label: string; icon: React.ReactNode; category: string }[] = [
    { id: 'executive', label: 'Executive Dashboard', icon: <LayoutDashboard className="w-4 h-4 text-amber-500" />, category: 'Core Operations' },
    { id: 'marketplace', label: 'Marketplace Oversight', icon: <Car className="w-4 h-4 text-blue-500" />, category: 'Core Operations' },
    { id: 'dealers', label: 'Dealer Network', icon: <Building2 className="w-4 h-4 text-emerald-500" />, category: 'Core Operations' },
    { id: 'sellers', label: 'Private Sellers', icon: <Users className="w-4 h-4 text-indigo-500" />, category: 'Core Operations' },
    { id: 'mechanics', label: 'Field Engineers', icon: <Wrench className="w-4 h-4 text-purple-500" />, category: 'Core Operations' },
    { id: 'banks', label: 'Finance Partners', icon: <Landmark className="w-4 h-4 text-[#1E3063]" />, category: 'Core Operations' },
    
    { id: 'escrow', label: 'CBK Escrow Vaults', icon: <Shield className="w-4 h-4 text-amber-600" />, category: 'Transactions & Compliance' },
    { id: 'auctions', label: 'Auction House', icon: <Gavel className="w-4 h-4 text-rose-500" />, category: 'Transactions & Compliance' },
    { id: 'inspections', label: '150-Point Audits', icon: <ClipboardCheck className="w-4 h-4 text-emerald-600" />, category: 'Transactions & Compliance' },
    { id: 'disputes', label: 'Dispute Arbitration', icon: <AlertOctagon className="w-4 h-4 text-red-500" />, category: 'Transactions & Compliance' },
    { id: 'fraud', label: 'Fraud Detection AI', icon: <ShieldAlert className="w-4 h-4 text-rose-600" />, category: 'Transactions & Compliance' },
    
    { id: 'support', label: 'Support Desk SLAs', icon: <Ticket className="w-4 h-4 text-teal-500" />, category: 'Platform Systems' },
    { id: 'moderation', label: 'Content Moderation', icon: <FileText className="w-4 h-4 text-amber-500" />, category: 'Platform Systems' },
    { id: 'reports', label: 'GMV & Analytics', icon: <PieChart className="w-4 h-4 text-blue-600" />, category: 'Platform Systems' },
    { id: 'billing', label: 'Billing & Ledger', icon: <CreditCard className="w-4 h-4 text-[#1E3063]" />, category: 'Platform Systems' },
    { id: 'commission', label: 'Commission Rules', icon: <Percent className="w-4 h-4 text-emerald-500" />, category: 'Platform Systems' },
    
    { id: 'settings', label: 'Platform Controls', icon: <Settings className="w-4 h-4 text-slate-600" />, category: 'Security & Governance' },
    { id: 'audit', label: 'Immutable Audit Trail', icon: <History className="w-4 h-4 text-amber-600" />, category: 'Security & Governance' },
    { id: 'rbac', label: 'Role Permissions Matrix', icon: <Key className="w-4 h-4 text-[#1E3063]" />, category: 'Security & Governance' },
    { id: 'api', label: 'API Gateway Health', icon: <Server className="w-4 h-4 text-cyan-500" />, category: 'Security & Governance' }
  ];

  return (
    <div className="space-y-6">
      {/* Super Admin Command Console Header */}
      <PageHeader
        variant="navy"
        badgeIcon={<Lock className="w-4 h-4 text-amber-400" />}
        badgeText="KAYAD Enterprise Command Center"
        title="Marketplace Operations, Security & Escrow Control Center"
        description="Unified enterprise console to oversee 20 platform operational modules, CBK trustee bank vaults, NTSA TIMS registry APIs, field mechanics, and audit trails."
        rightElement={
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Active Role</span>
              <Select
                value={adminRole}
                onChange={(e) => {
                  setAdminRole(e.target.value);
                  recordAuditLog(`ROLE_SWITCH (${e.target.value})`, 'RBAC Governance', 'AdminSession');
                }}
                options={[
                  { value: 'Super Admin (CPO)', label: 'Super Admin (CPO)' },
                  { value: 'Compliance Auditor', label: 'Compliance Auditor' },
                  { value: 'Escrow Custodian', label: 'Escrow Custodian' },
                  { value: 'Support Lead', label: 'Support Lead' }
                ]}
                className="bg-white/10 text-white border-white/20 text-xs py-1"
              />
            </div>
            <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
              <ShieldCheck className="w-4 h-4 text-[#17244B]" />
              Enterprise Active
            </Badge>
          </div>
        }
      />

      {/* ==========================================
          MODULE SELECTOR NAVIGATION BAR (20 MODULES)
          ========================================== */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1E3063] flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-500" /> Enterprise Operations Modules (20 Core Engines)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Select a system module to monitor real-time metrics, perform bulk operations, or review immutable audit records.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCSV(`${activeModule}_report_${Date.now()}`)}
              className="text-xs font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Export Module Report
            </Button>
          </div>
        </div>

        {/* Categories Tabs Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {modulesList.map((m) => {
            const isActive = activeModule === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#1E3063] text-white shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ==========================================
          MODULE 1: EXECUTIVE DASHBOARD
          ========================================== */}
      {activeModule === 'executive' && (
        <div className="space-y-6">
          {/* Executive KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatWidget
              label="Today's Listings"
              value="48 Units"
              trend="+12% vs Yesterday"
              trendType="positive"
              icon={<Car className="w-4 h-4 text-blue-500" />}
            />
            <StatWidget
              label="Vehicles Sold"
              value="142 Total"
              trend="Ksh 418M Volume"
              trendType="positive"
              icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
            />
            <StatWidget
              label="Active Escrow Vault"
              value="Ksh 84.5M"
              trend="3 Active Deals"
              trendType="neutral"
              icon={<Lock className="w-4 h-4 text-amber-500" />}
            />
            <StatWidget
              label="Live Auctions"
              value="24 Active"
              trend="94.2% Reserve Met"
              trendType="positive"
              icon={<Gavel className="w-4 h-4 text-purple-500" />}
            />
            <StatWidget
              label="Inspection Bookings"
              value="89 Audits"
              trend="342 Technicians"
              trendType="positive"
              icon={<ClipboardCheck className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Finance Applications"
              value="34 Pre-Approved"
              trend="NCBA, Stanbic, Equity"
              trendType="positive"
              icon={<Landmark className="w-4 h-4 text-[#1E3063]" />}
            />
            <StatWidget
              label="Active Disputes"
              value="2 Pending"
              trend="Arbitration Desk"
              trendType="warning"
              icon={<AlertOctagon className="w-4 h-4 text-rose-500" />}
            />
            <StatWidget
              label="Commission Revenue"
              value="Ksh 14.8M"
              trend="1.5% Fee Standard"
              trendType="positive"
              icon={<Percent className="w-4 h-4 text-emerald-500" />}
            />
            <StatWidget
              label="Fraud Flags Quarantined"
              value="2 Threats"
              trend="TIMS Cloned VIN Block"
              trendType="neutral"
              icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
            />
            <StatWidget
              label="Platform Uptime"
              value="99.94%"
              trend="All APIs Operational"
              trendType="positive"
              icon={<Server className="w-4 h-4 text-cyan-500" />}
            />
          </div>

          {/* Critical Operational Action Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Vault Monitor */}
            <Card className="p-5 space-y-4">
              <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" /> CBK Escrow Vault Operations
                </span>
                <Badge variant="accent" size="sm">Real-time NCBA & Stanbic Sync</Badge>
              </CardTitle>
              <div className="space-y-3 text-xs">
                {escrowTxns.map((tx) => (
                  <div key={tx.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-extrabold text-[#1E3063]">{tx.vehicleTitle}</p>
                      <p className="text-[11px] text-slate-500">{tx.buyerName} ➔ {tx.sellerName} • {tx.bankVault}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-700 text-xs">Ksh {tx.amount.toLocaleString()}</p>
                      <Badge variant={tx.status === 'Completed' ? 'success' : 'warning'} size="sm">
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Anti-Fraud Quarantines */}
            <Card className="p-5 space-y-4">
              <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Active Security & Fraud Alerts
                </span>
                <Badge variant="warning" size="sm">Gemini AI Audit Active</Badge>
              </CardTitle>
              <div className="space-y-3 text-xs">
                {fraudFlags.map((flag) => (
                  <div key={flag.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-rose-800">{flag.entityName}</span>
                        <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-1.5 rounded">Risk {flag.riskScore}/100</span>
                      </div>
                      <p className="text-[11px] text-rose-700 font-semibold">{flag.triggerReason} • {flag.timestamp}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        recordAuditLog('QUARANTINE_OVERRIDE_REVIEW', 'Fraud Detection', flag.id);
                        alert(`Opened Security Case #${flag.id} for investigation.`);
                      }}
                      className="border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-bold shrink-0"
                    >
                      Investigate
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 2: MARKETPLACE OVERSIGHT
          ========================================== */}
      {activeModule === 'marketplace' && (
        <Card className="overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-500" /> Inventory Certification & Moderation Queue
            </h3>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search listing title, seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle & Details</TableHead>
                <TableHead>Seller Account</TableHead>
                <TableHead>Location & County</TableHead>
                <TableHead>150-Point Audit</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles
                .filter(v => searchQuery === '' || v.title.toLowerCase().includes(searchQuery.toLowerCase()) || v.sellerName.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((v) => {
                  const isPassed = inspectedIds.includes(v.id);
                  return (
                    <TableRow key={v.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div 
                          onClick={() => onQuickViewVehicle?.(v)}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <LazyImage src={v.image} alt={v.title} wrapperClassName="w-12 h-9 rounded border border-slate-200 shrink-0" className="w-full h-full object-cover" />
                          <div>
                            <p className="font-extrabold text-[#1E3063] text-xs group-hover:text-amber-600 transition-colors">{v.title}</p>
                            <p className="text-[11px] text-slate-500 font-bold">Ksh {v.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">{v.sellerName} ({v.sellerType})</TableCell>
                      <TableCell className="text-xs text-slate-600">{v.location}, {v.county}</TableCell>
                      <TableCell>
                        <Badge variant={isPassed ? 'success' : 'warning'} size="sm">
                          {isPassed ? 'Certified Passed' : 'Pending Audit'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={isPassed ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleVerify(v.id, v.title)}
                        >
                          {isPassed ? 'Revoke' : 'Approve & Certify'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 3: DEALERS NETWORK
          ========================================== */}
      {activeModule === 'dealers' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" /> Registered Motor Dealer Network (Kenya)
            </h3>
            <Badge variant="accent" size="sm">NTSA License Verified</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealer Yard Name</TableHead>
                <TableHead>County / Location</TableHead>
                <TableHead>Active Inventory</TableHead>
                <TableHead>Sales Volume (Ksh)</TableHead>
                <TableHead>Trust Score</TableHead>
                <TableHead>Contact (PII Protected)</TableHead>
                <TableHead>KYC Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealers.map((d) => {
                const isUnmasked = !!unmaskedIds[d.id];
                return (
                  <TableRow key={d.id} className="hover:bg-slate-50">
                    <TableCell className="font-bold text-[#1E3063] text-xs">{d.name} <span className="text-[10px] text-slate-400 block">{d.licenseNo}</span></TableCell>
                    <TableCell className="text-xs text-slate-600">{d.location}, {d.county}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">{d.inventoryCount} units</TableCell>
                    <TableCell className="text-xs font-extrabold text-emerald-700">Ksh {d.totalSalesVolume.toLocaleString()}</TableCell>
                    <TableCell className="text-xs font-black text-amber-600">{d.trustScore}%</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>{isUnmasked ? d.unmaskedPhone : d.maskedPhone}</span>
                        <button
                          onClick={() => toggleUnmaskPII(d.id, 'Dealer Contact')}
                          className="text-[10px] font-bold text-[#1E3063] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          {isUnmasked ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-amber-500" />}
                          {isUnmasked ? 'Mask' : 'Audit Log Unmask'}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">{d.kycStatus}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 4: PRIVATE SELLERS
          ========================================== */}
      {activeModule === 'sellers' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" /> Private Seller Registry & National ID Audit
            </h3>
            <Badge variant="accent" size="sm">TIMS Registry Sync</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller Name</TableHead>
                <TableHead>National ID (Encrypted)</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Active Listings</TableHead>
                <TableHead>Sold History</TableHead>
                <TableHead>Escrow Rating</TableHead>
                <TableHead>TIMS Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {privateSellers.map((s) => {
                const isUnmasked = !!unmaskedIds[s.id];
                return (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="font-bold text-[#1E3063] text-xs">{s.name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{isUnmasked ? s.nationalIdUnmasked : s.nationalIdMasked}</span>
                        <button
                          onClick={() => toggleUnmaskPII(s.id, 'National ID')}
                          className="text-[10px] font-bold text-[#1E3063] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          {isUnmasked ? <Lock className="w-3 h-3 text-slate-400" /> : <Unlock className="w-3 h-3 text-amber-500" />}
                          {isUnmasked ? 'Mask' : 'Unmask'}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{s.county}</TableCell>
                    <TableCell className="text-xs font-bold text-slate-800">{s.activeListings}</TableCell>
                    <TableCell className="text-xs font-bold text-emerald-700">{s.soldCount} cars</TableCell>
                    <TableCell className="text-xs font-black text-amber-600">★ {s.escrowRating}</TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">{s.timsStatus}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 5: FIELD MECHANICS
          ========================================== */}
      {activeModule === 'mechanics' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-purple-500" /> AutoCheck Certified Master Engineers
            </h3>
            <Badge variant="verified" size="sm">Field Dispatch Active</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Engineer Name</TableHead>
                <TableHead>Inspection Yard / Station</TableHead>
                <TableHead>County</TableHead>
                <TableHead>Certified Jobs</TableHead>
                <TableHead>Audit Pass Ratio</TableHead>
                <TableHead>Certification Level</TableHead>
                <TableHead>Duty Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.mechanics.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{m.name}</TableCell>
                  <TableCell className="text-xs text-slate-600">{m.station}</TableCell>
                  <TableCell className="text-xs text-slate-600">{m.county}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{m.certifiedJobs} Audits</TableCell>
                  <TableCell className="text-xs font-bold text-emerald-600">{m.passRatio}%</TableCell>
                  <TableCell className="text-xs font-extrabold text-[#1E3063]">{m.certificationLevel}</TableCell>
                  <TableCell>
                    <Badge variant={m.status === 'On Duty' ? 'accent' : 'success'} size="sm">{m.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 6: FINANCE PARTNERS
          ========================================== */}
      {activeModule === 'banks' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#1E3063]" /> Bank Asset Finance Partners
            </h3>
            <Badge variant="accent" size="sm">Direct Underwriting API</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Partner Name</TableHead>
                <TableHead>Bank Institution Code</TableHead>
                <TableHead>Active Portfolio (Ksh)</TableHead>
                <TableHead>Underwriting SLA</TableHead>
                <TableHead>Approval Rate</TableHead>
                <TableHead>Total Disbursed (Ksh)</TableHead>
                <TableHead>API Gateway Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.bankPartners.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{b.name}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{b.code}</TableCell>
                  <TableCell className="text-xs font-extrabold text-slate-800">Ksh {b.activePortfolio.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-bold text-amber-600">{b.underwritingSlaHours} Hours</TableCell>
                  <TableCell className="text-xs font-bold text-emerald-600">{b.approvalRate}%</TableCell>
                  <TableCell className="text-xs font-black text-emerald-700">Ksh {b.totalDisbursed.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">{b.apiStatus}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 7: ESCROW MONITORING
          ========================================== */}
      {activeModule === 'escrow' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> CBK Regulated Trustee Vault Monitor
            </h3>
            <Badge variant="accent" size="sm">NCBA & Stanbic Trustee</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Vault Ref</TableHead>
                <TableHead>Vehicle Unit</TableHead>
                <TableHead>Buyer Name</TableHead>
                <TableHead>Seller Account</TableHead>
                <TableHead>Locked Amount (Ksh)</TableHead>
                <TableHead>Trustee Bank</TableHead>
                <TableHead>Vault Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {escrowTxns.map((e) => (
                <TableRow key={e.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{e.id} <span className="text-[10px] text-slate-400 block">{e.vaultId}</span></TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">{e.vehicleTitle}</TableCell>
                  <TableCell className="text-xs text-slate-700">{e.buyerName}</TableCell>
                  <TableCell className="text-xs text-slate-700">{e.sellerName}</TableCell>
                  <TableCell className="text-xs font-black text-emerald-700">Ksh {e.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-bold text-[#1E3063]">{e.bankVault}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === 'Completed' ? 'success' : 'warning'} size="sm">{e.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 8: AUCTION MANAGEMENT
          ========================================== */}
      {activeModule === 'auctions' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Gavel className="w-4 h-4 text-rose-500" /> KAYAD Live Auction House Oversight
            </h3>
            <Badge variant="accent" size="sm">Real-time Bidding Floor</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Auction Vehicle</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Current High Bid</TableHead>
                <TableHead>Reserve Price</TableHead>
                <TableHead>Bids Placed</TableHead>
                <TableHead>Time Remaining</TableHead>
                <TableHead>Auction Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.auctions.map((a) => (
                <TableRow key={a.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{a.title}</TableCell>
                  <TableCell className="text-xs text-slate-600">{a.sellerName}</TableCell>
                  <TableCell className="text-xs font-extrabold text-emerald-700">Ksh {a.currentBid.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-500">Ksh {a.reservePrice.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{a.bidsCount} Bids</TableCell>
                  <TableCell className="text-xs font-bold text-amber-600">{a.timeLeft}</TableCell>
                  <TableCell>
                    <Badge variant="accent" size="sm">{a.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 9: INSPECTION OVERSIGHT
          ========================================== */}
      {activeModule === 'inspections' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" /> 10-Point Technical Audit Reports
            </h3>
            <Badge variant="verified" size="sm">AutoCheck Inspector Sync</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Vehicle Unit</TableHead>
                <TableHead>Certified Inspector</TableHead>
                <TableHead>Inspection Score</TableHead>
                <TableHead>Chassis Alignment</TableHead>
                <TableHead>OBD Diagnostics</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.inspections.map((ins) => (
                <TableRow key={ins.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{ins.id}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{ins.vehicleTitle}</TableCell>
                  <TableCell className="text-xs text-slate-600">{ins.inspectorName} ({ins.station})</TableCell>
                  <TableCell className="text-xs font-black text-emerald-600">{ins.score}/100</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">{ins.chassisStatus}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-700">{ins.obdStatus}</TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">{ins.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 10: DISPUTES
          ========================================== */}
      {activeModule === 'disputes' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-500" /> Dispute Arbitration Desk
            </h3>
            <Badge variant="warning" size="sm">Legal Escrow Freeze Active</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Ref</TableHead>
                <TableHead>Vehicle Unit</TableHead>
                <TableHead>Complainant vs Respondent</TableHead>
                <TableHead>Disputed Claim Amount</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Arbitration Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputes.map((dsp) => (
                <TableRow key={dsp.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-rose-800 text-xs">{dsp.caseRef}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{dsp.vehicleTitle}</TableCell>
                  <TableCell className="text-xs text-slate-600">{dsp.complainant} vs {dsp.respondent}</TableCell>
                  <TableCell className="text-xs font-black text-rose-700">Ksh {dsp.claimAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-medium text-slate-700">{dsp.reason}</TableCell>
                  <TableCell>
                    <Badge variant="danger" size="sm">{dsp.severity}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="warning" size="sm">{dsp.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 11: FRAUD DETECTION AI
          ========================================== */}
      {activeModule === 'fraud' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Gemini AI Threat & Fraud Quarantine Engine
            </h3>
            <Badge variant="accent" size="sm">Automated Document Scanner</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Threat ID</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Entity Flagged</TableHead>
                <TableHead>Entity Type</TableHead>
                <TableHead>Trigger Reason</TableHead>
                <TableHead>Flagged Timestamp</TableHead>
                <TableHead>Security Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fraudFlags.map((ff) => (
                <TableRow key={ff.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-xs text-slate-500">{ff.id}</TableCell>
                  <TableCell className="text-xs font-black text-rose-700">{ff.riskScore}/100</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{ff.entityName}</TableCell>
                  <TableCell className="text-xs text-slate-600">{ff.entityType}</TableCell>
                  <TableCell className="text-xs font-semibold text-rose-800">{ff.triggerReason}</TableCell>
                  <TableCell className="text-xs text-slate-500">{ff.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant="danger" size="sm">{ff.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 12: SUPPORT TICKETS
          ========================================== */}
      {activeModule === 'support' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Ticket className="w-4 h-4 text-teal-500" /> Resolution Center Support Tickets
            </h3>
            <Badge variant="accent" size="sm">15-Min SLA Active</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket No</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.supportTickets.map((st) => (
                <TableRow key={st.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{st.ticketNo}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-600">{st.userEmail}</TableCell>
                  <TableCell className="text-xs font-semibold text-slate-800">{st.subject}</TableCell>
                  <TableCell className="text-xs text-slate-600">{st.category}</TableCell>
                  <TableCell>
                    <Badge variant={st.priority === 'Urgent' ? 'danger' : 'warning'} size="sm">{st.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">{st.assignedAgent}</TableCell>
                  <TableCell>
                    <Badge variant="accent" size="sm">{st.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 13: CONTENT MODERATION
          ========================================== */}
      {activeModule === 'moderation' && (
        <Card className="p-5 space-y-4">
          <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" /> Automated Vehicle Content & Image Moderation Rules
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="font-bold text-[#1E3063]">Odometer Discrepancy Filter</p>
              <p className="text-slate-600">Cross-analyzes historical mileage data against NTSA inspection records to catch rollback attempts.</p>
              <Badge variant="success" size="sm">Rule Active (100% Scan)</Badge>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="font-bold text-[#1E3063]">AI Image Watermark Scanner</p>
              <p className="text-slate-600">Detects unauthorized third-party yard watermarks and forces high-resolution uncompressed photo uploads.</p>
              <Badge variant="success" size="sm">Rule Active</Badge>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="font-bold text-[#1E3063]">Price Anomaly Alert</p>
              <p className="text-slate-600">Flags listings priced &gt;35% below estimated Kenya market value for fraud review.</p>
              <Badge variant="success" size="sm">Rule Active</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 14: REPORTS & ANALYTICS
          ========================================== */}
      {activeModule === 'reports' && (
        <Card className="p-5 space-y-4">
          <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" /> Marketplace GMV & Regional Sales Analytics
            </span>
            <Button size="sm" onClick={() => handleExportCSV('KAYAD_Full_Analytics_2026')}>
              <Download className="w-3.5 h-3.5" /> Download Full Analytics Brief
            </Button>
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1">
              <p className="text-slate-500 font-semibold uppercase">Gross Merchandise Value (GMV)</p>
              <p className="text-xl font-black text-[#1E3063]">Ksh 418,500,000</p>
              <p className="text-emerald-700 font-bold">+18.4% QoQ Growth across Kenya</p>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1">
              <p className="text-slate-500 font-semibold uppercase">CBK Escrow Clearance Rate</p>
              <p className="text-xl font-black text-emerald-800">99.2%</p>
              <p className="text-emerald-700 font-bold">Avg settlement: 14.5 mins</p>
            </div>
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-xs space-y-1">
              <p className="text-slate-500 font-semibold uppercase">Inspection Pass Ratio</p>
              <p className="text-xl font-black text-amber-800">91.8%</p>
              <p className="text-amber-800 font-bold">AutoCheck Technical Standard</p>
            </div>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 15: BILLING & LEDGER
          ========================================== */}
      {activeModule === 'billing' && (
        <Card className="p-5 space-y-4">
          <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1E3063]" /> Dealer Subscriptions & Service Fee Invoices
          </CardTitle>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E3063]">Crown Motors Kenya — Enterprise Unlimited Dealer Tier</p>
                <p className="text-slate-500">Invoice #INV-2026-0881 • Billed Monthly</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-emerald-700">Ksh 45,000 / mo</p>
                <Badge variant="success" size="sm">Paid via M-Pesa Till</Badge>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E3063]">Simons Auto Selection — Premium Dealer Tier</p>
                <p className="text-slate-500">Invoice #INV-2026-0880 • Billed Monthly</p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-emerald-700">Ksh 25,000 / mo</p>
                <Badge variant="success" size="sm">Paid via Bank EFT</Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 16: COMMISSION MANAGEMENT
          ========================================== */}
      {activeModule === 'commission' && (
        <Card className="p-5 space-y-4">
          <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-500" /> KAYAD Platform Commission Structure
          </CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="font-bold text-[#1E3063]">CBK Escrow Transaction Fee</p>
              <p className="text-2xl font-black text-emerald-700">1.5%</p>
              <p className="text-slate-500">Applied automatically upon buyer escrow deposit settlement in NCBA vault.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <p className="font-bold text-[#1E3063]">Inspection Fee Split</p>
              <p className="text-2xl font-black text-[#1E3063]">80% / 20%</p>
              <p className="text-slate-500">80% disbursed to AutoCheck master engineer, 20% platform administrative fee.</p>
            </div>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 17: PLATFORM SETTINGS
          ========================================== */}
      {activeModule === 'settings' && (
        <Card className="p-5 space-y-4">
          <CardTitle className="text-sm font-bold text-[#1E3063] flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600" /> Platform Operational Governance Switches
          </CardTitle>
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E3063]">Mandatory 150-Point Technical Inspection</p>
                <p className="text-slate-500">Enforce mandatory mechanic certification before issuing Escrow Vault badge.</p>
              </div>
              <Badge variant="success" size="sm">ENFORCED (Active)</Badge>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E3063]">NTSA TIMS Gateway Auto-Caveat Scan</p>
                <p className="text-slate-500">Perform real-time API lookups on logbooks to block active bank caveats.</p>
              </div>
              <Badge variant="success" size="sm">ACTIVE (Interval: 15m)</Badge>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1E3063]">Maintenance Mode Override</p>
                <p className="text-slate-500">Lock marketplace actions for scheduled maintenance.</p>
              </div>
              <Badge variant="neutral" size="sm">DISABLED (Normal Ops)</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* ==========================================
          MODULE 18: IMMUTABLE AUDIT LOGS
          ========================================== */}
      {activeModule === 'audit' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600" /> Immutable Administrative Audit Trail (SHA-256)
            </h3>
            <Badge variant="accent" size="sm">Cryptographically Signed</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Log ID</TableHead>
                <TableHead>Admin User</TableHead>
                <TableHead>Action Command</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>Timestamp & IP</TableHead>
                <TableHead>Integrity Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                  <TableCell className="font-bold text-[#1E3063]">{log.id}</TableCell>
                  <TableCell className="font-sans font-bold text-slate-800">{log.adminUser}</TableCell>
                  <TableCell className="font-bold text-emerald-700">{log.action}</TableCell>
                  <TableCell className="font-sans text-slate-600">{log.module}</TableCell>
                  <TableCell className="font-sans text-slate-700">{log.targetId}</TableCell>
                  <TableCell className="font-sans text-slate-500">{log.timestamp} <span className="block text-[10px] text-slate-400">IP: {log.ipAddress}</span></TableCell>
                  <TableCell className="text-[10px] text-slate-400 truncate max-w-[120px]" title={log.integrityHash}>
                    {log.integrityHash}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 19: ROLE PERMISSIONS MATRIX (RBAC)
          ========================================== */}
      {activeModule === 'rbac' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1E3063]" /> Role-Based Access Control (RBAC) Matrix
            </h3>
            <Badge variant="accent" size="sm">4 System Roles Configured</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System Role</TableHead>
                <TableHead>Escrow Release</TableHead>
                <TableHead>150-Pt Certification</TableHead>
                <TableHead>PII Unmasking</TableHead>
                <TableHead>Dispute Override</TableHead>
                <TableHead>Platform Settings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { role: 'Super Admin (CPO)', escrow: 'Full Auth', cert: 'Full Auth', pii: 'Audit Logged', dispute: 'Full Override', settings: 'Full Control' },
                { role: 'Compliance Auditor', escrow: 'Read-only', cert: 'Approve/Revoke', pii: 'Audit Logged', dispute: 'Investigate', settings: 'Read-only' },
                { role: 'Escrow Custodian', escrow: 'Authorize Vault', cert: 'Read-only', pii: 'Restricted', dispute: 'Escrow Hold', settings: 'Read-only' },
                { role: 'Support Lead', escrow: 'Read-only', cert: 'Read-only', pii: 'Masked', dispute: 'Triage', settings: 'No Access' }
              ].map((r, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50 text-xs">
                  <TableCell className="font-bold text-[#1E3063]">{r.role}</TableCell>
                  <TableCell className="font-semibold text-emerald-700">{r.escrow}</TableCell>
                  <TableCell className="font-semibold text-emerald-700">{r.cert}</TableCell>
                  <TableCell className="font-semibold text-amber-600">{r.pii}</TableCell>
                  <TableCell className="font-semibold text-rose-700">{r.dispute}</TableCell>
                  <TableCell className="font-semibold text-slate-700">{r.settings}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ==========================================
          MODULE 20: API MONITORING
          ========================================== */}
      {activeModule === 'api' && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[#1E3063] flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-500" /> Infrastructure & External API Gateway Health
            </h3>
            <Badge variant="success" size="sm">All Gateway Nodes Green</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>External Gateway Service</TableHead>
                <TableHead>API Endpoint URI</TableHead>
                <TableHead>Latency (ms)</TableHead>
                <TableHead>90-Day Uptime</TableHead>
                <TableHead>Error Rate</TableHead>
                <TableHead>Operational Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MockEnterpriseData.apiEndpoints.map((api) => (
                <TableRow key={api.id} className="hover:bg-slate-50">
                  <TableCell className="font-bold text-[#1E3063] text-xs">{api.service}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-500">{api.endpoint}</TableCell>
                  <TableCell className="text-xs font-bold text-slate-800">{api.latencyMs} ms</TableCell>
                  <TableCell className="text-xs font-bold text-emerald-600">{api.uptime90d}%</TableCell>
                  <TableCell className="text-xs font-bold text-slate-600">{api.errorRate}%</TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">{api.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Protocol Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1">
          <p className="font-extrabold text-amber-400 flex items-center gap-1.5 font-display text-sm">
            <Zap className="w-4 h-4" /> Official KAYAD Enterprise Governance Protocol V2.6
          </p>
          <p className="text-slate-300">
            All administrative overrides, PII unmasking, and escrow disbursements are cryptographically logged with immutable SHA-256 integrity hashes for regulatory audits by the Central Bank of Kenya (CBK) and NTSA.
          </p>
        </div>
        <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-extrabold shrink-0">
          CBK & NTSA Compliant
        </Badge>
      </div>
    </div>
  );
};

export default AdminView;
