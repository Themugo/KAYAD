// ============================================================
// KAYAD VEHICLE OWNERSHIP PLATFORM
// MY GARAGE - OWNER DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  Warehouse,
  Wrench,
  Bell,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  Fuel,
  Shield,
  ClipboardCheck,
  Heart,
  Eye,
  ArrowRight,
  ChevronRight,
  Plus,
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
};

// Sample owner data
const SAMPLE_OWNER = {
  name: 'James Karanja',
  ownerSince: '2021-03-15',
  totalVehicles: 2,
};

const SAMPLE_VEHICLES = [
  {
    id: 'v1',
    make: 'Toyota',
    model: 'Land Cruiser',
    year: 2020,
    vin: 'JTMCVREV0LD123456',
    registration: 'KBZ 123A',
    colour: 'Black',
    mileage: 45230,
    purchasePrice: 8500000,
    currentValue: 7200000,
    valueChange: -5.2,
    insuranceExpiry: '2024-03-15',
    insuranceStatus: 'active',
    financeStatus: 'paid_off',
    healthScore: 92,
    nextService: '2024-02-15',
    lastInspection: '2024-01-10',
    grade: 'A-',
  },
  {
    id: 'v2',
    make: 'Mercedes-Benz',
    model: 'C-Class',
    year: 2021,
    vin: 'WDD2050231R123456',
    registration: 'KBZ 456B',
    colour: 'Silver',
    mileage: 28000,
    purchasePrice: 5200000,
    currentValue: 4500000,
    valueChange: -3.1,
    insuranceExpiry: '2024-02-28',
    insuranceStatus: 'active',
    financeStatus: 'active',
    financeRemaining: 1200000,
    healthScore: 88,
    nextService: '2024-03-01',
    lastInspection: '2024-01-05',
    grade: 'A',
  },
];

const UPCOMING_REMINDERS = [
  { id: 1, vehicle: 'Toyota Land Cruiser', type: 'service', title: 'Routine Service Due', dueDate: '2024-02-15', urgent: false },
  { id: 2, vehicle: 'Mercedes C-Class', type: 'insurance', title: 'Insurance Renewal', dueDate: '2024-02-28', urgent: true },
  { id: 3, vehicle: 'Toyota Land Cruiser', type: 'inspection', title: 'Roadworthy Renewal', dueDate: '2024-03-10', urgent: false },
];

const RECENT_SERVICES = [
  { id: 1, vehicle: 'Toyota Land Cruiser', type: 'Oil Change', date: '2024-01-15', cost: 15000, mileage: 45000 },
  { id: 2, vehicle: 'Mercedes C-Class', type: 'Brake Service', date: '2024-01-20', cost: 28000, mileage: 27500 },
];

const EXPENSE_SUMMARY = {
  monthly: 145000,
  yearly: 1740000,
  byCategory: {
    fuel: 45000,
    maintenance: 35000,
    insurance: 40000,
    finance: 25000,
  },
};

const ALERTS = [
  { id: 1, type: 'recall', title: 'Safety Recall Notice', vehicle: 'Toyota Land Cruiser', severity: 'high' },
  { id: 2, type: 'value', title: 'Market value increased 3%', vehicle: 'Mercedes C-Class', severity: 'info' },
];

export default function OwnerGarage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'reminders' | 'documents' | 'expenses'>('overview');
  const [selectedVehicle, setSelectedVehicle] = useState<typeof SAMPLE_VEHICLES[0] | null>(null);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Warehouse size={18} /> },
    { id: 'vehicles', label: 'My Vehicles', icon: <Car size={18} /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell size={18} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
    { id: 'expenses', label: 'Expenses', icon: <DollarSign size={18} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Warehouse size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">My Garage</h1>
                <p className="text-sm opacity-80">Vehicle Ownership Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 rounded-lg font-medium flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: KAYAD_COLORS.white }}>
                <Plus size={18} />
                Add Vehicle
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
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickStatCard icon={<Car size={24} />} label="My Vehicles" value="2" />
              <QuickStatCard icon={<Wrench size={24} />} label="This Month" value="KES 145K" />
              <QuickStatCard icon={<Bell size={24} />} label="Reminders" value="3" urgent />
              <QuickStatCard icon={<AlertTriangle size={24} />} label="Alerts" value="1" urgent />
            </div>

            {/* Vehicles Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {SAMPLE_VEHICLES.map(vehicle => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-6 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: KAYAD_COLORS.white }}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  {/* Vehicle Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {vehicle.registration} • {vehicle.colour}
                      </p>
                    </div>
                    <div className="text-right">
                      <div 
                        className="text-2xl font-bold flex items-center gap-1"
                        style={{ color: vehicle.valueChange < 0 ? KAYAD_COLORS.red : KAYAD_COLORS.emerald }}
                      >
                        {vehicle.valueChange < 0 ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                        {Math.abs(vehicle.valueChange)}%
                      </div>
                      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>vs purchase</p>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Current Value</p>
                        <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          KES {(vehicle.currentValue / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Mileage</p>
                        <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                          {vehicle.mileage.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <StatusBadge 
                      icon={<Shield size={14} />}
                      label={vehicle.insuranceStatus === 'active' ? 'Insured' : 'Insurance Expired'}
                      active={vehicle.insuranceStatus === 'active'}
                    />
                    <StatusBadge 
                      icon={<ClipboardCheck size={14} />}
                      label={`Grade ${vehicle.grade}`}
                      active={true}
                    />
                    <StatusBadge 
                      icon={<Wrench size={14} />}
                      label={`Health ${vehicle.healthScore}%`}
                      active={vehicle.healthScore >= 80}
                    />
                  </div>

                  {/* Next Actions */}
                  <div className="flex justify-between items-center pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} style={{ color: KAYAD_COLORS.softBlue }} />
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        Service: {vehicle.nextService}
                      </span>
                    </div>
                    <button className="flex items-center gap-1 text-sm font-medium" style={{ color: KAYAD_COLORS.emerald }}>
                      View Details <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Upcoming Reminders */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Upcoming Reminders</h3>
                <button className="text-sm font-medium" style={{ color: KAYAD_COLORS.emerald }}>
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {UPCOMING_REMINDERS.map(reminder => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 rounded-lg"
                    style={{ backgroundColor: reminder.urgent ? `${KAYAD_COLORS.amber}10` : KAYAD_COLORS.warmBeige }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: reminder.urgent ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.lightNavy}15` }}
                      >
                        <Bell size={18} style={{ color: reminder.urgent ? KAYAD_COLORS.amber : KAYAD_COLORS.lightNavy }} />
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{reminder.title}</p>
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{reminder.vehicle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium" style={{ color: reminder.urgent ? KAYAD_COLORS.amber : KAYAD_COLORS.softBlue }}>
                        {reminder.dueDate}
                      </p>
                      {reminder.urgent && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${KAYAD_COLORS.amber}20`, color: KAYAD_COLORS.amber }}>
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            {ALERTS.length > 0 && (
              <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Alerts</h3>
                <div className="space-y-3">
                  {ALERTS.map(alert => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border-l-4"
                      style={{ 
                        backgroundColor: alert.severity === 'high' ? `${KAYAD_COLORS.red}08` : `${KAYAD_COLORS.softBlue}08`,
                        borderLeftColor: alert.severity === 'high' ? KAYAD_COLORS.red : KAYAD_COLORS.softBlue
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{alert.title}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{alert.vehicle}</p>
                        </div>
                        <button className="px-3 py-1 rounded text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.lightNavy, color: KAYAD_COLORS.white }}>
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>My Vehicles</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                <Plus size={18} />
                Add Vehicle
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SAMPLE_VEHICLES.map(vehicle => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Service Reminders</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ReminderCard type="service" title="Routine Service" icon={<Wrench size={24} />} />
              <ReminderCard type="insurance" title="Insurance Renewal" icon={<Shield size={24} />} />
              <ReminderCard type="inspection" title="Roadworthy Inspection" icon={<ClipboardCheck size={24} />} />
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Document Vault</h2>
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DocumentCard type="logbook" label="Logbook" />
                <DocumentCard type="insurance" label="Insurance" />
                <DocumentCard type="inspection" label="Inspection" />
                <DocumentCard type="finance" label="Finance" />
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Expense Tracker</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ExpenseCard label="This Month" amount={EXPENSE_SUMMARY.monthly} />
              <ExpenseCard label="This Year" amount={EXPENSE_SUMMARY.yearly} />
              <ExpenseCard label="Fuel" amount={EXPENSE_SUMMARY.byCategory.fuel} />
              <ExpenseCard label="Maintenance" amount={EXPENSE_SUMMARY.byCategory.maintenance} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components
function QuickStatCard({ icon, label, value, urgent }: { icon: React.ReactNode; label: string; value: string; urgent?: boolean }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: urgent ? `${KAYAD_COLORS.amber}20` : `${KAYAD_COLORS.softBlue}15` }}
        >
          {icon}
        </div>
        {urgent && (
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: KAYAD_COLORS.amber }} />
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
    </motion.div>
  );
}

function StatusBadge({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span 
      className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
      style={{ 
        backgroundColor: active ? `${KAYAD_COLORS.emerald}15` : `${KAYAD_COLORS.red}15`,
        color: active ? KAYAD_COLORS.emerald : KAYAD_COLORS.red
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function VehicleCard({ vehicle }: { vehicle: typeof SAMPLE_VEHICLES[0] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="h-32" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="h-full flex items-center justify-center">
          <Car size={64} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-sm mb-4" style={{ color: KAYAD_COLORS.softBlue }}>
          {vehicle.registration} • {vehicle.mileage.toLocaleString()} km
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Current Value</p>
            <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
              KES {(vehicle.currentValue / 1000000).toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Health Score</p>
            <p className="font-semibold" style={{ color: KAYAD_COLORS.emerald }}>
              {vehicle.healthScore}%
            </p>
          </div>
        </div>
        <button className="w-full py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
          View Details
        </button>
      </div>
    </motion.div>
  );
}

function ReminderCard({ type, title, icon }: { type: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15` }}>
        {icon}
      </div>
      <h4 className="font-semibold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{title}</h4>
      <p className="text-sm mb-4" style={{ color: KAYAD_COLORS.softBlue }}>Next: March 15, 2024</p>
      <button className="w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
        View Schedule
      </button>
    </div>
  );
}

function DocumentCard({ type, label }: { type: string; label: string }) {
  return (
    <div className="p-4 rounded-lg border-2 border-dashed text-center cursor-pointer hover:border-solid transition-all" style={{ borderColor: KAYAD_COLORS.softBlue }}>
      <FileText size={32} className="mx-auto mb-2" style={{ color: KAYAD_COLORS.softBlue }} />
      <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{label}</p>
      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{type}</p>
    </div>
  );
}

function ExpenseCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
        KES {amount.toLocaleString()}
      </p>
    </div>
  );
}
