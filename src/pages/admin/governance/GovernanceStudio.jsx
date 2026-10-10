import React, { useState, useEffect } from 'react';
import {
  Shield, FileText, GitBranch, CheckCircle, AlertTriangle, Book, Globe,
  Users, BarChart3, Clock, Plus, RefreshCw, ChevronRight, Lock, Unlock,
  TrendingUp, TrendingDown, Scale, Calendar, Flag, ClipboardCheck,
  Lightbulb, Send, Eye, Edit, Trash2, X, Check
} from 'lucide-react';
import * as govApi from '../../../services/governanceApi';

// Design System Colors
const colors = {
  navy: '#0A3340',
  beige: '#EEF7F5',
  white: '#FFFFFF',
  emerald: '#10B981',
  terracotta: '#5aafa4',
  softBlue: '#5AAFA4',
  mutedOrange: '#13b8a6',
  mutedCrimson: '#EF4444',
  purple: '#5aafa4',
};

const modules = [
  { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3, color: colors.navy },
  { id: 'policies', label: 'Policy Manager', icon: FileText, color: colors.emerald },
  { id: 'changes', label: 'Change Management', icon: GitBranch, color: colors.terracotta },
  { id: 'approvals', label: 'Approval Matrix', icon: CheckCircle, color: colors.purple },
  { id: 'features', label: 'Feature Lifecycle', icon: Flag, color: colors.softBlue },
  { id: 'risks', label: 'Risk Management', icon: AlertTriangle, color: colors.mutedCrimson },
  { id: 'standards', label: 'Standards Library', icon: Book, color: colors.navy },
  { id: 'countries', label: 'Country Governance', icon: Globe, color: colors.emerald },
  { id: 'partners', label: 'Partner Governance', icon: Users, color: colors.terracotta },
  { id: 'releases', label: 'Release Governance', icon: Clock, color: colors.purple },
  { id: 'decisions', label: 'Decision Register', icon: Scale, color: colors.mutedOrange },
  { id: 'compliance', label: 'Compliance Center', icon: Shield, color: colors.softBlue },
  { id: 'audit', label: 'Audit Center', icon: ClipboardCheck, color: colors.navy },
  { id: 'help', label: 'AI Assistant', icon: Lightbulb, color: '#13b8a6' },
];

const featureStages = ['idea', 'planning', 'development', 'testing', 'uat', 'approved', 'pilot', 'production', 'deprecated', 'retired'];

export default function GovernanceStudio() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [changes, setChanges] = useState([]);
  const [risks, setRisks] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [features, setFeatures] = useState([]);
  const [standards, setStandards] = useState([]);
  const [releases, setReleases] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [helpQuestion, setHelpQuestion] = useState('');
  const [helpResponse, setHelpResponse] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: dashData } = await govApi.getGovernanceDashboard();
      setDashboard(dashData.data);

      const { data: polData } = await govApi.getPolicies();
      setPolicies(polData.data);

      const { data: changeData } = await govApi.getChangeRequests();
      setChanges(changeData.data);

      const { data: riskData } = await govApi.getRisks();
      setRisks(riskData.data);

      const { data: appData } = await govApi.getApprovalRules();
      setApprovals(appData.data);

      const { data: featData } = await govApi.getFeatureLifecycles();
      setFeatures(featData.data);

      const { data: stdData } = await govApi.getStandards();
      setStandards(stdData.data);

      const { data: relData } = await govApi.getReleases();
      setReleases(relData.data);

      const { data: decData } = await govApi.getDecisions();
      setDecisions(decData.data);

      const { data: auditData } = await govApi.getAuditLogs();
      setAuditLogs(auditData.data);

      const { data: compData } = await govApi.getComplianceDashboard();
      setCompliance(compData.data);
    } catch (error) {
      console.error('Failed to load governance data:', error);
      // No synthetic production fallback: the UI remains empty until the backend responds.
    } finally {
      setLoading(false);
    }
  };

  const handleHelpQuestion = async () => {
    if (!helpQuestion.trim()) return;
    try {
      const { data } = await govApi.getGovernanceHelp({ question: helpQuestion });
      setHelpResponse(data.data);
    } catch (error) {
      console.error('Help query failed:', error);
    }
  };

  // ============================================
  // DASHBOARD
  // ============================================

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Governance Dashboard</h2>
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border border-[#D7E7E4] rounded-lg hover:bg-[#F6FAF9]">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        {[
          { label: 'Active Policies', value: dashboard?.summary?.activePolicies || 0, icon: FileText, color: colors.emerald },
          { label: 'Pending Changes', value: dashboard?.summary?.pendingChanges || 0, icon: GitBranch, color: colors.terracotta },
          { label: 'Pending Approvals', value: dashboard?.summary?.pendingApprovals || 0, icon: CheckCircle, color: colors.purple },
          { label: 'Open Risks', value: dashboard?.summary?.openRisks || 0, icon: AlertTriangle, color: colors.mutedCrimson },
          { label: 'Upcoming Releases', value: dashboard?.summary?.upcomingReleases || 0, icon: Clock, color: colors.softBlue },
          { label: 'Compliance Score', value: dashboard?.summary?.complianceScore || 0, icon: Shield, color: colors.navy, suffix: '%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={18} style={{ color: stat.color }} />
              <span className="text-sm text-[#64748B]">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#0A3340]">
              {stat.value}{stat.suffix}
            </p>
          </div>
        ))}
      </div>

      {/* Risk Overview */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Risk Overview</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Critical', value: dashboard?.riskOverview?.critical || 0, color: colors.mutedCrimson },
            { label: 'High', value: dashboard?.riskOverview?.high || 0, color: colors.mutedOrange },
            { label: 'Medium', value: dashboard?.riskOverview?.medium || 0, color: '#13b8a6' },
            { label: 'Low', value: dashboard?.riskOverview?.low || 0, color: colors.emerald },
          ].map((risk, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${risk.color}20` }}>
                <span className="text-2xl font-bold" style={{ color: risk.color }}>{risk.value}</span>
              </div>
              <p className="text-sm text-[#64748B]">{risk.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Pending Approvals</h3>
        <div className="space-y-3">
          {(dashboard?.pendingApprovals || []).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-[#F6FAF9] rounded-lg">
              <div>
                <p className="font-medium text-[#0A3340]">{item.name}</p>
                <p className="text-sm text-[#64748B]">{item.type} - Requested by {item.requestedBy}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                  item.riskLevel === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                  'bg-[#EEF7F5] text-[#12576D]'
                }`}>
                  {item.riskLevel} risk
                </span>
                <button className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // POLICIES
  // ============================================

  const renderPolicies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Policy Manager</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Policy
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Policy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Version</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {policies.map((policy) => (
              <tr key={policy.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 font-medium text-[#0A3340]">{policy.name}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">v{policy.version}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{policy.owner}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    policy.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    policy.status === 'draft' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {policy.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-[#0A3340] font-medium hover:underline mr-3">View</button>
                  <button className="text-sm text-[#64748B] hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // CHANGE MANAGEMENT
  // ============================================

  const renderChanges = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Change Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Change Request
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Change</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Risk Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {changes.map((change) => (
              <tr key={change.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 font-medium text-[#0A3340]">{change.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    change.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                    change.riskLevel === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {change.riskLevel}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    change.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    change.status === 'pending' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {change.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-sm text-[#0A3340] font-medium hover:underline">Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // APPROVAL MATRIX
  // ============================================

  const renderApprovals = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Approval Matrix</h2>

      <div className="grid grid-cols-2 gap-6">
        {approvals.map((rule) => (
          <div key={rule.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#0A3340]">{rule.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                rule.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                rule.riskLevel === 'high' ? 'bg-[#DDF4F0] text-[#12576D]' :
                rule.riskLevel === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                'bg-[#EEF7F5] text-[#12576D]'
              }`}>
                {rule.riskLevel}
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[#64748B]">Required Approvers:</p>
              {(rule.approvers || []).map((approver, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-[#F6FAF9] rounded">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span className="text-sm text-[#12576D]">{approver}</span>
                </div>
              ))}
            </div>
            {rule.requiresUnanimous && (
              <p className="text-xs text-[#64748B] mt-3 italic">Requires unanimous approval</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // FEATURE LIFECYCLE
  // ============================================

  const renderFeatures = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Feature Lifecycle</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <div className="flex justify-between mb-4">
          {['idea', 'planning', 'dev', 'testing', 'uat', 'approved', 'pilot', 'prod'].map((stage, i) => (
            <div key={i} className="text-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                i < 5 ? 'bg-[#0A3340] text-white' : 'bg-[#DDF4F0] text-[#94A3B8]'
              }`}>
                {i + 1}
              </div>
              <p className="text-xs text-[#64748B] mt-1">{stage}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {features.map((feature) => (
          <div key={feature.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-[#0A3340]">{feature.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                feature.stage === 'production' ? 'bg-emerald-100 text-emerald-700' :
                feature.stage === 'pilot' ? 'bg-[#DDF4F0] text-[#12576D]' :
                feature.stage === 'testing' ? 'bg-[#DDF4F0] text-[#12576D]' :
                'bg-[#EEF7F5] text-[#12576D]'
              }`}>
                {feature.stage}
              </span>
            </div>
            <div className="w-full bg-[#DDF4F0] rounded-full h-2">
              <div className="bg-[#0A3340] h-2 rounded-full" style={{ width: `${feature.progress}%` }} />
            </div>
            <p className="text-xs text-[#64748B] mt-2">{feature.progress}% complete</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // RISK MANAGEMENT
  // ============================================

  const renderRisks = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#0A3340]">Risk Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A3340] text-white rounded-lg hover:bg-[#12576D]">
          <Plus size={18} />
          New Risk
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Risk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Owner</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {risks.map((risk) => (
              <tr key={risk.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 font-medium text-[#0A3340]">{risk.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    risk.level === 'critical' ? 'bg-red-100 text-red-700' :
                    risk.level === 'high' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    risk.level === 'medium' ? 'bg-[#DDF4F0] text-[#12576D]' :
                    'bg-[#EEF7F5] text-[#12576D]'
                  }`}>
                    {risk.level}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B] capitalize">{risk.status}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{risk.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // RELEASES
  // ============================================

  const renderReleases = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Release Governance</h2>

      <div className="grid grid-cols-3 gap-4">
        {releases.map((release) => (
          <div key={release.id} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0A3340]">{release.version}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                release.status === 'deployed' ? 'bg-emerald-100 text-emerald-700' :
                release.status === 'scheduled' ? 'bg-[#DDF4F0] text-[#12576D]' :
                'bg-[#EEF7F5] text-[#12576D]'
              }`}>
                {release.status}
              </span>
            </div>
            <p className="text-sm text-[#64748B] capitalize mb-3">{release.type} release</p>
            <div className="space-y-1">
              {(release.features || []).map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle size={14} className="text-emerald-500" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ============================================
  // COMPLIANCE
  // ============================================

  const renderCompliance = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Compliance Center</h2>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Policy Compliance', value: compliance?.metrics?.policyCompliance?.score || 96, color: colors.emerald },
          { label: 'Approval Compliance', value: compliance?.metrics?.approvalCompliance?.score || 98, color: colors.emerald },
          { label: 'Overall Score', value: compliance?.overall?.score || 94, color: colors.navy },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4] text-center">
            <p className="text-sm text-[#64748B] mb-2">{stat.label}</p>
            <p className="text-4xl font-bold" style={{ color: stat.color }}>{stat.value}%</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Audit Findings</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Open</span>
              <span className="font-bold text-[#0A3340]">{compliance?.metrics?.auditFindings?.open || 3}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#64748B]">Resolved</span>
              <span className="font-bold text-emerald-600">{compliance?.metrics?.auditFindings?.resolved || 12}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#D7E7E4]">
          <h3 className="font-semibold text-[#0A3340] mb-4">Upcoming Reviews</h3>
          <div className="space-y-2">
            {(compliance?.upcomingReviews || [
              { policy: 'Security Policy', reviewDate: '2024-03-01' },
              { policy: 'Data Privacy Policy', reviewDate: '2024-03-15' },
            ]).map((review, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-[#F6FAF9] rounded-lg">
                <span className="text-sm text-[#12576D]">{review.policy}</span>
                <span className="text-xs text-[#64748B]">{review.reviewDate}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // AUDIT
  // ============================================

  const renderAudit = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">Audit Center</h2>

      <div className="bg-white rounded-xl shadow-sm border border-[#D7E7E4] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6FAF9]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E7E4]">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F6FAF9]">
                <td className="px-6 py-4 text-sm text-[#12576D] capitalize">{log.action.replace(/_/g, ' ')}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{log.user}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{log.details}</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================
  // AI ASSISTANT
  // ============================================

  const renderHelp = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#0A3340]">AI Governance Assistant</h2>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
        <h3 className="font-semibold text-[#0A3340] mb-4">Ask a Question</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={helpQuestion}
            onChange={(e) => setHelpQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleHelpQuestion()}
            placeholder="e.g., How do I approve a new policy?"
            className="flex-1 px-4 py-3 border border-[#D7E7E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A3340]"
          />
          <button
            onClick={handleHelpQuestion}
            className="px-6 py-3 bg-[#0A3340] text-white rounded-xl hover:bg-[#12576D]"
          >
            <Send size={20} />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {['How do I approve a new policy?', 'What are the risk categories?', 'How do I release a new feature?', 'What is the change management process?'].map((q, i) => (
            <button key={i} onClick={() => setHelpQuestion(q)} className="px-3 py-1.5 bg-[#EEF7F5] text-[#12576D] rounded-full text-sm hover:bg-[#DDF4F0]">
              {q}
            </button>
          ))}
        </div>
      </div>

      {helpResponse && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-[#D7E7E4]">
          <p className="text-[#12576D] mb-4">{helpResponse.answer}</p>

          {helpResponse.steps && (
            <div className="mb-4">
              <h4 className="font-medium text-[#0A3340] mb-2">Steps:</h4>
              <ol className="list-decimal list-inside space-y-1">
                {helpResponse.steps.map((step, i) => (
                  <li key={i} className="text-sm text-[#64748B]">{step}</li>
                ))}
              </ol>
            </div>
          )}

          {helpResponse.categories && (
            <div className="mb-4">
              <h4 className="font-medium text-[#0A3340] mb-2">Categories:</h4>
              <div className="grid grid-cols-2 gap-2">
                {helpResponse.categories.map((cat, i) => (
                  <div key={i} className="p-3 bg-[#F6FAF9] rounded-lg">
                    <p className="font-medium text-[#12576D] text-sm">{cat.name}</p>
                    <p className="text-xs text-[#64748B]">{cat.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {helpResponse.checklist && (
            <div className="mb-4">
              <h4 className="font-medium text-[#0A3340] mb-2">Checklist:</h4>
              <div className="space-y-1">
                {helpResponse.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-[#64748B]">
                    <Check size={14} className="text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'dashboard': return renderDashboard();
      case 'policies': return renderPolicies();
      case 'changes': return renderChanges();
      case 'approvals': return renderApprovals();
      case 'features': return renderFeatures();
      case 'risks': return renderRisks();
      case 'releases': return renderReleases();
      case 'compliance': return renderCompliance();
      case 'audit': return renderAudit();
      case 'help': return renderHelp();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF7F5]">
      {/* Header */}
      <header className="bg-white border-b border-[#D7E7E4] sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A3340] to-[#12576d] flex items-center justify-center">
                  <Shield size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#0A3340]">Governance Studio</h1>
                  <p className="text-xs text-[#64748B]">Enterprise Governance Platform</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                {dashboard?.summary?.complianceScore || 94}% Compliant
              </div>
              <button onClick={loadData} className="p-2 hover:bg-[#EEF7F5] rounded-lg">
                <RefreshCw size={20} className="text-[#64748B]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-[#D7E7E4] min-h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[#0A3340] text-white' : 'text-[#64748B] hover:bg-[#EEF7F5]'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{mod.label}</span>
                  {isActive && <ChevronRight size={16} className="ml-auto" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {renderModuleContent()}
        </main>
      </div>
    </div>
  );
}
