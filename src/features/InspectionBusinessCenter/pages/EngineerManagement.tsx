// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - ENGINEER MANAGEMENT
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users,
  User,
  Plus,
  Search,
  Star,
  Clock,
  MapPin,
  Award,
  Phone,
  Mail,
  MoreVertical,
  Check,
  X,
  Calendar,
  TrendingUp,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
};

const ENGINEER_ROLES = {
  lead_engineer: 'Lead Engineer',
  senior_inspector: 'Senior Inspector',
  junior_inspector: 'Junior Inspector',
  electrical_specialist: 'Electrical Specialist',
  body_specialist: 'Body Specialist',
  commercial_specialist: 'Commercial Specialist',
  motorcycle_specialist: 'Motorcycle Specialist',
  qa_reviewer: 'QA Reviewer',
};

const ROLE_COLORS: Record<string, string> = {
  lead_engineer: '#3b82f6',
  senior_inspector: '#10b981',
  junior_inspector: '#6b7280',
  electrical_specialist: '#f59e0b',
  body_specialist: '#8b5cf6',
  commercial_specialist: '#ec4899',
  motorcycle_specialist: '#14b8a6',
  qa_reviewer: '#ef4444',
};

// Sample engineers
const SAMPLE_ENGINEERS = [
  { id: 'e1', firstName: 'David', lastName: 'Maina', email: 'david@autoinspect.co.ke', phone: '+254712345678', role: 'lead_engineer', isAvailable: true, inspectionCount: 245, averageRating: 4.8, avgInspectionTime: 75, onTimeRate: 96, qualityScore: 98, yearsExperience: 8, skills: ['pre_purchase', 'dealer', 'fleet'], vehicleTypes: ['cars', 'suvs', 'trucks'], location: { county: 'Nairobi', town: 'Westlands' } },
  { id: 'e2', firstName: 'Faith', lastName: 'Njeri', email: 'faith@autoinspect.co.ke', phone: '+254723456789', role: 'senior_inspector', isAvailable: true, inspectionCount: 189, averageRating: 4.7, avgInspectionTime: 80, onTimeRate: 94, qualityScore: 96, yearsExperience: 5, skills: ['pre_purchase', 'auction'], vehicleTypes: ['cars', 'suvs'], location: { county: 'Kiambu', town: 'Thika' } },
  { id: 'e3', firstName: 'James', lastName: 'Ochieng', email: 'james@autoinspect.co.ke', phone: '+254734567890', role: 'junior_inspector', isAvailable: false, inspectionCount: 67, averageRating: 4.5, avgInspectionTime: 90, onTimeRate: 88, qualityScore: 92, yearsExperience: 2, skills: ['pre_purchase'], vehicleTypes: ['cars'], location: { county: 'Nairobi', town: 'Kilimani' } },
  { id: 'e4', firstName: 'Grace', lastName: 'Wambui', email: 'grace@autoinspect.co.ke', phone: '+254745678901', role: 'electrical_specialist', isAvailable: true, inspectionCount: 134, averageRating: 4.9, avgInspectionTime: 70, onTimeRate: 98, qualityScore: 99, yearsExperience: 6, skills: ['pre_purchase', 'dealer'], vehicleTypes: ['cars', 'suvs'], location: { county: 'Nairobi', town: 'Karen' } },
  { id: 'e5', firstName: 'Michael', lastName: 'Odhiambo', email: 'michael@autoinspect.co.ke', phone: '+254756789012', role: 'commercial_specialist', isAvailable: true, inspectionCount: 98, averageRating: 4.6, avgInspectionTime: 120, onTimeRate: 92, qualityScore: 95, yearsExperience: 4, skills: ['fleet', 'commercial'], vehicleTypes: ['trucks', 'buses'], location: { county: 'Mombasa', town: 'CBD' } },
  { id: 'e6', firstName: 'Lucy', lastName: 'Achieng', email: 'lucy@autoinspect.co.ke', phone: '+254767890123', role: 'qa_reviewer', isAvailable: true, inspectionCount: 0, averageRating: 4.8, avgInspectionTime: 0, onTimeRate: 100, qualityScore: 100, yearsExperience: 7, skills: ['quality'], vehicleTypes: [], location: { county: 'Nairobi', town: 'CBD' } },
];

export default function EngineerManagement({ providerId }: { providerId: string }) {
  const [engineers, setEngineers] = useState(SAMPLE_ENGINEERS);
  const [selectedEngineer, setSelectedEngineer] = useState<typeof SAMPLE_ENGINEERS[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredEngineers = engineers.filter(e => {
    const matchesSearch = searchQuery === '' || 
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || e.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const toggleAvailability = (engineerId: string) => {
    setEngineers(prev => prev.map(e => 
      e.id === engineerId ? { ...e, isAvailable: !e.isAvailable } : e
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Engineer Management
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {engineers.length} team members • {engineers.filter(e => e.isAvailable).length} available
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
        >
          <Plus size={18} />
          Add Engineer
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: KAYAD_COLORS.softBlue }}
          />
          <input
            type="text"
            placeholder="Search engineers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border outline-none"
            style={{ borderColor: KAYAD_COLORS.softBlue }}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={filterRole || ''}
            onChange={(e) => setFilterRole(e.target.value || null)}
            className="px-4 py-2 rounded-lg border outline-none"
            style={{ borderColor: KAYAD_COLORS.softBlue }}
          >
            <option value="">All Roles</option>
            {Object.entries(ENGINEER_ROLES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <div className="flex rounded-lg overflow-hidden" style={{ borderColor: KAYAD_COLORS.softBlue }}>
            <button
              onClick={() => setViewMode('grid')}
              className="px-3 py-2"
              style={{ backgroundColor: viewMode === 'grid' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white }}
            >
              <Users size={18} style={{ color: viewMode === 'grid' ? KAYAD_COLORS.white : KAYAD_COLORS.softBlue }} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-2"
              style={{ backgroundColor: viewMode === 'list' ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white }}
            >
              <User size={18} style={{ color: viewMode === 'list' ? KAYAD_COLORS.white : KAYAD_COLORS.softBlue }} />
            </button>
          </div>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Engineers" value={engineers.length} />
        <StatCard label="Available" value={engineers.filter(e => e.isAvailable).length} color={KAYAD_COLORS.emerald} />
        <StatCard label="On Inspection" value={engineers.filter(e => !e.isAvailable).length} color={KAYAD_COLORS.mutedTerracotta} />
        <StatCard label="Avg Rating" value={`${(engineers.reduce((a, b) => a + b.averageRating, 0) / engineers.length).toFixed(1)}`} color={KAYAD_COLORS.mutedTerracotta} />
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEngineers.map(engineer => (
            <EngineerCard
              key={engineer.id}
              engineer={engineer}
              onSelect={() => setSelectedEngineer(engineer)}
              onToggleAvailability={() => toggleAvailability(engineer.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEngineers.map(engineer => (
            <EngineerListItem
              key={engineer.id}
              engineer={engineer}
              onSelect={() => setSelectedEngineer(engineer)}
              onToggleAvailability={() => toggleAvailability(engineer.id)}
            />
          ))}
        </div>
      )}

      {/* Selected Engineer Detail */}
      {selectedEngineer && (
        <EngineerDetailPanel
          engineer={selectedEngineer}
          onClose={() => setSelectedEngineer(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl p-4 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || KAYAD_COLORS.lightNavy }}>{value}</p>
    </div>
  );
}

function EngineerCard({ engineer, onSelect, onToggleAvailability }: any) {
  const roleColor = ROLE_COLORS[engineer.role] || KAYAD_COLORS.softBlue;
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl overflow-hidden shadow-md cursor-pointer"
      style={{ backgroundColor: KAYAD_COLORS.white }}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: `${roleColor}15` }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: roleColor, color: KAYAD_COLORS.white }}
            >
              {engineer.firstName.charAt(0)}{engineer.lastName.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                {engineer.firstName} {engineer.lastName}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${roleColor}20`, color: roleColor }}>
                {ENGINEER_ROLES[engineer.role]}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleAvailability(); }}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              engineer.isAvailable ? 'text-emerald-600' : 'text-gray-500'
            }`}
            style={{ 
              backgroundColor: engineer.isAvailable ? '#10b98120' : '#6b728020',
              border: `1px solid ${engineer.isAvailable ? KAYAD_COLORS.emerald : '#6b7280'}`
            }}
          >
            {engineer.isAvailable ? <Check size={12} /> : <X size={12} />}
            {engineer.isAvailable ? 'Available' : 'Busy'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Inspections</p>
            <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.inspectionCount}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Rating</p>
            <div className="flex items-center gap-1">
              <Star size={14} fill={KAYAD_COLORS.mutedTerracotta} color={KAYAD_COLORS.mutedTerracotta} />
              <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.averageRating.toFixed(1)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>On-Time</p>
            <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.onTimeRate}%</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Quality</p>
            <p className="font-semibold" style={{ color: KAYAD_COLORS.emerald }}>{engineer.qualityScore}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {engineer.skills.slice(0, 3).map((skill: string) => (
            <span key={skill} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
              {skill.replace('_', ' ')}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {engineer.location.county}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {engineer.yearsExperience} yrs exp
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function EngineerListItem({ engineer, onSelect, onToggleAvailability }: any) {
  const roleColor = ROLE_COLORS[engineer.role] || KAYAD_COLORS.softBlue;
  
  return (
    <div 
      className="flex items-center justify-between p-4 rounded-xl shadow-md cursor-pointer hover:shadow-lg"
      style={{ backgroundColor: KAYAD_COLORS.white }}
      onClick={onSelect}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: roleColor, color: KAYAD_COLORS.white }}
        >
          {engineer.firstName.charAt(0)}{engineer.lastName.charAt(0)}
        </div>
        <div>
          <h3 className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {engineer.firstName} {engineer.lastName}
          </h3>
          <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>
            {ENGINEER_ROLES[engineer.role]} • {engineer.location.county}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
            {engineer.inspectionCount} inspections
          </p>
          <div className="flex items-center gap-1 justify-end">
            <Star size={12} fill={KAYAD_COLORS.mutedTerracotta} color={KAYAD_COLORS.mutedTerracotta} />
            <span className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{engineer.averageRating.toFixed(1)}</span>
          </div>
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onToggleAvailability(); }}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            engineer.isAvailable ? 'text-emerald-600' : 'text-gray-500'
          }`}
          style={{ backgroundColor: engineer.isAvailable ? '#10b98120' : '#6b728020' }}
        >
          {engineer.isAvailable ? 'Available' : 'Busy'}
        </button>
        
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <MoreVertical size={16} style={{ color: KAYAD_COLORS.softBlue }} />
        </button>
      </div>
    </div>
  );
}

function EngineerDetailPanel({ engineer, onClose }: { engineer: any; onClose: () => void }) {
  const roleColor = ROLE_COLORS[engineer.role] || KAYAD_COLORS.softBlue;
  
  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 h-full w-96 shadow-xl overflow-y-auto z-50"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ backgroundColor: roleColor, color: KAYAD_COLORS.white }}
            >
              {engineer.firstName.charAt(0)}{engineer.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                {engineer.firstName} {engineer.lastName}
              </h2>
              <span className="text-sm" style={{ color: roleColor }}>
                {ENGINEER_ROLES[engineer.role]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} style={{ color: KAYAD_COLORS.softBlue }} />
          </button>
        </div>

        {/* Contact */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <Mail size={16} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={16} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{engineer.location.town}, {engineer.location.county}</span>
          </div>
        </div>

        {/* Performance */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Performance</h3>
          <div className="grid grid-cols-2 gap-4">
            <PerformanceMetric label="Total Inspections" value={engineer.inspectionCount} />
            <PerformanceMetric label="Avg Rating" value={`${engineer.averageRating.toFixed(1)} ★`} />
            <PerformanceMetric label="On-Time Rate" value={`${engineer.onTimeRate}%`} />
            <PerformanceMetric label="Quality Score" value={`${engineer.qualityScore}%`} color={KAYAD_COLORS.emerald} />
            <PerformanceMetric label="Avg Duration" value={`${engineer.avgInspectionTime} min`} />
            <PerformanceMetric label="Experience" value={`${engineer.yearsExperience} years`} />
          </div>
        </div>

        {/* Skills */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Skills</h3>
          <div className="flex flex-wrap gap-2">
            {engineer.skills.map((skill: string) => (
              <span key={skill} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                {skill.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Vehicle Types */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Vehicle Types</h3>
          <div className="flex flex-wrap gap-2">
            {engineer.vehicleTypes.map((type: string) => (
              <span key={type} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
            View Schedule
          </button>
          <button className="w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
            Edit Profile
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PerformanceMetric({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      <p className="text-xs mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: color || KAYAD_COLORS.lightNavy }}>{value}</p>
    </div>
  );
}
