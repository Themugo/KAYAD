// ============================================================
// KAYAD ENTERPRISE GOVERNANCE, RISK & COMPLIANCE PLATFORM
// EXECUTIVE GOVERNANCE DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  Users,
  Building2,
  Scale,
  Eye,
  Lock,
  AlertCircle,
  Clipboard,
  BookOpen,
  Activity,
  Flag,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  PieChart,
  Bell,
  Settings,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
};

// Sample governance data
const RISK_REGISTER = [
  { id: 1, name: 'Marketplace Fraud', category: 'fraud', likelihood: 4, impact: 5, status: 'active', owner: 'CRO' },
  { id: 2, name: 'Data Breach', category: 'cybersecurity', likelihood: 2, impact: 5, status: 'mitigated', owner: 'CISO' },
  { id: 3, name: 'Partner Default', category: 'partner', likelihood: 3, impact: 4, status: 'active', owner: 'VP Partnerships' },
  { id: 4, name: 'Regulatory Non-Compliance', category: 'regulatory', likelihood: 2, impact: 4, status: 'active', owner: 'CCO' },
  { id: 5, name: 'Technology Failure', category: 'technology', likelihood: 3, impact: 3, status: 'mitigated', owner: 'CTO' },
];

const COMPLIANCE_ITEMS = [
  { name: 'Data Protection (GDPR)', status: 'compliant', dueDate: '2026-08-15', owner: 'Legal' },
  { name: 'Financial Reporting (IFRS)', status: 'compliant', dueDate: '2026-09-30', owner: 'Finance' },
  { name: 'Consumer Protection Laws', status: 'compliant', dueDate: '2026-12-31', owner: 'Compliance' },
  { name: 'Anti-Money Laundering (AML)', status: 'review', dueDate: '2026-08-01', owner: 'Compliance' },
  { name: 'KYC/AML Requirements', status: 'compliant', dueDate: '2026-08-01', owner: 'Compliance' },
  { name: 'Regional Data Residency', status: 'in_progress', dueDate: '2026-10-15', owner: 'IT' },
];

const POLICIES = [
  { name: 'Information Security Policy', version: '3.2', status: 'published', lastReview: '2026-06-15' },
  { name: 'Marketplace Standards', version: '2.1', status: 'published', lastReview: '2026-07-01' },
  { name: 'Auction Policies', version: '1.5', status: 'review', lastReview: '2026-05-20' },
  { name: 'Inspection Standards', version: '2.0', status: 'published', lastReview: '2026-06-30' },
  { name: 'Privacy Policy', version: '4.0', status: 'published', lastReview: '2026-07-10' },
  { name: 'Code of Conduct', version: '2.3', status: 'review', lastReview: '2026-04-15' },
];

const AUDITS = [
  { name: 'SOC 2 Type II', status: 'completed', date: '2026-06-30', findings: 0 },
  { name: 'PCI DSS Assessment', status: 'completed', date: '2026-05-15', findings: 2 },
  { name: 'ISO 27001 Audit', status: 'in_progress', date: '2026-08-15', findings: 0 },
  { name: 'GDPR Compliance Review', status: 'scheduled', date: '2026-09-01', findings: 0 },
];

const COMMITTEES = [
  { name: 'Board of Directors', members: 9, meetings: 'Quarterly', lastMeeting: '2026-06-15' },
  { name: 'Risk Committee', members: 5, meetings: 'Monthly', lastMeeting: '2026-07-01' },
  { name: 'Audit Committee', members: 4, meetings: 'Quarterly', lastMeeting: '2026-06-20' },
  { name: 'Technology Committee', members: 6, meetings: 'Monthly', lastMeeting: '2026-07-10' },
  { name: 'Compliance Committee', members: 7, meetings: 'Bi-weekly', lastMeeting: '2026-07-15' },
];

const VENDORS = [
  { name: 'AWS Cloud', category: 'cloud', riskRating: 'low', contractExpiry: '2027-03-15' },
  { name: 'Stripe Payments', category: 'payments', riskRating: 'low', contractExpiry: '2026-12-01' },
  { name: 'Twilio Communications', category: 'messaging', riskRating: 'low', contractExpiry: '2026-09-30' },
  { name: 'Cloudinary Media', category: 'media', riskRating: 'medium', contractExpiry: '2026-11-15' },
  { name: 'AI Services Provider', category: 'ai', riskRating: 'medium', contractExpiry: '2026-08-01' },
];

const INCIDENTS = [
  { id: 1, title: 'Suspicious Auction Activity', severity: 'medium', status: 'investigating', reported: '2026-07-28' },
  { id: 2, title: 'Unauthorized Access Attempt', severity: 'high', status: 'resolved', reported: '2026-07-25' },
  { id: 3, title: 'Data Quality Issue', severity: 'low', status: 'resolved', reported: '2026-07-20' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'compliant':
    case 'completed':
    case 'resolved':
    case 'published':
    case 'mitigated':
      return KAYAD_COLORS.emerald;
    case 'review':
    case 'in_progress':
    case 'investigating':
    case 'active':
      return KAYAD_COLORS.amber;
    case 'non_compliant':
    case 'failed':
    case 'high':
    case 'critical':
      return KAYAD_COLORS.red;
    case 'scheduled':
    case 'pending':
      return KAYAD_COLORS.softBlue;
    default:
      return KAYAD_COLORS.softBlue;
  }
};

const getRiskScore = (likelihood: number, impact: number) => likelihood * impact;

const getRiskLevel = (score: number) => {
  if (score >= 16) return { level: 'Critical', color: KAYAD_COLORS.red };
  if (score >= 12) return { level: 'High', color: KAYAD_COLORS.amber };
  if (score >= 6) return { level: 'Medium', color: KAYAD_COLORS.purple };
  return { level: 'Low', color: KAYAD_COLORS.softBlue };
};

export default function GovernanceDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'compliance' | 'policies' | 'audits'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield size={18} /> },
    { id: 'risks', label: 'Risk Register', icon: <AlertTriangle size={18} /> },
    { id: 'compliance', label: 'Compliance', icon: <Scale size={18} /> },
    { id: 'policies', label: 'Policies', icon: <BookOpen size={18} /> },
    { id: 'audits', label: 'Audits', icon: <Clipboard size={18} /> },
  ];

  // Calculate risk heat map data
  const highRisks = RISK_REGISTER.filter(r => getRiskScore(r.likelihood, r.impact) >= 12).length;
  const mediumRisks = RISK_REGISTER.filter(r => getRiskScore(r.likelihood, r.impact) >= 6 && getRiskScore(r.likelihood, r.impact) < 12).length;
  const lowRisks = RISK_REGISTER.filter(r => getRiskScore(r.likelihood, r.impact) < 6).length;

  const compliantItems = COMPLIANCE_ITEMS.filter(c => c.status === 'compliant').length;
  const reviewItems = COMPLIANCE_ITEMS.filter(c => c.status === 'review' || c.status === 'in_progress').length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Shield size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Governance & Risk</h1>
                <p className="text-sm opacity-80">Enterprise Compliance Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <ShieldCheck size={16} />
                Fully Compliant
              </span>
              <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Bell size={20} color={KAYAD_COLORS.white} />
              </button>
              <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Settings size={20} color={KAYAD_COLORS.white} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Total Risks', value: RISK_REGISTER.length, icon: <AlertTriangle size={20} />, color: KAYAD_COLORS.amber },
                { label: 'High Risks', value: highRisks, icon: <ShieldAlert size={20} />, color: KAYAD_COLORS.red },
                { label: 'Compliance', value: `${(compliantItems / COMPLIANCE_ITEMS.length * 100).toFixed(0)}%`, icon: <CheckCircle size={20} />, color: KAYAD_COLORS.emerald },
                { label: 'Active Policies', value: POLICIES.filter(p => p.status === 'published').length, icon: <BookOpen size={20} />, color: KAYAD_COLORS.purple },
                { label: 'Open Incidents', value: INCIDENTS.filter(i => i.status === 'investigating').length, icon: <AlertCircle size={20} />, color: KAYAD_COLORS.amber },
              ].map((metric, i) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-4 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center gap-2 mb-2" style={{ color: KAYAD_COLORS.softBlue }}>
                    {metric.icon}
                    <span className="text-sm">{metric.label}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: metric.color }}>
                    {metric.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Risk Heat Map & Compliance Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <PieChart size={20} />
                  Risk Distribution
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.red}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: KAYAD_COLORS.red }} />
                      <span style={{ color: KAYAD_COLORS.lightNavy }}>Critical/High Risks</span>
                    </div>
                    <span className="font-bold" style={{ color: KAYAD_COLORS.red }}>{highRisks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.amber}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: KAYAD_COLORS.amber }} />
                      <span style={{ color: KAYAD_COLORS.lightNavy }}>Medium Risks</span>
                    </div>
                    <span className="font-bold" style={{ color: KAYAD_COLORS.amber }}>{mediumRisks}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}10` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: KAYAD_COLORS.softBlue }} />
                      <span style={{ color: KAYAD_COLORS.lightNavy }}>Low Risks</span>
                    </div>
                    <span className="font-bold" style={{ color: KAYAD_COLORS.softBlue }}>{lowRisks}</span>
                  </div>
                </div>
              </div>

              {/* Compliance Status */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Scale size={20} />
                  Compliance Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Overall Compliance</span>
                      <span className="font-bold" style={{ color: KAYAD_COLORS.emerald }}>
                        {(compliantItems / COMPLIANCE_ITEMS.length * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${(compliantItems / COMPLIANCE_ITEMS.length) * 100}%`, backgroundColor: KAYAD_COLORS.emerald }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.emerald}10` }}>
                      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>{compliantItems}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Compliant</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${KAYAD_COLORS.amber}10` }}>
                      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.amber }}>{reviewItems}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Under Review</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Committees & Recent Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Users size={20} />
                  Governance Committees
                </h3>
                <div className="space-y-3">
                  {COMMITTEES.slice(0, 4).map((committee, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                          <Users size={16} style={{ color: KAYAD_COLORS.purple }} />
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{committee.name}</p>
                          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{committee.members} members • {committee.meetings}</p>
                        </div>
                      </div>
                      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{committee.lastMeeting}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                  <Activity size={20} />
                  Recent Incidents
                </h3>
                <div className="space-y-3">
                  {INCIDENTS.map((incident) => (
                    <div key={incident.id} className="flex items-start justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-start gap-3">
                        <AlertCircle size={18} style={{ color: getStatusColor(incident.severity), marginTop: 2 }} />
                        <div>
                          <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{incident.title}</p>
                          <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Reported: {incident.reported}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(incident.status)}20`, color: getStatusColor(incident.status) }}>
                        {incident.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Register Tab */}
        {activeTab === 'risks' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Enterprise Risk Register</h3>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  Add New Risk
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                      <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Risk</th>
                      <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Category</th>
                      <th className="text-center py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Likelihood</th>
                      <th className="text-center py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Impact</th>
                      <th className="text-center py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Score</th>
                      <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Owner</th>
                      <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RISK_REGISTER.map((risk) => {
                      const score = getRiskScore(risk.likelihood, risk.impact);
                      const { level, color } = getRiskLevel(score);
                      return (
                        <tr key={risk.id} className="border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                          <td className="py-3 px-4">
                            <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{risk.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                              {risk.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium">{risk.likelihood}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-medium">{risk.impact}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-1 rounded text-sm font-bold" style={{ backgroundColor: `${color}20`, color }}>
                              {score} ({level})
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span style={{ color: KAYAD_COLORS.lightNavy }}>{risk.owner}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(risk.status)}20`, color: getStatusColor(risk.status) }}>
                              {risk.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Compliance Obligations</h3>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  Add Obligation
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {COMPLIANCE_ITEMS.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl border-2"
                    style={{ 
                      borderColor: item.status === 'compliant' ? KAYAD_COLORS.emerald : 
                                   item.status === 'review' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue,
                      backgroundColor: KAYAD_COLORS.white
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getStatusColor(item.status)}20` }}>
                        {item.status === 'compliant' ? (
                          <CheckCircle size={20} style={{ color: getStatusColor(item.status) }} />
                        ) : (
                          <Clock size={20} style={{ color: getStatusColor(item.status) }} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Owner: {item.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Due Date</p>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.dueDate}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${getStatusColor(item.status)}20`, color: getStatusColor(item.status) }}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Policy Management</h3>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  Create Policy
                </button>
              </div>

              <div className="space-y-4">
                {POLICIES.map((policy, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                        <FileText size={20} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{policy.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>v{policy.version} • Last reviewed: {policy.lastReview}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${getStatusColor(policy.status)}20`, color: getStatusColor(policy.status) }}>
                        {policy.status}
                      </span>
                      <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.white }}>
                        <ChevronRight size={18} style={{ color: KAYAD_COLORS.softBlue }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Audits Tab */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Audit Management</h3>
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  Schedule Audit
                </button>
              </div>

              <div className="space-y-4">
                {AUDITS.map((audit, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border-2" style={{ 
                    borderColor: getStatusColor(audit.status),
                    backgroundColor: KAYAD_COLORS.white
                  }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getStatusColor(audit.status)}20` }}>
                        <Clipboard size={20} style={{ color: getStatusColor(audit.status) }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{audit.name}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Date: {audit.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {audit.findings > 0 && (
                        <div className="text-right">
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Findings</p>
                          <p className="font-bold" style={{ color: KAYAD_COLORS.amber }}>{audit.findings}</p>
                        </div>
                      )}
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${getStatusColor(audit.status)}20`, color: getStatusColor(audit.status) }}>
                        {audit.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vendor Governance */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Vendor Governance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {VENDORS.map((vendor, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{vendor.name}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ 
                        backgroundColor: vendor.riskRating === 'low' ? `${KAYAD_COLORS.emerald}20` : `${KAYAD_COLORS.amber}20`,
                        color: vendor.riskRating === 'low' ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber
                      }}>
                        {vendor.riskRating} risk
                      </span>
                    </div>
                    <p className="text-sm mb-2" style={{ color: KAYAD_COLORS.softBlue }}>{vendor.category}</p>
                    <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Expires: {vendor.contractExpiry}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
