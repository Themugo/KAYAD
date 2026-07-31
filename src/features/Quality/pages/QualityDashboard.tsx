// ============================================================
// KAYAD ENTERPRISE QUALITY ENGINEERING PLATFORM
// QUALITY DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Play,
  RefreshCw,
  FileText,
  Bug,
  TestTube,
  BarChart3,
  Lock,
  Zap,
  Users,
  Target,
  ArrowRight,
  ChevronRight,
  Layers,
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

// Sample data
const TEST_SUITES = [
  { code: 'marketplace', name: 'Marketplace', tests: 245, passed: 242, failed: 3, coverage: 94 },
  { code: 'dealer', name: 'Dealer Portal', tests: 156, passed: 156, failed: 0, coverage: 98 },
  { code: 'auction', name: 'Auction Engine', tests: 189, passed: 185, failed: 4, coverage: 91 },
  { code: 'inspection', name: 'Inspection', tests: 124, passed: 120, failed: 4, coverage: 88 },
  { code: 'finance', name: 'Finance', tests: 98, passed: 98, failed: 0, coverage: 96 },
  { code: 'identity', name: 'Identity', tests: 178, passed: 175, failed: 3, coverage: 92 },
];

const QUALITY_GATES = [
  { name: 'Code Review', status: 'passed', score: 100, order: 1 },
  { name: 'Static Analysis', status: 'passed', score: 95, order: 2 },
  { name: 'Unit Tests', status: 'passed', score: 94, order: 3 },
  { name: 'Integration Tests', status: 'passed', score: 92, order: 4 },
  { name: 'API Tests', status: 'passed', score: 97, order: 5 },
  { name: 'Security Scan', status: 'warning', score: 88, order: 6 },
  { name: 'Performance Tests', status: 'passed', score: 95, order: 7 },
  { name: 'UAT', status: 'pending', score: 0, order: 8 },
];

const RECENT_RELEASES = [
  { version: 'v2.4.1', status: 'deployed', date: '2026-07-28', tests: 892, passed: 886 },
  { version: 'v2.4.0', status: 'deployed', date: '2026-07-21', tests: 945, passed: 940 },
  { version: 'v2.3.9', status: 'deployed', date: '2026-07-14', tests: 867, passed: 867 },
];

const DEFECTS = [
  { id: 1, title: 'Auction bid confirmation delay', severity: 'high', status: 'in_progress', module: 'auction' },
  { id: 2, title: 'Image upload timeout on mobile', severity: 'medium', status: 'open', module: 'marketplace' },
  { id: 3, title: 'Report export formatting error', severity: 'medium', status: 'open', module: 'inspection' },
];

const PERFORMANCE_BENCHMARKS = [
  { name: 'API Response (P95)', value: 145, target: 200, unit: 'ms' },
  { name: 'Page Load', value: 1.2, target: 2.0, unit: 's' },
  { name: 'Search Latency', value: 78, target: 100, unit: 'ms' },
  { name: 'Database Query', value: 12, target: 50, unit: 'ms' },
];

export default function QualityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'gates' | 'tests' | 'releases'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield size={18} /> },
    { id: 'gates', label: 'Quality Gates', icon: <Lock size={18} /> },
    { id: 'tests', label: 'Test Suites', icon: <TestTube size={18} /> },
    { id: 'releases', label: 'Releases', icon: <FileText size={18} /> },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return KAYAD_COLORS.emerald;
      case 'failed': return KAYAD_COLORS.red;
      case 'warning': return KAYAD_COLORS.amber;
      case 'pending': return KAYAD_COLORS.softBlue;
      default: return KAYAD_COLORS.softBlue;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return KAYAD_COLORS.red;
      case 'high': return KAYAD_COLORS.amber;
      case 'medium': return KAYAD_COLORS.purple;
      case 'low': return KAYAD_COLORS.softBlue;
      default: return KAYAD_COLORS.softBlue;
    }
  };

  const totalTests = TEST_SUITES.reduce((sum, s) => sum + s.tests, 0);
  const passedTests = TEST_SUITES.reduce((sum, s) => sum + s.passed, 0);
  const failedTests = TEST_SUITES.reduce((sum, s) => sum + s.failed, 0);
  const avgCoverage = TEST_SUITES.reduce((sum, s) => sum + s.coverage, 0) / TEST_SUITES.length;
  const passRate = (passedTests / totalTests * 100).toFixed(1);

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
                <h1 className="text-xl font-bold text-white">Quality Engineering</h1>
                <p className="text-sm opacity-80">Enterprise Release Quality Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                <CheckCircle size={16} />
                All Gates Passing
              </span>
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                <Play size={16} />
                Run Tests
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
                { label: 'Total Tests', value: totalTests, icon: <TestTube size={20} />, change: '+12' },
                { label: 'Passed', value: passedTests, icon: <CheckCircle size={20} />, change: '+10', color: KAYAD_COLORS.emerald },
                { label: 'Failed', value: failedTests, icon: <XCircle size={20} />, change: '-2', color: KAYAD_COLORS.red },
                { label: 'Pass Rate', value: `${passRate}%`, icon: <Target size={20} />, change: '+2.1%' },
                { label: 'Coverage', value: `${avgCoverage.toFixed(0)}%`, icon: <BarChart3 size={20} />, change: '+1.5%' },
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
                  <p className="text-2xl font-bold" style={{ color: metric.color || KAYAD_COLORS.lightNavy }}>
                    {metric.value}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {metric.change.startsWith('+') ? (
                      <TrendingUp size={14} style={{ color: KAYAD_COLORS.emerald }} />
                    ) : (
                      <TrendingDown size={14} style={{ color: KAYAD_COLORS.red }} />
                    )}
                    <span className="text-xs" style={{ color: metric.change.startsWith('+') ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                      {metric.change}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quality Gates Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Quality Gates Status</h3>
                <div className="space-y-3">
                  {QUALITY_GATES.map((gate) => (
                    <div key={gate.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getStatusColor(gate.status)}20` }}>
                          {gate.status === 'passed' ? (
                            <CheckCircle size={16} style={{ color: getStatusColor(gate.status) }} />
                          ) : gate.status === 'failed' ? (
                            <XCircle size={16} style={{ color: getStatusColor(gate.status) }} />
                          ) : gate.status === 'warning' ? (
                            <AlertTriangle size={16} style={{ color: getStatusColor(gate.status) }} />
                          ) : (
                            <Clock size={16} style={{ color: getStatusColor(gate.status) }} />
                          )}
                        </div>
                        <span style={{ color: KAYAD_COLORS.lightNavy }}>{gate.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {gate.score > 0 && (
                          <span className="font-medium" style={{ color: getStatusColor(gate.status) }}>
                            {gate.score}%
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${getStatusColor(gate.status)}20`, color: getStatusColor(gate.status) }}>
                          {gate.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open Defects */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Open Defects</h3>
                <div className="space-y-3">
                  {DEFECTS.map((defect) => (
                    <div key={defect.id} className="flex items-start justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-start gap-3">
                        <Bug size={18} style={{ color: getSeverityColor(defect.severity), marginTop: 2 }} />
                        <div>
                          <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{defect.title}</p>
                          <p className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{defect.module}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${getSeverityColor(defect.severity)}20`, color: getSeverityColor(defect.severity) }}>
                          {defect.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                          {defect.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full py-2 rounded-lg font-medium flex items-center justify-center gap-2" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                  View All Defects
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Performance Benchmarks */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Performance Benchmarks</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PERFORMANCE_BENCHMARKS.map((benchmark) => (
                  <div key={benchmark.name} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <p className="text-sm mb-2" style={{ color: KAYAD_COLORS.softBlue }}>{benchmark.name}</p>
                    <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                      {benchmark.value}{benchmark.unit}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Target: {benchmark.target}{benchmark.unit}</span>
                      <span className="text-xs font-medium" style={{ color: benchmark.value <= benchmark.target ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
                        {benchmark.value <= benchmark.target ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quality Gates Tab */}
        {activeTab === 'gates' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Release Quality Gates</h3>
                <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                  <RefreshCw size={16} />
                  Run All Gates
                </button>
              </div>

              <div className="space-y-4">
                {QUALITY_GATES.map((gate, index) => (
                  <motion.div
                    key={gate.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border-2"
                    style={{ 
                      borderColor: gate.status === 'passed' ? KAYAD_COLORS.emerald : 
                                   gate.status === 'failed' ? KAYAD_COLORS.red :
                                   gate.status === 'warning' ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue,
                      backgroundColor: KAYAD_COLORS.white
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${getStatusColor(gate.status)}20` }}>
                          <Layers size={20} style={{ color: getStatusColor(gate.status) }} />
                        </div>
                        <div>
                          <h4 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{gate.name}</h4>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Order: {gate.order}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {gate.score > 0 && (
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color: getStatusColor(gate.status) }}>{gate.score}%</p>
                            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Pass: 90%</p>
                          </div>
                        )}
                        <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                          Run
                        </button>
                      </div>
                    </div>
                    {index < QUALITY_GATES.length - 1 && (
                      <div className="mt-4 flex justify-center">
                        <ArrowRight size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Suites Tab */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {TEST_SUITES.map((suite, i) => (
                <motion.div
                  key={suite.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-6 shadow-md"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.purple}20` }}>
                        <TestTube size={24} style={{ color: KAYAD_COLORS.purple }} />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{suite.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{suite.tests} tests</span>
                          <span className="text-sm flex items-center gap-1" style={{ color: KAYAD_COLORS.emerald }}>
                            <CheckCircle size={14} /> {suite.passed} passed
                          </span>
                          {suite.failed > 0 && (
                            <span className="text-sm flex items-center gap-1" style={{ color: KAYAD_COLORS.red }}>
                              <XCircle size={14} /> {suite.failed} failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Coverage</p>
                        <p className="text-lg font-bold" style={{ color: suite.coverage >= 90 ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber }}>
                          {suite.coverage}%
                        </p>
                      </div>
                      <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                        <Play size={16} />
                        Run Suite
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(suite.passed / suite.tests) * 100}%`,
                        backgroundColor: suite.failed > 0 ? KAYAD_COLORS.amber : KAYAD_COLORS.emerald
                      }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Releases Tab */}
        {activeTab === 'releases' && (
          <div className="space-y-6">
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Releases</h3>
              <div className="space-y-4">
                {RECENT_RELEASES.map((release) => (
                  <div key={release.version} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20` }}>
                        <FileText size={20} style={{ color: KAYAD_COLORS.emerald }} />
                      </div>
                      <div>
                        <h4 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{release.version}</h4>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{release.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{release.passed}/{release.tests} tests</p>
                        <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.emerald }}>
                          {((release.passed / release.tests) * 100).toFixed(1)}% pass rate
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium capitalize" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                        {release.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
              <FileText size={18} />
              Create New Release
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
