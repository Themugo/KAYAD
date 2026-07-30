import React, { useState, useMemo } from 'react';
import { 
  BankFinancingApplication, 
  BankApplicationStatus, 
  BankDocumentItem, 
  BankCommunicationMessage 
} from '../types';
import { MOCK_BANK_APPLICATIONS } from '../data/mockBankApplications';
import { 
  Building2, 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  X, 
  FileText, 
  DollarSign, 
  Users, 
  Car, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  Search, 
  Filter, 
  UploadCloud, 
  Download, 
  Eye, 
  Send, 
  Check, 
  PlusCircle, 
  FileCheck, 
  Lock, 
  Printer, 
  Sparkles, 
  TrendingUp, 
  Shield, 
  CreditCard, 
  ChevronRight, 
  ArrowUpRight, 
  Phone, 
  Mail, 
  UserCheck, 
  Zap, 
  RefreshCw, 
  Sliders, 
  FileSpreadsheet, 
  Award,
  AlertCircle
} from 'lucide-react';
import { 
  StatWidget, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell, 
  Badge, 
  Button, 
  Input, 
  Modal 
} from '../components/ui';

export type BankPortalModule = 
  | 'dashboard' 
  | 'applications' 
  | 'approvals' 
  | 'documents' 
  | 'customers' 
  | 'vehicle_details' 
  | 'communication' 
  | 'analytics' 
  | 'settings';

interface BankFinancingPortalProps {
  onNavigateToBuyerFinancing?: () => void;
}

export const BankFinancingPortal: React.FC<BankFinancingPortalProps> = ({
  onNavigateToBuyerFinancing
}) => {
  // Toast Alert Notification
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Active Selected Bank Partner
  const [activeBankId, setActiveBankId] = useState<string>('all');

  // Active Module State (9 Required Modules)
  const [activeModule, setActiveModule] = useState<BankPortalModule>('dashboard');

  // Master Applications Dataset
  const [applications, setApplications] = useState<BankFinancingApplication[]>(MOCK_BANK_APPLICATIONS);

  // Status Filter for Applications Module (Pending | Under Review | Approved | Rejected | Completed | All)
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Application for Detail Modal & Action Center
  const [selectedApp, setSelectedApp] = useState<BankFinancingApplication | null>(MOCK_BANK_APPLICATIONS[0]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // Decision Modal State
  const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
  const [decisionType, setDecisionType] = useState<BankApplicationStatus>('Approved');
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [newStipulationInput, setNewStipulationInput] = useState<string>('');
  const [stipulationsList, setStipulationsList] = useState<string[]>([
    'Direct Payroll Standing Order setup with bank',
    'Vehicle GPS Tracker installation certificate'
  ]);

  // Communication Message Input
  const [newMessageText, setNewMessageText] = useState<string>('');

  // New Document Upload State
  const [newDocName, setNewDocName] = useState<string>('');
  const [newDocType, setNewDocType] = useState<BankDocumentItem['type']>('Bank Statement');

  // Bank Portal Settings State
  const [baseInterestRate, setBaseInterestRate] = useState<number>(12.5);
  const [maxLtvThreshold, setMaxLtvThreshold] = useState<number>(85);
  const [maxDtiThreshold, setMaxDtiThreshold] = useState<number>(45);
  const [autoSmsNotify, setAutoSmsNotify] = useState<boolean>(true);

  // Filtered Applications Calculation
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // Bank filter
      if (activeBankId !== 'all' && app.bankId !== activeBankId) return false;
      // Status filter
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = app.applicantName.toLowerCase().includes(q);
        const matchRef = app.appRef.toLowerCase().includes(q);
        const matchVehicle = app.vehicleTitle.toLowerCase().includes(q);
        const matchVin = app.vehicleVin.toLowerCase().includes(q);
        if (!matchName && !matchRef && !matchVehicle && !matchVin) return false;
      }
      return true;
    });
  }, [applications, activeBankId, statusFilter, searchQuery]);

  // Summary Metrics
  const totalPortfolioValue = useMemo(() => {
    return applications.reduce((sum, a) => sum + a.loanAmount, 0);
  }, [applications]);

  const approvedPortfolioValue = useMemo(() => {
    return applications
      .filter(a => a.status === 'Approved' || a.status === 'Completed')
      .reduce((sum, a) => sum + a.loanAmount, 0);
  }, [applications]);

  const pendingCount = useMemo(() => applications.filter(a => a.status === 'Pending').length, [applications]);
  const underReviewCount = useMemo(() => applications.filter(a => a.status === 'Under Review').length, [applications]);
  const approvedCount = useMemo(() => applications.filter(a => a.status === 'Approved').length, [applications]);
  const rejectedCount = useMemo(() => applications.filter(a => a.status === 'Rejected').length, [applications]);
  const completedCount = useMemo(() => applications.filter(a => a.status === 'Completed').length, [applications]);

  // Handle Quick Status Update with Buyer SMS Notification
  const handleUpdateStatus = (appId: string, newStatus: BankApplicationStatus, reasonNote?: string) => {
    const timestamp = new Date().toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' });
    
    setApplications(prev => prev.map(app => {
      if (app.id === appId) {
        const statusMsg: BankCommunicationMessage = {
          id: `MSG-${Date.now()}`,
          sender: 'Bank Loan Officer',
          senderName: 'Bank Underwriting Officer',
          message: reasonNote || `Financing application status updated to: ${newStatus.toUpperCase()}. Buyer notified via KAYAD SMS.`,
          timestamp,
          type: 'Status Update'
        };

        return {
          ...app,
          status: newStatus,
          lastUpdated: timestamp,
          rejectionReason: newStatus === 'Rejected' ? (reasonNote || app.rejectionReason) : app.rejectionReason,
          messages: [...app.messages, statusMsg]
        };
      }
      return app;
    }));

    if (selectedApp && selectedApp.id === appId) {
      setSelectedApp(prev => prev ? { ...prev, status: newStatus, lastUpdated: timestamp } : null);
    }

    showToast(`Application #${appId} updated to ${newStatus}. Buyer status notification dispatched!`);
  };

  // Submit Decision from Modal
  const handleSubmitDecision = () => {
    if (!selectedApp) return;

    const timestamp = new Date().toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' });
    const newMsg: BankCommunicationMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'Bank Loan Officer',
      senderName: selectedApp.assignedOfficer,
      message: `Underwriting Decision: ${decisionType}. Notes: ${decisionNotes || 'Application evaluated against CBK risk guidelines.'}`,
      timestamp,
      type: decisionType === 'Approved' ? 'Approval Notice' : 'Status Update'
    };

    setApplications(prev => prev.map(a => {
      if (a.id === selectedApp.id) {
        return {
          ...a,
          status: decisionType,
          stipulations: decisionType === 'Approved' ? stipulationsList : a.stipulations,
          rejectionReason: decisionType === 'Rejected' ? decisionNotes : a.rejectionReason,
          lastUpdated: timestamp,
          messages: [...a.messages, newMsg]
        };
      }
      return a;
    }));

    setShowDecisionModal(false);
    showToast(`Decision recorded: ${decisionType} for ${selectedApp.applicantName}`);
  };

  // Send Direct Message to Applicant
  const handleSendMessage = () => {
    if (!selectedApp || !newMessageText.trim()) return;
    const timestamp = new Date().toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' });
    const msg: BankCommunicationMessage = {
      id: `MSG-${Date.now()}`,
      sender: 'Bank Loan Officer',
      senderName: selectedApp.assignedOfficer || 'Loan Officer',
      message: newMessageText,
      timestamp,
      type: 'General Inquiry'
    };

    setApplications(prev => prev.map(a => {
      if (a.id === selectedApp.id) {
        return { ...a, messages: [...a.messages, msg] };
      }
      return a;
    }));

    if (selectedApp) {
      setSelectedApp({ ...selectedApp, messages: [...selectedApp.messages, msg] });
    }

    setNewMessageText('');
    showToast('Status update SMS & email sent to buyer');
  };

  // Add Document to Application
  const handleAddDocument = () => {
    if (!selectedApp || !newDocName) return;
    const newDoc: BankDocumentItem = {
      id: `DOC-${Date.now()}`,
      name: newDocName,
      type: newDocType,
      status: 'Verified',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    setApplications(prev => prev.map(a => {
      if (a.id === selectedApp.id) {
        return { ...a, documents: [...a.documents, newDoc] };
      }
      return a;
    }));

    if (selectedApp) {
      setSelectedApp({ ...selectedApp, documents: [...selectedApp.documents, newDoc] });
    }

    setNewDocName('');
    showToast('Document verified & uploaded to borrower file vault');
  };

  // Navigation Module Definitions (9 Modules)
  const modulesList: { id: BankPortalModule; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: '1. Executive Dashboard', icon: <BarChart3 className="w-4 h-4 text-[#1E3063]" /> },
    { id: 'applications', label: `2. Applications Intake (${filteredApplications.length})`, icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
    { id: 'approvals', label: `3. Risk Approvals (${underReviewCount + pendingCount})`, icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
    { id: 'documents', label: '4. Document Vault & KYC', icon: <FileCheck className="w-4 h-4 text-amber-500" /> },
    { id: 'customers', label: '5. Applicant CRM', icon: <Users className="w-4 h-4 text-purple-600" /> },
    { id: 'vehicle_details', label: '6. Collateral Vehicle Specs', icon: <Car className="w-4 h-4 text-rose-500" /> },
    { id: 'communication', label: '7. Buyer Status Alerts', icon: <MessageSquare className="w-4 h-4 text-indigo-600" /> },
    { id: 'analytics', label: '8. Portfolio Analytics', icon: <TrendingUp className="w-4 h-4 text-emerald-600" /> },
    { id: 'settings', label: '9. Financier Policy Setup', icon: <Settings className="w-4 h-4 text-slate-700" /> }
  ];

  return (
    <div className="space-y-6 relative pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 bg-[#1E3063] text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-extrabold">{toast}</span>
        </div>
      )}

      {/* ==========================================
          HEADER & FINANCIER PORTAL BANNER
          ========================================== */}
      <div className="bg-gradient-to-r from-[#101935] via-[#1E3063] to-[#101935] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-400/20 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="accent" size="md" className="bg-amber-400 text-[#17244B] font-black">
                <Landmark className="w-3.5 h-3.5 text-[#17244B]" /> Commercial Bank & Financier Portal
              </Badge>
              <Badge variant="verified" size="md" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> CBK Banking Guideline Compliant
              </Badge>
              <span className="text-xs text-amber-300 font-bold bg-white/10 px-3 py-1 rounded-full">
                KAYAD Auto Loan Underwriting Suite
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-display text-white">
              Bank Financing Application Management Portal
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Managing <strong className="text-amber-400">Ksh {(totalPortfolioValue / 1000000).toFixed(1)}M</strong> in auto loan application pipeline across Kenya's tier-1 banking partners (NCBA, Equity, KCB, Stanbic, Absa).
            </p>
          </div>

          {/* Bank Partner Selector Pill */}
          <div className="flex items-center gap-2 flex-wrap bg-white/10 p-2 rounded-2xl border border-white/15">
            <span className="text-[11px] font-bold text-slate-300 px-2">Select Lender View:</span>
            {[
              { id: 'all', label: 'All Lenders' },
              { id: 'ncba', label: 'NCBA Bank' },
              { id: 'equity', label: 'Equity Bank' },
              { id: 'kcb', label: 'KCB Bank' },
              { id: 'stanbic', label: 'Stanbic Bank' }
            ].map(bank => (
              <button
                key={bank.id}
                onClick={() => setActiveBankId(bank.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeBankId === bank.id
                    ? 'bg-amber-400 text-[#101935] shadow-sm font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {bank.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==========================================
          9-MODULE NAVIGATION TABS
          ========================================== */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-2 px-2 rounded-2xl shadow-xs overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {modulesList.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeModule === m.id
                  ? 'bg-[#1E3063] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ==========================================
          MODULE 1: DASHBOARD
          ========================================== */}
      {activeModule === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Portfolio Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatWidget
              label="Total Financing Pipeline"
              value={`Ksh ${(totalPortfolioValue / 1000000).toFixed(1)}M`}
              trend={`${applications.length} Active Files`}
              trendType="positive"
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Approved Portfolio"
              value={`Ksh ${(approvedPortfolioValue / 1000000).toFixed(1)}M`}
              trend={`${approvedCount + completedCount} Loans Sanctioned`}
              trendType="positive"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            />
            <StatWidget
              label="Pending Intake"
              value={`${pendingCount}`}
              trend="Awaiting Initial Scoring"
              trendType="neutral"
              icon={<Clock className="w-4 h-4 text-amber-500" />}
            />
            <StatWidget
              label="Under Review"
              value={`${underReviewCount}`}
              trend="Risk Underwriting active"
              trendType="positive"
              icon={<FileCheck className="w-4 h-4 text-blue-600" />}
            />
            <StatWidget
              label="Rejection Rate"
              value={`${Math.round((rejectedCount / (applications.length || 1)) * 100)}%`}
              trend={`${rejectedCount} Files Declined`}
              trendType="negative"
              icon={<AlertCircle className="w-4 h-4 text-rose-500" />}
            />
            <StatWidget
              label="Avg Turnaround Time"
              value="18.5 Hrs"
              trend="CBK Speed Standard"
              trendType="positive"
              icon={<Zap className="w-4 h-4 text-amber-500" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Operational Console (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Quick Actions Card */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Bank Officer Quick Actions
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    onClick={() => {
                      setStatusFilter('Under Review');
                      setActiveModule('applications');
                    }}
                    className="p-3 bg-blue-50 hover:bg-blue-100 text-[#17244B] font-extrabold rounded-xl border border-blue-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <span>Review Pending Queue ({underReviewCount + pendingCount})</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('approvals')}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-[#17244B] font-extrabold rounded-xl border border-emerald-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Risk Approvals Engine</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('documents')}
                    className="p-3 bg-amber-50 hover:bg-amber-100 text-[#17244B] font-extrabold rounded-xl border border-amber-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <UploadCloud className="w-5 h-5 text-amber-600" />
                    <span>KYC Document Vault</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('communication')}
                    className="p-3 bg-purple-50 hover:bg-purple-100 text-[#17244B] font-extrabold rounded-xl border border-purple-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                    <span>Buyer SMS Status Dispatch</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('analytics')}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-[#17244B] font-extrabold rounded-xl border border-indigo-200 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Portfolio Risk Insights</span>
                  </button>

                  <button
                    onClick={() => setActiveModule('settings')}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-[#17244B] font-extrabold rounded-xl border border-slate-300 flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer"
                  >
                    <Settings className="w-5 h-5 text-slate-700" />
                    <span>Financier Policy Config</span>
                  </button>
                </div>
              </Card>

              {/* Priority Underwriting Queue */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" /> Priority Applications Requiring Action
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setActiveModule('applications')}>
                    View All ({filteredApplications.length})
                  </Button>
                </div>

                <div className="space-y-3">
                  {filteredApplications.slice(0, 4).map((app) => (
                    <div key={app.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#1E3063]">{app.applicantName}</span>
                          <Badge variant="accent" size="sm">{app.bankName.split(' ')[0]}</Badge>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">{app.appRef}</span>
                        </div>
                        <p className="text-slate-700 font-semibold">{app.vehicleTitle} • <strong className="text-emerald-700">Ksh {app.loanAmount.toLocaleString()}</strong></p>
                        <p className="text-slate-500 font-medium text-[11px] flex items-center gap-2">
                          <span>Income: Ksh {app.monthlyIncome.toLocaleString()}/mo</span>
                          <span>• DTI: {app.dtiRatio}%</span>
                          <span>• CRB: {app.crbScoreNumber}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-[#17244B]" /> Open File
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Side Risk & Bank Breakdown (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Partner Lender Breakdown */}
              <Card className="p-5 bg-white border-slate-200 space-y-4">
                <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Landmark className="w-4 h-4 text-amber-500" /> Partner Lender Share & Volume
                </h3>

                <div className="space-y-3 text-xs">
                  {[
                    { name: 'NCBA Drive Asset Finance', count: 2, share: '40%', rate: '12.5% p.a.' },
                    { name: 'Equity Bank Vehicle Finance', count: 1, share: '20%', rate: '12.8% p.a.' },
                    { name: 'KCB Auto Loan Express', count: 1, share: '20%', rate: '13.0% p.a.' },
                    { name: 'Stanbic Vehicle Solutions', count: 1, share: '20%', rate: '13.5% p.a.' }
                  ].map((bank, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-[#1E3063]">{bank.name}</p>
                        <p className="text-[11px] text-slate-500">Base Rate: {bank.rate}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-amber-600">{bank.count} Files</span>
                        <p className="text-[10px] text-slate-400 font-bold">{bank.share} share</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* CRB Score Distribution */}
              <Card className="p-5 bg-gradient-to-br from-white via-emerald-50/20 to-amber-50/20 border-emerald-300 space-y-3">
                <h3 className="font-black text-[#1E3063] text-sm font-display flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> CRB Credit Scoring Health
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically integrated with TransUnion & Metropol CRB APIs for real-time risk assessment.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-emerald-100/60 rounded-lg text-emerald-900 font-bold">
                    <span>Green Tier (Score 750+)</span>
                    <span>3 Applications (60%)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-100/60 rounded-lg text-amber-900 font-bold">
                    <span>Amber Tier (Score 650-749)</span>
                    <span>1 Application (20%)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-rose-100/60 rounded-lg text-rose-900 font-bold">
                    <span>Red Tier (Score &lt; 650)</span>
                    <span>1 Application (20%)</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 2: APPLICATIONS INTAKE MANAGEMENT
          ========================================== */}
      {activeModule === 'applications' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display">
                  Financing Applications Intake Registry ({filteredApplications.length})
                </h3>
                <p className="text-xs text-slate-500">Filter and audit auto loan files across explicit underwriting statuses.</p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <Input
                  placeholder="Search buyer name, ref, VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="w-4 h-4" />}
                  className="w-full md:w-64"
                />
              </div>
            </div>

            {/* Application Status Filter Tabs (5 Required Statuses + All) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
              {['All', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-[#1E3063] text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                  <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-slate-700">
                    {st === 'All' ? applications.length : applications.filter(a => a.status === st).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Applications Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Ref & Date</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Vehicle Collateral</TableHead>
                  <TableHead>Loan Amount & LTV</TableHead>
                  <TableHead>CRB & Risk Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-bold text-[#1E3063]">{app.appRef}</p>
                      <p className="text-[10px] text-slate-400">{app.submissionDate}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-[#1E3063] text-xs">{app.applicantName}</p>
                      <p className="text-[11px] text-slate-500">{app.employerName.split('(')[0]}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-800 text-xs">{app.vehicleTitle}</p>
                      <p className="text-[10px] text-slate-400 font-mono">VIN: {app.vehicleVin}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-black text-emerald-700 text-xs">Ksh {app.loanAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">LTV: {app.ltvRatio}% • Deposit: Ksh {app.depositAmount.toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.crbScoreNumber >= 750 ? 'success' : app.crbScoreNumber >= 650 ? 'warning' : 'outline'} size="sm">
                        {app.crbScoreNumber} Score
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          app.status === 'Approved' || app.status === 'Completed'
                            ? 'success'
                            : app.status === 'Rejected'
                            ? 'outline'
                            : 'escrow'
                        }
                        size="sm"
                      >
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setShowDetailModal(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 text-[#17244B]" /> Audit File
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 3: APPROVALS & UNDERWRITING ENGINE
          ========================================== */}
      {activeModule === 'approvals' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Risk Underwriting & Approval Decision Center
                </h3>
                <p className="text-xs text-slate-500">Sanction auto loans, issue conditional approvals, or decline non-compliant applications.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.filter(a => a.status === 'Pending' || a.status === 'Under Review').map((app) => (
                <Card key={app.id} className="p-5 space-y-4 bg-white border-slate-200 hover:border-amber-400 transition-all shadow-card">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="accent" size="sm">{app.bankName}</Badge>
                      <h4 className="font-black text-[#1E3063] text-sm mt-1">{app.applicantName}</h4>
                      <p className="text-xs text-slate-500">{app.employerName}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-700 font-display">Ksh {app.loanAmount.toLocaleString()}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{app.tenureMonths} Months @ {app.interestRate}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">CRB Score</span>
                      <strong className="text-slate-800">{app.crbScoreNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">DTI Ratio</span>
                      <strong className={app.dtiRatio > 45 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
                        {app.dtiRatio}%
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Condition Score</span>
                      <strong className="text-emerald-700">{app.vehicleConditionScore}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateStatus(app.id, 'Rejected', 'DTI exceeds credit ceiling')}
                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      Decline File
                    </Button>

                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setDecisionType('Approved');
                        setShowDecisionModal(true);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Check className="w-4 h-4" /> Issue Sanction Approval
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 4: DOCUMENTS VAULT & KYC
          ========================================== */}
      {activeModule === 'documents' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-amber-500" /> KYC Document Vault & Verification Hub
                </h3>
                <p className="text-xs text-slate-500">Inspect certified National IDs, bank statements, KRA PIN certificates, and inspection reports.</p>
              </div>

              {selectedApp && (
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  Active File: <strong className="text-[#1E3063]">{selectedApp.applicantName}</strong> ({selectedApp.appRef})
                </div>
              )}
            </div>

            {selectedApp && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedApp.documents.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span className="font-extrabold text-[#1E3063]">{doc.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Type: {doc.type} • Uploaded: {doc.uploadedAt}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={doc.status === 'Verified' ? 'success' : 'warning'} size="sm">
                          {doc.status}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => showToast(`Downloaded verified ${doc.name}`)}>
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Add Verification Document */}
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3 text-xs">
                  <h4 className="font-black text-[#1E3063]">Upload / Verify Supplemental Document</h4>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <Input
                      placeholder="Document description (e.g., KeNHA Certified Payslip)"
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      className="w-full sm:w-80"
                    />
                    <Button variant="accent" size="md" onClick={handleAddDocument}>
                      <UploadCloud className="w-4 h-4" /> Add Verified Document
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 5: CUSTOMER CRM
          ========================================== */}
      {activeModule === 'customers' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 text-purple-600" /> Applicant Financial CRM & Borrower Profiles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => (
                <Card key={app.id} className="p-4 bg-white border-slate-200 text-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-[#1E3063] text-sm">{app.applicantName}</h4>
                      <p className="text-slate-500">{app.employerName}</p>
                      <p className="text-slate-500 mt-1">ID: {app.applicantIdNumber} • Phone: {app.applicantPhone}</p>
                    </div>

                    <Badge variant="accent" size="sm">{app.employmentType}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold block">Gross Monthly Income</span>
                      <strong className="text-emerald-700">Ksh {app.monthlyIncome.toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Existing Monthly Debt</span>
                      <strong className="text-slate-700">Ksh {app.existingLoansMonthly.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-semibold">Email: {app.applicantEmail}</span>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedApp(app); setActiveModule('communication'); }}>
                      Contact Borrower
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 6: VEHICLE COLLATERAL SPECS
          ========================================== */}
      {activeModule === 'vehicle_details' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Car className="w-5 h-5 text-rose-500" /> Collateral Asset Verification & Valuation
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applications.map((app) => (
                <Card key={app.id} className="p-5 bg-white border-slate-200 space-y-3 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="verified" size="sm">NTSA TIMS Verified</Badge>
                      <h4 className="font-black text-[#1E3063] text-sm mt-1">{app.vehicleTitle}</h4>
                      <p className="text-slate-500 font-mono">VIN: {app.vehicleVin}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-700 font-display">Ksh {app.vehiclePrice.toLocaleString()}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Valuation</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-bold block">Year / Mileage</span>
                      <strong>{app.vehicleYear} • {app.vehicleMileage.toLocaleString()} km</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Inspection Score</span>
                      <strong className="text-emerald-700">{app.vehicleConditionScore}% Passed</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">Selling Dealer</span>
                      <strong>{app.dealerName.split(' ')[0]}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] pt-1">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Logbook Joint NTSA Registration Prepared
                    </span>
                    <Button variant="outline" size="sm" onClick={() => showToast(`Opened 150-Point Inspection Report for ${app.vehicleTitle}`)}>
                      View 150-Pt Report
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 7: COMMUNICATION & STATUS ALERTS
          ========================================== */}
      {activeModule === 'communication' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <MessageSquare className="w-5 h-5 text-indigo-600" /> Buyer SMS & Push Status Dispatch
            </h3>

            {selectedApp && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-[#1E3063]">Recipient: {selectedApp.applicantName}</span>
                    <p className="text-slate-500">{selectedApp.applicantPhone} • {selectedApp.applicantEmail}</p>
                  </div>
                  <Badge variant="accent" size="sm">{selectedApp.appRef}</Badge>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  {selectedApp.messages.map((msg) => (
                    <div key={msg.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1 shadow-2xs">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-extrabold text-[#1E3063]">{msg.senderName} ({msg.sender})</span>
                        <span className="text-slate-400">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-700 font-medium">{msg.message}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Type status update message to buyer..."
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="accent" size="md" onClick={handleSendMessage}>
                    <Send className="w-4 h-4" /> Send SMS Alert
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ==========================================
          MODULE 8: ANALYTICS
          ========================================== */}
      {activeModule === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-5 bg-white border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500">Total Sanctioned Capital</span>
              <p className="text-2xl font-black text-emerald-700 font-display">Ksh {(approvedPortfolioValue / 1000000).toFixed(2)}M</p>
              <p className="text-[11px] text-slate-400">Approved auto loan disbursements</p>
            </Card>

            <Card className="p-5 bg-white border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500">Average Loan Tenure</span>
              <p className="text-2xl font-black text-[#1E3063] font-display">44 Months</p>
              <p className="text-[11px] text-slate-400">Weighted average term</p>
            </Card>

            <Card className="p-5 bg-white border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-500">Average Interest Rate</span>
              <p className="text-2xl font-black text-amber-600 font-display">12.9% p.a.</p>
              <p className="text-[11px] text-slate-400">Risk-adjusted return</p>
            </Card>
          </div>
        </div>
      )}

      {/* ==========================================
          MODULE 9: SETTINGS & RISK RULES
          ========================================== */}
      {activeModule === 'settings' && (
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="font-black text-[#1E3063] text-base font-display flex items-center gap-2 border-b border-slate-100 pb-3">
              <Settings className="w-5 h-5 text-slate-700" /> Financier Risk Thresholds & Portal Policy Setup
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <label className="font-bold text-slate-700 block">Base Auto Loan Interest Rate (% p.a.)</label>
                <Input
                  type="number"
                  value={baseInterestRate}
                  onChange={(e) => setBaseInterestRate(parseFloat(e.target.value) || 12.5)}
                />

                <label className="font-bold text-slate-700 block">Maximum Loan-To-Value (LTV) Cap %</label>
                <Input
                  type="number"
                  value={maxLtvThreshold}
                  onChange={(e) => setMaxLtvThreshold(parseInt(e.target.value) || 85)}
                />
              </div>

              <div className="space-y-3">
                <label className="font-bold text-slate-700 block">Debt-To-Income (DTI) Ceiling Limit %</label>
                <Input
                  type="number"
                  value={maxDtiThreshold}
                  onChange={(e) => setMaxDtiThreshold(parseInt(e.target.value) || 45)}
                />

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Automated Buyer SMS Status Notifications</span>
                  <input
                    type="checkbox"
                    checked={autoSmsNotify}
                    onChange={(e) => setAutoSmsNotify(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                </div>
              </div>
            </div>

            <Button variant="accent" size="md" onClick={() => showToast('Financier underwriting risk parameters updated successfully!')}>
              Save Financier Policy Settings
            </Button>
          </Card>
        </div>
      )}

      {/* ==========================================
          DECISION SANCTION MODAL
          ========================================== */}
      {showDecisionModal && selectedApp && (
        <Modal
          isOpen={showDecisionModal}
          onClose={() => setShowDecisionModal(false)}
          title={`Record Underwriting Decision: ${selectedApp.applicantName}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <p className="font-bold text-[#1E3063]">Application Ref: {selectedApp.appRef}</p>
              <p className="text-slate-600">Vehicle: {selectedApp.vehicleTitle} (Ksh {selectedApp.loanAmount.toLocaleString()})</p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">Underwriting Decision Type</label>
              <select
                value={decisionType}
                onChange={(e) => setDecisionType(e.target.value as BankApplicationStatus)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
              >
                <option value="Approved">Approved (Issue Loan Sanction Certificate)</option>
                <option value="Under Review">Under Review (Request Further Underwriting)</option>
                <option value="Rejected">Rejected (Decline Application)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 block">Underwriter Sanction Notes & Buyer Message</label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Enter credit sanction notes or rejection rationale..."
                className="w-full p-3 border border-slate-300 rounded-xl font-medium h-24"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setShowDecisionModal(false)}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" onClick={handleSubmitDecision}>
                Record Decision & Dispatch SMS
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==========================================
          APPLICATION DETAIL AUDIT MODAL
          ========================================== */}
      {showDetailModal && selectedApp && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Financing File Audit: ${selectedApp.appRef}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <Badge variant="accent" size="sm">{selectedApp.bankName}</Badge>
                <h3 className="font-black text-[#1E3063] text-sm mt-1">{selectedApp.applicantName}</h3>
                <p className="text-slate-500">ID: {selectedApp.applicantIdNumber} • Phone: {selectedApp.applicantPhone}</p>
              </div>

              <div className="text-right">
                <Badge variant={selectedApp.status === 'Approved' ? 'success' : 'escrow'} size="md">
                  {selectedApp.status}
                </Badge>
                <p className="text-[11px] text-slate-400 mt-1">Submitted: {selectedApp.submissionDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center p-3 bg-white rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">LOAN AMOUNT</span>
                <strong className="text-emerald-700 font-display text-sm">Ksh {selectedApp.loanAmount.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">DEPOSIT PAID</span>
                <strong className="text-[#1E3063]">Ksh {selectedApp.depositAmount.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">LTV RATIO</span>
                <strong className="text-amber-600">{selectedApp.ltvRatio}%</strong>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">CRB SCORE</span>
                <strong className="text-emerald-700">{selectedApp.crbScoreNumber}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-[#1E3063]">Collateral Vehicle Specification</h4>
              <p className="text-slate-700 font-semibold">{selectedApp.vehicleTitle} ({selectedApp.vehicleYear}) • VIN: {selectedApp.vehicleVin}</p>
              <p className="text-slate-500">Valuation: Ksh {selectedApp.vehiclePrice.toLocaleString()} • 150-Point Audit Condition Score: {selectedApp.vehicleConditionScore}%</p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowDecisionModal(true);
                }}
              >
                Make Underwriting Decision
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BankFinancingPortal;
