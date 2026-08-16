// ============================================================
// KAYAD TRUST, COMPLIANCE & GOVERNANCE CENTER
// GOVERNANCE DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  FileCheck,
  AlertTriangle,
  Gavel,
  Scale,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Bell,
  Activity,
  Search,
  Filter,
  Download,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  orange: '#ea580c',
  red: '#dc2626',
  crimson: '#9f1239',
};

// Sample governance data
const GOVERNANCE_DATA = {
  totalEntities: 1250,
  verifiedEntities: 892,
  verificationRate: 71.4,
  activeDisputes: 23,
  resolvedDisputes: 156,
  avgResolutionDays: 8.5,
  openAlerts: 45,
  criticalAlerts: 3,
  fraudReports: 12,
  platformIntegrityScore: 87,
  trustDistribution: {
    trusted: 45,
    platinum: 123,
    gold: 289,
    silver: 412,
    bronze: 178,
    new: 203,
  },
};

const RECENT_DISPUTES = [
  { id: 1, caseNumber: 'KAYAD-D-A1B2C3', type: 'buyer_vs_dealer', subject: 'Vehicle Condition Dispute', status: 'under_review', priority: 'high', createdAt: '2024-01-15', complainant: 'John K.' },
  { id: 2, caseNumber: 'KAYAD-D-D4E5F6', type: 'inspection_appeal', subject: 'Inspection Grade Appeal', status: 'evidence_requested', priority: 'normal', createdAt: '2024-01-14', complainant: 'Auto Motors Ltd' },
  { id: 3, caseNumber: 'KAYAD-D-G7H8I9', type: 'payment_dispute', subject: 'Escrow Payment Release', status: 'investigation', priority: 'normal', createdAt: '2024-01-13', complainant: 'Sarah M.' },
];

const FRAUD_ALERTS = [
  { id: 1, reportNumber: 'KAYAD-F-X1Y2Z3', type: 'fake_dealer', title: 'Suspected Fake Dealership Listing', status: 'investigation', priority: 'high', confidence: 85, reportedAt: '2024-01-15' },
  { id: 2, reportNumber: 'KAYAD-F-A2B3C4', type: 'duplicate_listing', title: 'Duplicate Vehicle Listing', status: 'under_review', priority: 'medium', confidence: 72, reportedAt: '2024-01-14' },
  { id: 3, reportNumber: 'KAYAD-F-D5E6F7', type: 'inspection_fraud', title: 'Suspected Inspection Manipulation', status: 'evidence_requested', priority: 'high', confidence: 68, reportedAt: '2024-01-13' },
];

const VERIFICATION_QUEUE = [
  { id: 1, entityName: 'Premium Motors Kenya', type: 'dealer', level: 'verified_dealer', status: 'under_review', submittedAt: '2024-01-15', documents: 5 },
  { id: 2, entityName: 'AutoTech Inspections', type: 'inspector', level: 'verified_inspector', status: 'documents_received', submittedAt: '2024-01-14', documents: 8 },
  { id: 3, entityName: 'James Wanjiku', type: 'private', level: 'verified_private_seller', status: 'pending', submittedAt: '2024-01-14', documents: 2 },
];

const COMPLIANCE_ALERTS = [
  { id: 1, type: 'expired_certification', entity: 'Elite Auto Dealers', severity: 'high', title: 'Dealer Certification Expired', daysAgo: 5 },
  { id: 2, type: 'outstanding_dispute', entity: 'Quick Cars Ltd', severity: 'warning', title: '2 Unresolved Disputes', daysAgo: 12 },
  { id: 3, type: 'trust_score_change', entity: 'Budget Motors', severity: 'warning', title: 'Trust Score Dropped 25 Points', daysAgo: 3 },
];

export default function TrustGovernanceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'disputes' | 'verification' | 'fraud' | 'compliance'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield size={18} /> },
    { id: 'disputes', label: 'Disputes', icon: <Scale size={18} />, badge: GOVERNANCE_DATA.activeDisputes },
    { id: 'verification', label: 'Verification', icon: <FileCheck size={18} /> },
    { id: 'fraud', label: 'Fraud Reports', icon: <AlertTriangle size={18} />, badge: GOVERNANCE_DATA.fraudReports },
    { id: 'compliance', label: 'Compliance', icon: <ClipboardCheck size={18} />, badge: GOVERNANCE_DATA.openAlerts },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Scale size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Trust, Compliance & Governance</h1>
                <p className="text-sm opacity-80">Protecting Ecosystem Integrity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                Integrity Score: {GOVERNANCE_DATA.platformIntegrityScore}
              </span>
              <div className="p-2 rounded-lg cursor-pointer hover:bg-white/10">
                <Bell size={20} color={KAYAD_COLORS.white} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : KAYAD_COLORS.amber, color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.white }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={<Users size={24} />}
                label="Total Entities"
                value={GOVERNANCE_DATA.totalEntities.toLocaleString()}
                subValue={`${GOVERNANCE_DATA.verifiedEntities} verified`}
              />
              <MetricCard
                icon={<FileCheck size={24} />}
                label="Verification Rate"
                value={`${GOVERNANCE_DATA.verificationRate}%`}
                subValue="Last 30 days"
              />
              <MetricCard
                icon={<Scale size={24} />}
                label="Active Disputes"
                value={GOVERNANCE_DATA.activeDisputes.toString()}
                subValue={`${GOVERNANCE_DATA.resolvedDisputes} resolved`}
                alert={GOVERNANCE_DATA.activeDisputes > 20}
              />
              <MetricCard
                icon={<ShieldAlert size={24} />}
                label="Compliance Alerts"
                value={GOVERNANCE_DATA.openAlerts.toString()}
                subValue={`${GOVERNANCE_DATA.criticalAlerts} critical`}
                alert={GOVERNANCE_DATA.criticalAlerts > 0}
              />
            </div>

            {/* Trust Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Trust Score Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(GOVERNANCE_DATA.trustDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center gap-4">
                      <div className="w-20">
                        <span className="text-sm capitalize font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
                          {level}
                        </span>
                      </div>
                      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <div
                          className="h-full rounded-full flex items-center justify-end pr-2"
                          style={{ 
                            width: `${(count / GOVERNANCE_DATA.totalEntities) * 100}%`,
                            backgroundColor: level === 'trusted' ? KAYAD_COLORS.emerald :
                                          level === 'platinum' ? KAYAD_COLORS.lightNavy :
                                          level === 'gold' ? KAYAD_COLORS.amber :
                                          level === 'silver' ? KAYAD_COLORS.softBlue :
                                          level === 'bronze' ? KAYAD_COLORS.mutedTerracotta : '#94a3b8'
                          }}
                        >
                          <span className="text-xs font-medium text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Dispute Resolution Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{GOVERNANCE_DATA.resolvedDisputes}</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Total Resolved</p>
                  </div>
                  <div className="p-4 rounded-lg text-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>{GOVERNANCE_DATA.avgResolutionDays}d</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Avg Resolution</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Resolution Rate</span>
                    <span className="text-lg font-bold" style={{ color: KAYAD_COLORS.emerald }}>87%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="h-full rounded-full" style={{ width: '87%', backgroundColor: KAYAD_COLORS.emerald }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Activity</h3>
              <div className="space-y-4">
                <ActivityItem
                  type="verification"
                  action="Verification approved"
                  entity="Premium Auto Dealers"
                  time="2 hours ago"
                  icon={<FileCheck size={16} />}
                />
                <ActivityItem
                  type="dispute"
                  action="Dispute resolved"
                  entity="KAYAD-D-A1B2C3"
                  time="4 hours ago"
                  icon={<Scale size={16} />}
                />
                <ActivityItem
                  type="fraud"
                  action="Fraud report filed"
                  entity="KAYAD-F-X1Y2Z3"
                  time="5 hours ago"
                  icon={<AlertTriangle size={16} />}
                />
                <ActivityItem
                  type="compliance"
                  action="Certification expiry alert"
                  entity="Elite Motors Ltd"
                  time="6 hours ago"
                  icon={<ClipboardCheck size={16} />}
                />
              </div>
            </div>
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === 'disputes' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Dispute Resolution Center</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                  <Filter size={18} />
                  Filter
                </button>
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {RECENT_DISPUTES.map((dispute, index) => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl p-6 shadow-md border-l-4"
                  style={{ 
                    backgroundColor: KAYAD_COLORS.white,
                    borderLeftColor: dispute.priority === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.softBlue
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono" style={{ color: KAYAD_COLORS.softBlue }}>
                          {dispute.caseNumber}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={{
                            backgroundColor: dispute.status === 'under_review' ? `${KAYAD_COLORS.amber}20` :
                                           dispute.status === 'evidence_requested' ? `${KAYAD_COLORS.orange}20` :
                                           `${KAYAD_COLORS.softBlue}20`,
                            color: dispute.status === 'under_review' ? KAYAD_COLORS.amber :
                                   dispute.status === 'evidence_requested' ? KAYAD_COLORS.orange :
                                   KAYAD_COLORS.softBlue,
                          }}
                        >
                          {dispute.status.replace('_', ' ')}
                        </span>
                        {dispute.priority === 'high' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.red}20`, color: KAYAD_COLORS.red }}>
                            High Priority
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {dispute.subject}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                        Type: {dispute.type.replace('_', ' ')} • Complainant: {dispute.complainant}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                        <Eye size={18} className="inline mr-1" />
                        View
                      </button>
                      <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                        <Scale size={18} className="inline mr-1" />
                        Resolve
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                      Filed: {dispute.createdAt}
                    </span>
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                      <Clock size={14} className="inline mr-1" />
                      3 days in process
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Verification Tab */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Verification Management</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: KAYAD_COLORS.softBlue }} />
                  <input
                    type="text"
                    placeholder="Search applications..."
                    className="pl-10 pr-4 py-2 rounded-lg border outline-none"
                    style={{ borderColor: KAYAD_COLORS.softBlue, width: '250px' }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {VERIFICATION_QUEUE.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                        <Users size={24} style={{ color: KAYAD_COLORS.lightNavy }} />
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{app.entityName}</h3>
                        <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{app.type} • {app.level.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: app.status === 'under_review' ? `${KAYAD_COLORS.amber}20` :
                                         app.status === 'documents_received' ? `${KAYAD_COLORS.emerald}20` :
                                         `${KAYAD_COLORS.softBlue}20`,
                          color: app.status === 'under_review' ? KAYAD_COLORS.amber :
                                 app.status === 'documents_received' ? KAYAD_COLORS.emerald :
                                 KAYAD_COLORS.softBlue,
                        }}
                      >
                        {app.status.replace('_', ' ')}
                      </span>
                      <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                        {app.documents} documents • {app.submittedAt}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                      View Documents
                    </button>
                    <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                      <CheckCircle size={18} className="inline mr-1" />
                      Approve
                    </button>
                    <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: `${KAYAD_COLORS.red}10`, color: KAYAD_COLORS.red }}>
                      <XCircle size={18} className="inline mr-1" />
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Fraud Tab */}
        {activeTab === 'fraud' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Fraud Detection & Reporting</h2>
              <button className="px-4 py-2 rounded-lg text-white" style={{ backgroundColor: KAYAD_COLORS.red }}>
                <AlertTriangle size={18} className="inline mr-1" />
                Report Fraud
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.red }}>{GOVERNANCE_DATA.fraudReports}</p>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Active Reports</p>
              </div>
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.orange }}>5</p>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Under Investigation</p>
              </div>
              <div className="rounded-xl p-4 shadow-md text-center" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <p className="text-3xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>28</p>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Confirmed & Resolved</p>
              </div>
            </div>

            <div className="space-y-4">
              {FRAUD_ALERTS.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl p-6 shadow-md border-2"
                  style={{ 
                    backgroundColor: KAYAD_COLORS.white,
                    borderColor: alert.priority === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${alert.priority === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber}20` }}>
                        <AlertTriangle size={20} style={{ color: alert.priority === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber }} />
                      </div>
                      <div>
                        <span className="text-xs font-mono" style={{ color: KAYAD_COLORS.softBlue }}>{alert.reportNumber}</span>
                        <h3 className="font-semibold mt-1" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</h3>
                        <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Type: {alert.type.replace('_', ' ')} • Confidence: {alert.confidence}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                        Investigate
                      </button>
                      <button className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Compliance Monitoring</h2>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Active Alerts</h3>
              <div className="space-y-4">
                {COMPLIANCE_ALERTS.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{ backgroundColor: KAYAD_COLORS.warmBeige }}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: alert.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.amber }}
                      />
                      <div>
                        <h4 className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</h4>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{alert.entity} • {alert.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {alert.daysAgo} days ago
                      </span>
                      <button className="px-3 py-1 rounded-lg text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                        Review
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Certification Status */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Certification Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: `${KAYAD_COLORS.emerald}10` }}>
                  <CheckCircle size={32} style={{ color: KAYAD_COLORS.emerald }} className="mx-auto mb-2" />
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>245</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Active Certifications</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: `${KAYAD_COLORS.amber}10` }}>
                  <Clock size={32} style={{ color: KAYAD_COLORS.amber }} className="mx-auto mb-2" />
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>18</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Expiring Soon</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: `${KAYAD_COLORS.red}10` }}>
                  <XCircle size={32} style={{ color: KAYAD_COLORS.red }} className="mx-auto mb-2" />
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>3</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Expired</p>
                </div>
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}10` }}>
                  <FileText size={32} style={{ color: KAYAD_COLORS.softBlue }} className="mx-auto mb-2" />
                  <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>12</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Pending Renewal</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, subValue, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  alert?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: alert ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
        {alert && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.amber }} />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {subValue && (
          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{subValue}</span>
        )}
      </div>
    </motion.div>
  );
}

// Activity Item Component
function ActivityItem({ type, action, entity, time, icon }: {
  type: string;
  action: string;
  entity: string;
  time: string;
  icon: React.ReactNode;
}) {
  const colors = {
    verification: KAYAD_COLORS.emerald,
    dispute: KAYAD_COLORS.softBlue,
    fraud: KAYAD_COLORS.red,
    compliance: KAYAD_COLORS.amber,
  };

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${colors[type as keyof typeof colors]}20`, color: colors[type as keyof typeof colors] }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>
          <span className="font-medium">{action}</span> • {entity}
        </p>
      </div>
      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{time}</span>
    </div>
  );
}
