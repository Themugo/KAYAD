// ============================================================
// KAYAD DIGITAL VEHICLE PASSPORT™ - MAIN PAGE
// ============================================================

import { useState, type JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Shield,
  Clock,
  FileText,
  Car,
  CheckCircle,
  AlertTriangle,
  Plane,
  User,
  ClipboardCheck,
  Gavel,
  DollarSign,
  Wrench,
  ArrowRightLeft,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Search,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { VehiclePassport, TimelineEvent, VerificationBadge } from '../types/passport';
import { BADGE_DEFINITIONS, EVENT_TYPE_LABELS } from '../types/passport';

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

// Sample passport data
const SAMPLE_PASSPORT: VehiclePassport = {
  id: 'vp-001',
  passportNumber: 'KAYAD-VP-A1B2C3D4',
  vin: 'JTMCVREV0LD123456',
  chassisNumber: 'JTMZV123456789',
  engineNumber: '2GD123456',
  registrationNumber: 'KBZ 123A',
  make: 'Toyota',
  model: 'Land Cruiser',
  trim: 'VX-R',
  year: 2020,
  bodyType: 'SUV',
  colour: 'Black',
  countryOfOrigin: 'Japan',
  engineCapacity: '4.6L',
  fuelType: 'Petrol',
  transmission: 'Automatic',
  driveType: '4WD',
  status: 'active',
  isVerified: true,
  verificationLevel: 'premium',
  trustScore: 87,
  inspectionScore: 92,
  maintenanceScore: 75,
  ownershipScore: 85,
  documentationScore: 80,
  badges: [
    { id: 'b1', passportId: 'vp-001', badgeCode: 'verified_identity', badgeName: 'Verified Identity', awardedAt: '2024-01-01', isActive: true },
    { id: 'b2', passportId: 'vp-001', badgeCode: 'verified_inspection', badgeName: 'Verified Inspection', awardedAt: '2024-01-15', isActive: true },
    { id: 'b3', passportId: 'vp-001', badgeCode: 'verified_ownership', badgeName: 'Verified Ownership', awardedAt: '2024-02-01', isActive: true },
  ],
  timeline: [
    { id: 't1', passportId: 'vp-001', eventType: 'import', eventTitle: 'Vehicle Imported from Japan', eventDate: '2019-06-15', isVerified: true, verifiedSource: 'KRA', createdAt: '2019-06-15' },
    { id: 't2', passportId: 'vp-001', eventType: 'registration', eventTitle: 'First Registration in Kenya', eventDate: '2019-08-20', isVerified: true, verifiedSource: 'NTSA', createdAt: '2019-08-20' },
    { id: 't3', passportId: 'vp-001', eventType: 'ownership_transfer', eventTitle: 'Sold to First Owner', eventDate: '2019-09-01', isVerified: true, verifiedSource: 'KAYAD', createdAt: '2019-09-01' },
    { id: 't4', passportId: 'vp-001', eventType: 'service_record', eventTitle: 'First Service - 10,000km', eventDate: '2020-01-15', isVerified: true, createdAt: '2020-01-15' },
    { id: 't5', passportId: 'vp-001', eventType: 'inspection', eventTitle: 'Pre-Purchase Inspection', eventDate: '2021-03-10', isVerified: true, verifiedSource: 'AutoInspect Kenya', createdAt: '2021-03-10' },
    { id: 't6', passportId: 'vp-001', eventType: 'ownership_transfer', eventTitle: 'Sold to Second Owner', eventDate: '2021-03-20', isVerified: true, verifiedSource: 'KAYAD', createdAt: '2021-03-20' },
    { id: 't7', passportId: 'vp-001', eventType: 'listing', eventTitle: 'Listed on KAYAD Marketplace', eventDate: '2023-06-01', isVerified: true, createdAt: '2023-06-01' },
    { id: 't8', passportId: 'vp-001', eventType: 'auction_listed', eventTitle: 'Listed for Auction', eventDate: '2023-06-15', isVerified: true, verifiedSource: 'COA Auctions', createdAt: '2023-06-15' },
    { id: 't9', passportId: 'vp-001', eventType: 'auction_sold', eventTitle: 'Sold at Auction', eventDate: '2023-06-30', isVerified: true, verifiedSource: 'COA Auctions', createdAt: '2023-06-30' },
    { id: 't10', passportId: 'vp-001', eventType: 'ownership_transfer', eventTitle: 'Third Owner Acquisition', eventDate: '2023-07-05', isVerified: true, verifiedSource: 'KAYAD', createdAt: '2023-07-05' },
  ],
  ownership: [
    { id: 'o1', ownershipNumber: 1, ownershipStart: '2019-08-20', ownershipType: 'dealer', ownerDisplayName: 'Nairobi Auto Imports', isCurrent: false, isVerified: true },
    { id: 'o2', ownershipNumber: 2, ownershipStart: '2019-09-01', ownershipEnd: '2021-03-20', ownershipType: 'private', ownerDisplayName: 'Private Owner', isCurrent: false, isVerified: true },
    { id: 'o3', ownershipNumber: 3, ownershipStart: '2023-07-05', ownershipType: 'corporate', ownerDisplayName: 'ABC Logistics Ltd', isCurrent: true, isVerified: true },
  ],
  inspections: [
    { id: 'i1', inspectionDate: '2021-03-10', inspectionType: 'Pre-Purchase', providerName: 'AutoInspect Kenya', overallScore: 88, overallGrade: 'B+', mechanicalScore: 85, safetyScore: 90, bodyScore: 82, interiorScore: 88, electricalScore: 92, criticalDefects: 0, majorDefects: 2, minorDefects: 5 },
    { id: 'i2', inspectionDate: '2023-07-10', inspectionType: 'Dealer', providerName: 'Premium Auto Checks', overallScore: 92, overallGrade: 'A-', mechanicalScore: 94, safetyScore: 95, bodyScore: 88, interiorScore: 90, electricalScore: 91, criticalDefects: 0, majorDefects: 1, minorDefects: 3 },
  ],
  services: [
    { id: 's1', serviceDate: '2024-01-15', serviceType: 'oil_service', serviceTitle: 'Full Oil Change', workshopName: 'Toyota Service Center', workshopVerified: true, mileageAtService: 45000, serviceCost: 15000, currency: 'KES', isVerified: true },
    { id: 's2', serviceDate: '2023-09-20', serviceType: 'brake_service', serviceTitle: 'Front Brake Pads Replacement', workshopName: 'BrakeTech Kenya', workshopVerified: true, mileageAtService: 38000, serviceCost: 28000, currency: 'KES', isVerified: true },
    { id: 's3', serviceDate: '2023-06-01', serviceType: 'major_overhaul', serviceTitle: 'Pre-Sale Full Service', workshopName: 'Toyota Service Center', workshopVerified: true, mileageAtService: 35000, serviceCost: 75000, currency: 'KES', isVerified: true },
  ],
  accidents: [
    { id: 'a1', accidentDate: '2020-05-12', accidentType: 'minor', description: 'Minor parking dent on rear bumper', repairStatus: 'fully_repaired', isVerified: true },
  ],
  auctions: [],
  finances: [],
  marketplace: [],
  documents: [],
  createdAt: '2021-03-10',
  updatedAt: '2024-01-15',
};

interface DigitalVehiclePassportProps {
  passportId?: string;
  isPublic?: boolean;
}

export default function DigitalVehiclePassport({ passportId, isPublic = false }: DigitalVehiclePassportProps) {
  const [passport] = useState<VehiclePassport>(SAMPLE_PASSPORT);
  const [activeTab, setActiveTab] = useState<'timeline' | 'ownership' | 'inspections' | 'services' | 'documents'>('timeline');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const toggleEvent = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return KAYAD_COLORS.emerald;
    if (score >= 60) return KAYAD_COLORS.amber;
    return KAYAD_COLORS.red;
  };

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, JSX.Element> = {
      import: <Plane size={16} />,
      registration: <FileText size={16} />,
      listing: <Car size={16} />,
      inspection: <ClipboardCheck size={16} />,
      auction_listed: <Gavel size={16} />,
      auction_sold: <Gavel size={16} />,
      ownership_transfer: <ArrowRightLeft size={16} />,
      finance_approved: <DollarSign size={16} />,
      service_record: <Wrench size={16} />,
      maintenance: <Wrench size={16} />,
      accident: <AlertTriangle size={16} />,
      recall: <AlertTriangle size={16} />,
      warranty: <Award size={16} />,
    };
    return icons[eventType] || <Clock size={16} />;
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Shield size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">KAYAD Digital Vehicle Passport™</h1>
                <p className="text-sm opacity-80">Trusted Vehicle Identity</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                {passport.passportNumber}
              </span>
              <div className="p-2 rounded-lg cursor-pointer hover:bg-white/10">
                <QrCode size={24} color={KAYAD_COLORS.white} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Vehicle Header Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="rounded-xl p-6 shadow-lg mb-6"
          style={{ backgroundColor: KAYAD_COLORS.white }}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Vehicle Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-1" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {passport.year} {passport.make} {passport.model}
                  </h2>
                  {passport.trim && (
                    <p className="text-lg" style={{ color: KAYAD_COLORS.softBlue }}>{passport.trim}</p>
                  )}
                  <p className="text-sm mt-2" style={{ color: KAYAD_COLORS.softBlue }}>
                    {passport.registrationNumber} • {passport.vin?.slice(0, 3)}...{passport.vin?.slice(-4)} • {passport.colour}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold" style={{ color: getTrustScoreColor(passport.trustScore) }}>
                    {passport.trustScore}
                  </div>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Trust Score</p>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {passport.badges.map(badge => (
                  <span
                    key={badge.id}
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                    style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}
                  >
                    <CheckCircle size={12} />
                    {badge.badgeName}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 lg:w-80">
              <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Inspections</p>
                <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{passport.inspections.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Owners</p>
                <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{passport.ownership.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Services</p>
                <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{passport.services.length}</p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Events</p>
                <p className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{passport.timeline.length}</p>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Trust Score Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ScoreBar label="Inspection" score={passport.inspectionScore} />
              <ScoreBar label="Maintenance" score={passport.maintenanceScore} />
              <ScoreBar label="Ownership" score={passport.ownershipScore} />
              <ScoreBar label="Documentation" score={passport.documentationScore} />
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'timeline', label: 'Timeline', icon: <History size={18} /> },
            { id: 'ownership', label: 'Ownership', icon: <User size={18} /> },
            { id: 'inspections', label: 'Inspections', icon: <ClipboardCheck size={18} /> },
            { id: 'services', label: 'Services', icon: <Wrench size={18} /> },
            { id: 'documents', label: 'Documents', icon: <FileText size={18} /> },
          ].map(tab => (
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

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <TimelineView
                events={passport.timeline}
                expandedEvents={expandedEvents}
                onToggle={toggleEvent}
                getEventIcon={getEventIcon}
              />
            </motion.div>
          )}

          {activeTab === 'ownership' && (
            <motion.div
              key="ownership"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <OwnershipView ownership={passport.ownership} />
            </motion.div>
          )}

          {activeTab === 'inspections' && (
            <motion.div
              key="inspections"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <InspectionsView inspections={passport.inspections} />
            </motion.div>
          )}

          {activeTab === 'services' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ServicesView services={passport.services} />
            </motion.div>
          )}

          {activeTab === 'documents' && (
            <motion.div
              key="documents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DocumentsView documents={passport.documents} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Score Bar Component
function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 80) return KAYAD_COLORS.emerald;
    if (s >= 60) return KAYAD_COLORS.amber;
    return KAYAD_COLORS.red;
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: getColor(score) }}>{score}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: getColor(score) }}
        />
      </div>
    </div>
  );
}

// Timeline View Component
function TimelineView({
  events,
  expandedEvents,
  onToggle,
  getEventIcon,
}: {
  events: TimelineEvent[];
  expandedEvents: Set<string>;
  onToggle: (id: string) => void;
  getEventIcon: (type: string) => JSX.Element;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Vehicle Timeline</h2>
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5" style={{ backgroundColor: KAYAD_COLORS.warmBeige }} />

        {events.map((event, index) => {
          const isExpanded = expandedEvents.has(event.id);
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-14 pb-6"
            >
              {/* Timeline Node */}
              <div
                className="absolute left-3 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ 
                  backgroundColor: event.isVerified ? KAYAD_COLORS.emerald : KAYAD_COLORS.softBlue,
                  color: KAYAD_COLORS.white,
                }}
              >
                {getEventIcon(event.eventType)}
              </div>

              {/* Event Card */}
              <div
                className="rounded-lg p-4 cursor-pointer transition-shadow hover:shadow-md"
                style={{ backgroundColor: KAYAD_COLORS.white }}
                onClick={() => onToggle(event.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                      </h3>
                      {event.isVerified && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: KAYAD_COLORS.emerald }}>
                          <CheckCircle size={12} />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                      {event.eventTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                      {new Date(event.eventDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t space-y-2"
                      style={{ borderColor: KAYAD_COLORS.warmBeige }}
                    >
                      {event.verifiedSource && (
                        <p className="text-sm">
                          <span style={{ color: KAYAD_COLORS.softBlue }}>Source: </span>
                          <span style={{ color: KAYAD_COLORS.lightNavy }}>{event.verifiedSource}</span>
                        </p>
                      )}
                      {event.referenceNumber && (
                        <p className="text-sm">
                          <span style={{ color: KAYAD_COLORS.softBlue }}>Reference: </span>
                          <span style={{ color: KAYAD_COLORS.lightNavy }}>{event.referenceNumber}</span>
                        </p>
                      )}
                      {event.eventDescription && (
                        <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{event.eventDescription}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Ownership View Component
function OwnershipView({ ownership }: { ownership: VehiclePassport['ownership'] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Ownership History</h2>
      {ownership.map((record, index) => (
        <motion.div
          key={record.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-lg p-6 shadow-md"
          style={{ backgroundColor: KAYAD_COLORS.white }}
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium capitalize"
                  style={{ backgroundColor: `${KAYAD_COLORS.lightNavy}15`, color: KAYAD_COLORS.lightNavy }}
                >
                  Owner #{record.ownershipNumber}
                </span>
                {record.isCurrent && (
                  <span
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}
                  >
                    Current
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold mt-2" style={{ color: KAYAD_COLORS.lightNavy }}>
                {record.ownerDisplayName}
              </h3>
              <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>
                {record.ownershipType} Ownership
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                {new Date(record.ownershipStart).toLocaleDateString()}
                {record.ownershipEnd && ` - ${new Date(record.ownershipEnd).toLocaleDateString()}`}
              </p>
              {record.isVerified && (
                <span className="flex items-center justify-end gap-1 text-sm mt-1" style={{ color: KAYAD_COLORS.emerald }}>
                  <CheckCircle size={14} />
                  Verified
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Inspections View Component
function InspectionsView({ inspections }: { inspections: VehiclePassport['inspections'] }) {
  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return KAYAD_COLORS.emerald;
    if (grade.startsWith('B')) return KAYAD_COLORS.softBlue;
    if (grade.startsWith('C')) return KAYAD_COLORS.amber;
    return KAYAD_COLORS.red;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Inspection History</h2>
      {inspections.map((inspection, index) => (
        <motion.div
          key={inspection.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-lg p-6 shadow-md"
          style={{ backgroundColor: KAYAD_COLORS.white }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="text-3xl font-bold"
                  style={{ color: getGradeColor(inspection.overallGrade) }}
                >
                  {inspection.overallGrade}
                </span>
                <div>
                  <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {inspection.inspectionType} Inspection
                  </p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                    {inspection.providerName}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                {new Date(inspection.inspectionDate).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-2">
                <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <FileText size={16} style={{ color: KAYAD_COLORS.lightNavy }} />
                </button>
                <button className="p-2 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <Download size={16} style={{ color: KAYAD_COLORS.lightNavy }} />
                </button>
              </div>
            </div>
          </div>

          {/* Score Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ScoreItem label="Overall" value={inspection.overallScore} />
            <ScoreItem label="Mechanical" value={inspection.mechanicalScore} />
            <ScoreItem label="Safety" value={inspection.safetyScore} />
            <ScoreItem label="Body" value={inspection.bodyScore} />
          </div>

          {/* Defects Summary */}
          <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
            {inspection.criticalDefects > 0 && (
              <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: `${KAYAD_COLORS.red}20`, color: KAYAD_COLORS.red }}>
                {inspection.criticalDefects} Critical
              </span>
            )}
            {inspection.majorDefects > 0 && (
              <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: `${KAYAD_COLORS.amber}20`, color: KAYAD_COLORS.amber }}>
                {inspection.majorDefects} Major
              </span>
            )}
            {inspection.minorDefects > 0 && (
              <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: `${KAYAD_COLORS.softBlue}20`, color: KAYAD_COLORS.softBlue }}>
                {inspection.minorDefects} Minor
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ScoreItem({ label, value }: { label: string; value?: number }) {
  const getColor = (v: number) => {
    if (!v) return KAYAD_COLORS.softBlue;
    if (v >= 80) return KAYAD_COLORS.emerald;
    if (v >= 60) return KAYAD_COLORS.amber;
    return KAYAD_COLORS.red;
  };

  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      <p className="text-2xl font-bold" style={{ color: getColor(value || 0) }}>{value || '-'}</p>
      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
    </div>
  );
}

// Services View Component
function ServicesView({ services }: { services: VehiclePassport['services'] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Service History</h2>
      {services.map((service, index) => (
        <motion.div
          key={service.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="rounded-lg p-6 shadow-md"
          style={{ backgroundColor: KAYAD_COLORS.white }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                {service.serviceTitle}
              </h3>
              <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
                {service.workshopName}
              </p>
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                Mileage: {service.mileageAtService?.toLocaleString()} km
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                {new Date(service.serviceDate).toLocaleDateString()}
              </p>
              <p className="text-lg font-bold mt-1" style={{ color: KAYAD_COLORS.lightNavy }}>
                KES {service.serviceCost?.toLocaleString()}
              </p>
              {service.workshopVerified && (
                <span className="flex items-center justify-end gap-1 text-xs mt-1" style={{ color: KAYAD_COLORS.emerald }}>
                  <CheckCircle size={12} />
                  Verified Workshop
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Documents View Component
function DocumentsView({ documents }: { documents: VehiclePassport['documents'] }) {
  return (
    <div className="rounded-lg p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
      <h2 className="text-xl font-bold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Document Vault</h2>
      {documents.length === 0 ? (
        <div className="text-center py-12" style={{ color: KAYAD_COLORS.softBlue }}>
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No documents available yet.</p>
          <p className="text-sm mt-2">Documents will appear as they are added to this vehicle's history.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="p-4 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
              <div className="flex items-center gap-3">
                <FileText size={24} style={{ color: KAYAD_COLORS.softBlue }} />
                <div className="flex-1">
                  <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{doc.documentTitle}</p>
                  <p className="text-sm capitalize" style={{ color: KAYAD_COLORS.softBlue }}>{doc.documentType}</p>
                </div>
                {doc.isVerified && <CheckCircle size={16} style={{ color: KAYAD_COLORS.emerald }} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
