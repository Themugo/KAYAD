// ============================================================
// KAYAD ENTERPRISE IDENTITY & ACCESS MANAGEMENT
// SECURITY DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Users,
  Key,
  Smartphone,
  Fingerprint,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  Clock,
  MapPin,
  Monitor,
  Tablet,
  Smartphone as MobilePhone,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Bell,
  TrendingUp,
  TrendingDown,
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
  orange: '#ea580c',
};

// Sample data
const SECURITY_STATS = {
  failedLogins: 23,
  successfulLogins: 1247,
  lockedAccounts: 3,
  suspiciousAttempts: 5,
  mfaEnabled: 892,
  mfaTotal: 1240,
  mfaPercentage: 72,
};

const ACTIVE_SESSIONS = [
  { id: 1, device: 'Chrome on Windows', location: 'Nairobi, Kenya', ip: '197.232.61.x', lastActivity: '2 min ago', current: true },
  { id: 2, device: 'Safari on iPhone', location: 'Mombasa, Kenya', ip: '197.232.45.x', lastActivity: '15 min ago', current: false },
  { id: 3, device: 'Chrome on MacOS', location: 'Kisumu, Kenya', ip: '197.232.78.x', lastActivity: '1 hour ago', current: false },
];

const RECENT_LOGINS = [
  { id: 1, email: 'james.k@example.com', ip: '197.232.61.x', location: 'Nairobi, Kenya', success: true, time: '5 min ago', device: 'Chrome/Windows' },
  { id: 2, email: 'sarah.m@example.com', ip: '41.90.x.x', location: 'Mombasa, Kenya', success: false, time: '12 min ago', device: 'Safari/iOS', reason: 'Invalid password' },
  { id: 3, email: 'admin@kayad.co.ke', ip: '197.232.61.x', location: 'Nairobi, Kenya', success: true, time: '20 min ago', device: 'Chrome/Windows' },
  { id: 4, email: 'dealer@example.com', ip: '105.x.x.x', location: 'Kisumu, Kenya', success: false, time: '45 min ago', device: 'Firefox/Linux', reason: 'Account locked' },
];

const SECURITY_ALERTS = [
  { id: 1, severity: 'high', title: 'Multiple failed login attempts', description: '5 failed attempts from IP 105.x.x.x in the last hour', time: '45 min ago' },
  { id: 2, severity: 'medium', title: 'New device login', description: 'New device detected for user dealer@example.com', time: '1 hour ago' },
  { id: 3, severity: 'low', title: 'Password policy update', description: 'System password policy was modified', time: '2 hours ago' },
];

const MFA_DEVICES = [
  { id: 1, type: 'authenticator', name: 'Authenticator App', status: 'active', lastUsed: '2 min ago' },
  { id: 2, type: 'sms', name: 'SMS to 0712 xxx xxxx', status: 'active', lastUsed: '1 day ago' },
];

const PERMISSIONS = [
  { code: 'vehicles.view', name: 'View Vehicles', category: 'Marketplace' },
  { code: 'vehicles.create', name: 'Create Vehicles', category: 'Marketplace' },
  { code: 'dealer.manage', name: 'Manage Dealer', category: 'Dealer' },
  { code: 'auctions.view', name: 'View Auctions', category: 'Auction' },
  { code: 'inspection.approve', name: 'Approve Inspections', category: 'Inspection' },
];

const ROLES = [
  { name: 'Dealer Owner', permissions: 5, users: 12 },
  { name: 'Sales Executive', permissions: 3, users: 45 },
  { name: 'Finance Officer', permissions: 4, users: 8 },
];

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'access' | 'policies'>('overview');
  const [showPassword, setShowPassword] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Shield size={18} /> },
    { id: 'sessions', label: 'Sessions', icon: <Monitor size={18} /> },
    { id: 'access', label: 'Access Control', icon: <Key size={18} /> },
    { id: 'policies', label: 'Policies', icon: <Settings size={18} /> },
  ];

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
                <h1 className="text-xl font-bold text-white">Identity & Access Management</h1>
                <p className="text-sm opacity-80">Security & Access Control</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: KAYAD_COLORS.white }}>
                <Bell size={18} />
                Alerts
                {SECURITY_ALERTS.filter(a => a.severity === 'high').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: KAYAD_COLORS.red }}>
                    {SECURITY_ALERTS.filter(a => a.severity === 'high').length}
                  </span>
                )}
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
            {/* Security Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SecurityStatCard
                icon={<XCircle size={24} />}
                label="Failed Logins"
                value={SECURITY_STATS.failedLogins}
                subValue="Last 24h"
                alert
              />
              <SecurityStatCard
                icon={<CheckCircle size={24} />}
                label="Successful Logins"
                value={SECURITY_STATS.successfulLogins}
                subValue="Last 24h"
              />
              <SecurityStatCard
                icon={<Lock size={24} />}
                label="Locked Accounts"
                value={SECURITY_STATS.lockedAccounts}
                subValue="Requires attention"
                alert
              />
              <SecurityStatCard
                icon={<Smartphone size={24} />}
                label="MFA Enabled"
                value={`${SECURITY_STATS.mfaPercentage}%`}
                subValue={`${SECURITY_STATS.mfaEnabled}/${SECURITY_STATS.mfaTotal} users`}
              />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Logins */}
              <div className="lg:col-span-2 rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Login Activity</h3>
                <div className="space-y-3">
                  {RECENT_LOGINS.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          login.success ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {login.success ? (
                            <CheckCircle size={20} style={{ color: KAYAD_COLORS.emerald }} />
                          ) : (
                            <XCircle size={20} style={{ color: KAYAD_COLORS.red }} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{login.email}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                            {login.device} • {login.location}
                          </p>
                          {login.reason && (
                            <p className="text-xs" style={{ color: KAYAD_COLORS.red }}>{login.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm" style={{ color: login.success ? KAYAD_COLORS.softBlue : KAYAD_COLORS.red }}>
                          {login.success ? 'Success' : 'Failed'}
                        </p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{login.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Alerts */}
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Security Alerts</h3>
                <div className="space-y-3">
                  {SECURITY_ALERTS.map((alert) => (
                    <div key={alert.id} className="p-4 rounded-lg border-l-4" style={{
                      backgroundColor: alert.severity === 'high' ? `${KAYAD_COLORS.red}08` :
                                     alert.severity === 'medium' ? `${KAYAD_COLORS.amber}08` :
                                     `${KAYAD_COLORS.softBlue}08`,
                      borderLeftColor: alert.severity === 'high' ? KAYAD_COLORS.red :
                                      alert.severity === 'medium' ? KAYAD_COLORS.amber :
                                      KAYAD_COLORS.softBlue,
                    }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</p>
                          <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>{alert.description}</p>
                        </div>
                        <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{alert.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MFA Status */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Multi-Factor Authentication</h3>
                <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                  Add Method
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MFA_DEVICES.map((device) => (
                  <div key={device.id} className="p-4 rounded-lg border-2" style={{ borderColor: KAYAD_COLORS.emerald }}>
                    <div className="flex items-center gap-3 mb-2">
                      {device.type === 'authenticator' ? (
                        <Fingerprint size={24} style={{ color: KAYAD_COLORS.emerald }} />
                      ) : (
                        <Smartphone size={24} style={{ color: KAYAD_COLORS.emerald }} />
                      )}
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{device.name}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                          Active
                        </span>
                      </div>
                    </div>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Last used: {device.lastUsed}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Active Sessions</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.red }}>
                Revoke All Sessions
              </button>
            </div>

            <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <table className="w-full">
                <thead style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Last Activity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  {ACTIVE_SESSIONS.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Monitor size={20} style={{ color: KAYAD_COLORS.softBlue }} />
                          <div>
                            <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{session.device}</p>
                            {session.current && (
                              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                                Current Session
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                          <span style={{ color: KAYAD_COLORS.softBlue }}>{session.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {session.ip}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {session.lastActivity}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: session.current ? `${KAYAD_COLORS.emerald}20` : `${KAYAD_COLORS.softBlue}20`, color: session.current ? KAYAD_COLORS.emerald : KAYAD_COLORS.softBlue }}>
                          {session.current ? 'Active' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!session.current && (
                          <button className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: `${KAYAD_COLORS.red}10`, color: KAYAD_COLORS.red }}>
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Access Tab */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Access Control</h2>

            {/* Roles */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Organization Roles</h3>
                <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                  Create Role
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ROLES.map((role, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{role.name}</h4>
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{role.users} users</span>
                    </div>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{role.permissions} permissions</p>
                    <button className="mt-3 text-sm font-medium" style={{ color: KAYAD_COLORS.emerald }}>
                      Edit Role
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>System Permissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERMISSIONS.map((perm) => (
                  <div key={perm.code} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div>
                      <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{perm.name}</p>
                      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{perm.code}</p>
                    </div>
                    <CheckCircle size={18} style={{ color: KAYAD_COLORS.emerald }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Security Policies</h2>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Password Policy</h3>
              <div className="space-y-4">
                {[
                  { label: 'Minimum Length', value: '12 characters' },
                  { label: 'Require Uppercase', value: 'Yes' },
                  { label: 'Require Numbers', value: 'Yes' },
                  { label: 'Require Special Characters', value: 'Yes' },
                  { label: 'Password Expiry', value: '90 days' },
                  { label: 'Prevent Reuse', value: 'Last 12 passwords' },
                ].map((policy, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>{policy.label}</span>
                    <span className="font-medium" style={{ color: KAYAD_COLORS.softBlue }}>{policy.value}</span>
                  </div>
                ))}
              </div>
              <button className="mt-4 px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                Edit Policy
              </button>
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Session Policy</h3>
              <div className="space-y-4">
                {[
                  { label: 'Session Timeout', value: '8 hours' },
                  { label: 'Max Concurrent Sessions', value: '3 devices' },
                  { label: 'Require MFA for Sensitive Actions', value: 'Yes' },
                  { label: 'Remember Devices', value: '30 days' },
                ].map((policy, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>{policy.label}</span>
                    <span className="font-medium" style={{ color: KAYAD_COLORS.softBlue }}>{policy.value}</span>
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

// Components
function SecurityStatCard({ icon, label, value, subValue, alert }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
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
          style={{ backgroundColor: alert ? `${KAYAD_COLORS.red}15` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
        {alert && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.amber }} />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: alert ? KAYAD_COLORS.red : KAYAD_COLORS.lightNavy }}>{value}</p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        {subValue && (
          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{subValue}</span>
        )}
      </div>
    </motion.div>
  );
}
