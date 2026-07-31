// ============================================================
// KAYAD 150-POINT DIGITAL INSPECTION ENGINE
// INSPECTION WORKSPACE
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  Camera,
  Video,
  Mic,
  Gauge,
  AlertTriangle,
  Car,
  FileText,
  Clock,
  MapPin,
  User,
  Star,
  Shield,
  Wrench,
  Zap,
  Settings,
} from 'lucide-react';
import {
  WorkflowStage,
  STAGE_LABELS,
  ConditionRating,
  CONDITION_LABELS,
  CONDITION_COLORS,
  InspectionCategory,
  CATEGORY_LABELS,
  InspectionPoint,
  Evidence,
  Defect,
  SeverityLevel,
} from '../types/inspection';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
  orange: '#f97316',
};

// Sample inspection data
const SAMPLE_INSPECTION = {
  id: 'ins-001',
  bookingId: 'book-001',
  status: 'in_progress',
  currentStage: 'exterior_inspection' as WorkflowStage,
  vehicle: {
    make: 'Toyota',
    model: 'Land Cruiser',
    year: 2020,
    vin: 'JTMCVREV0LD123456',
    registration: 'KBZ 123A',
    odometer: 45230,
    colour: 'Black',
    fuelType: 'Diesel',
    transmission: 'Automatic',
  },
  progress: {
    pointsPercentage: 45,
    stagesPercentage: 35,
    completedStages: 6,
    totalStages: 18,
    completedPoints: 68,
    totalPoints: 150,
  },
  scores: {
    overallScore: 78,
    overallGrade: 'B',
    mechanicalScore: 82,
    safetyScore: 85,
    bodyScore: 75,
    interiorScore: 80,
    electricalScore: 78,
    roadworthinessScore: 78,
  },
};

const SAMPLE_POINTS: InspectionPoint[] = [
  { id: 'p1', stageId: 's1', pointCode: 'EXT_PAINT_001', pointName: 'Front Bumper Paint', category: 'exterior', conditionRating: 'good' },
  { id: 'p2', stageId: 's1', pointCode: 'EXT_PAINT_002', pointName: 'Hood Paint', category: 'exterior', conditionRating: 'good' },
  { id: 'p3', stageId: 's1', pointCode: 'EXT_PAINT_003', pointName: 'Roof Paint', category: 'exterior', conditionRating: 'excellent' },
  { id: 'p4', stageId: 's1', pointCode: 'EXT_PAINT_004', pointName: 'Trunk/Boot Paint', category: 'exterior', conditionRating: 'requires_attention', inspectorNotes: 'Scratch on driver side' },
  { id: 'p5', stageId: 's1', pointCode: 'EXT_GLASS_001', pointName: 'Windshield', category: 'exterior', conditionRating: 'excellent' },
  { id: 'p6', stageId: 's1', pointCode: 'EXT_GLASS_002', pointName: 'Rear Window', category: 'exterior', conditionRating: 'good' },
  { id: 'p7', stageId: 's1', pointCode: 'EXT_LIGHT_001', pointName: 'Headlights', category: 'exterior', conditionRating: 'good' },
  { id: 'p8', stageId: 's1', pointCode: 'EXT_LIGHT_002', pointName: 'Taillights', category: 'exterior', conditionRating: 'good' },
];

const SAMPLE_DEFECTS: Defect[] = [
  { id: 'd1', title: 'Front Bumper Scratch', classification: 'cosmetic', severity: 'low', location: 'Front Bumper', recommendation: 'Polish out minor scratch' },
  { id: 'd2', title: 'Brake Pad Wear', classification: 'mechanical', severity: 'medium', location: 'Front Wheels', recommendation: 'Replace within 5,000 km' },
];

interface DigitalInspectionWorkspaceProps {
  inspectionId?: string;
  onComplete?: () => void;
}

export default function DigitalInspectionWorkspace({ inspectionId, onComplete }: DigitalInspectionWorkspaceProps) {
  const [inspection, setInspection] = useState(SAMPLE_INSPECTION);
  const [activeStage, setActiveStage] = useState<WorkflowStage>(inspection.currentStage);
  const [selectedPoint, setSelectedPoint] = useState<InspectionPoint | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);

  const stages = [
    { name: 'job_verification', order: 1, icon: <Settings size={16} /> },
    { name: 'customer_confirmation', order: 2, icon: <User size={16} /> },
    { name: 'vehicle_identification', order: 3, icon: <Car size={16} /> },
    { name: 'exterior_inspection', order: 4, icon: <Car size={16} /> },
    { name: 'interior_inspection', order: 5, icon: <Car size={16} /> },
    { name: 'engine_inspection', order: 6, icon: <Wrench size={16} /> },
    { name: 'transmission_inspection', order: 7, icon: <Gauge size={16} /> },
    { name: 'suspension_inspection', order: 8, icon: <Settings size={16} /> },
    { name: 'steering_inspection', order: 9, icon: <Settings size={16} /> },
    { name: 'brake_inspection', order: 10, icon: <AlertTriangle size={16} /> },
    { name: 'electrical_inspection', order: 11, icon: <Zap size={16} /> },
    { name: 'diagnostics', order: 12, icon: <Gauge size={16} /> },
    { name: 'road_test', order: 13, icon: <Car size={16} /> },
    { name: 'safety_systems', order: 14, icon: <Shield size={16} /> },
    { name: 'final_assessment', order: 15, icon: <CheckCircle size={16} /> },
    { name: 'customer_review', order: 16, icon: <User size={16} /> },
    { name: 'digital_signature', order: 17, icon: <FileText size={16} /> },
    { name: 'report_generation', order: 18, icon: <FileText size={16} /> },
  ];

  const handlePointRating = (pointId: string, rating: ConditionRating) => {
    setInspection(prev => ({
      ...prev,
      points: prev.points?.map(p => p.id === pointId ? { ...p, conditionRating: rating } : p) || [],
    }));
  };

  const handleAddEvidence = (pointId: string, type: string) => {
    // In production, this would open camera/file picker
    console.log('Adding evidence:', pointId, type);
    setShowEvidenceModal(false);
  };

  const handleAddDefect = (defect: Partial<Defect>) => {
    console.log('Adding defect:', defect);
    setShowDefectModal(false);
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Left Panel - Workflow Progress */}
      <aside className="w-72 p-4 overflow-y-auto" style={{ backgroundColor: KAYAD_COLORS.white }}>
        {/* Vehicle Info */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
          <div className="flex items-center gap-3 mb-2">
            <Car size={24} color={KAYAD_COLORS.white} />
            <div>
              <h2 className="font-bold text-white">
                {inspection.vehicle.year} {inspection.vehicle.make} {inspection.vehicle.model}
              </h2>
              <p className="text-sm opacity-80">{inspection.vehicle.registration}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="text-center p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-bold text-white">{inspection.progress.pointsPercentage}%</p>
              <p className="text-xs text-white opacity-80">Complete</p>
            </div>
            <div className="text-center p-2 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-bold text-white">{inspection.progress.completedPoints}</p>
              <p className="text-xs text-white opacity-80">of 150 Points</p>
            </div>
          </div>
        </div>

        {/* Score Display */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Overall Score</span>
            <span className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
              {inspection.scores.overallGrade}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div 
              className="h-full rounded-full"
              style={{ 
                width: `${inspection.scores.overallScore}%`,
                backgroundColor: inspection.scores.overallScore >= 80 ? KAYAD_COLORS.emerald : 
                                inspection.scores.overallScore >= 60 ? KAYAD_COLORS.amber : KAYAD_COLORS.red
              }}
            />
          </div>
        </div>

        {/* Workflow Stages */}
        <div className="space-y-1">
          <h3 className="text-sm font-semibold mb-3" style={{ color: KAYAD_COLORS.softBlue }}>
            INSPECTION WORKFLOW
          </h3>
          {stages.map((stage, index) => {
            const isActive = stage.name === activeStage;
            const isCompleted = index < stages.findIndex(s => s.name === activeStage);
            
            return (
              <button
                key={stage.name}
                onClick={() => setActiveStage(stage.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isActive ? 'text-white' : isCompleted ? '' : ''
                }`}
                style={{
                  backgroundColor: isActive ? KAYAD_COLORS.emerald : 
                                   isCompleted ? KAYAD_COLORS.warmBeige : 'transparent',
                  color: isActive ? KAYAD_COLORS.white : 
                         isCompleted ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.softBlue,
                }}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle size={18} style={{ color: KAYAD_COLORS.emerald }} />
                  ) : isActive ? (
                    <Circle size={18} style={{ color: KAYAD_COLORS.white }} />
                  ) : (
                    <Circle size={18} style={{ color: KAYAD_COLORS.softBlue, opacity: 0.5 }} />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium">{STAGE_LABELS[stage.name as WorkflowStage]}</span>
                </div>
                {isActive && <ChevronRight size={16} />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Stage Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            {STAGE_LABELS[activeStage]}
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            {activeStage === 'exterior_inspection' && 'Inspect paint, glass, lighting, tyres, wheels, and body panels'}
            {activeStage === 'vehicle_identification' && 'Verify vehicle identification details from VIN, logbook, and physical inspection'}
          </p>
        </div>

        {/* Inspection Points Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {SAMPLE_POINTS.map(point => (
            <InspectionPointCard
              key={point.id}
              point={point}
              onSelect={() => setSelectedPoint(point)}
              onRate={(rating) => handlePointRating(point.id, rating)}
            />
          ))}
        </div>

        {/* Defects Summary */}
        {SAMPLE_DEFECTS.length > 0 && (
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: KAYAD_COLORS.lightNavy }}>
              <AlertTriangle size={20} className="text-amber-500" />
              Defects Found ({SAMPLE_DEFECTS.length})
            </h2>
            <div className="space-y-3">
              {SAMPLE_DEFECTS.map(defect => (
                <div key={defect.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div>
                    <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{defect.title}</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{defect.location}</p>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-xs font-medium capitalize"
                    style={{ 
                      backgroundColor: `${defect.severity === 'critical' ? KAYAD_COLORS.red : 
                                         defect.severity === 'medium' ? KAYAD_COLORS.amber : KAYAD_COLORS.emerald}20`,
                      color: defect.severity === 'critical' ? KAYAD_COLORS.red : 
                             defect.severity === 'medium' ? KAYAD_COLORS.amber : KAYAD_COLORS.emerald
                    }}
                  >
                    {defect.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}
          >
            <ChevronLeft size={18} />
            Previous Stage
          </button>
          <button
            className="px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2"
            style={{ backgroundColor: KAYAD_COLORS.emerald }}
          >
            Complete Stage
            <ChevronRight size={18} />
          </button>
        </div>
      </main>

      {/* Right Panel - Point Details */}
      <AnimatePresence>
        {selectedPoint && (
          <PointDetailPanel
            point={selectedPoint}
            onClose={() => setSelectedPoint(null)}
            onAddEvidence={() => setShowEvidenceModal(true)}
            onAddDefect={() => setShowDefectModal(true)}
            onRate={handlePointRating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Inspection Point Card Component
function InspectionPointCard({ point, onSelect, onRate }: { 
  point: InspectionPoint; 
  onSelect: () => void;
  onRate: (rating: ConditionRating) => void;
}) {
  const conditionColor = point.conditionRating ? CONDITION_COLORS[point.conditionRating] : KAYAD_COLORS.softBlue;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-xl p-4 shadow-md cursor-pointer"
      style={{ backgroundColor: KAYAD_COLORS.white }}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-mono" style={{ color: KAYAD_COLORS.softBlue }}>{point.pointCode}</p>
          <h3 className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{point.pointName}</h3>
        </div>
        <div 
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: conditionColor }}
        />
      </div>
      
      {/* Quick Rating */}
      <div className="flex gap-1">
        {(['excellent', 'good', 'fair', 'requires_attention'] as ConditionRating[]).map(rating => (
          <button
            key={rating}
            onClick={(e) => { e.stopPropagation(); onRate(rating); }}
            className="flex-1 py-1 px-2 rounded text-xs font-medium transition-all"
            style={{
              backgroundColor: point.conditionRating === rating ? CONDITION_COLORS[rating] : KAYAD_COLORS.warmBeige,
              color: point.conditionRating === rating ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {rating === 'requires_attention' ? '!' : rating.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// Point Detail Panel Component
function PointDetailPanel({ 
  point, 
  onClose, 
  onAddEvidence, 
  onAddDefect, 
  onRate 
}: { 
  point: InspectionPoint; 
  onClose: () => void;
  onAddEvidence: () => void;
  onAddDefect: () => void;
  onRate: (rating: ConditionRating) => void;
}) {
  return (
    <motion.aside
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="w-96 p-6 overflow-y-auto"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Point Details</h2>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight size={20} style={{ color: KAYAD_COLORS.softBlue }} />
        </button>
      </div>

      {/* Point Info */}
      <div className="mb-6">
        <p className="text-xs font-mono mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{point.pointCode}</p>
        <h3 className="text-xl font-bold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{point.pointName}</h3>
        <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
          {CATEGORY_LABELS[point.category as InspectionCategory]}
        </span>
      </div>

      {/* Condition Rating */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Condition Rating</h4>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(CONDITION_LABELS) as ConditionRating[]).slice(0, 4).map(rating => (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              className="py-2 px-3 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: point.conditionRating === rating ? CONDITION_COLORS[rating] : KAYAD_COLORS.warmBeige,
                color: point.conditionRating === rating ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {CONDITION_LABELS[rating]}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Evidence</h4>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onAddEvidence}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed"
            style={{ borderColor: KAYAD_COLORS.softBlue }}
          >
            <Camera size={24} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Photo</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed" style={{ borderColor: KAYAD_COLORS.softBlue }}>
            <Video size={24} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Video</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed" style={{ borderColor: KAYAD_COLORS.softBlue }}>
            <Mic size={24} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-xs mt-1" style={{ color: KAYAD_COLORS.softBlue }}>Voice</span>
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Inspector Notes</h4>
        <textarea
          placeholder="Add notes about this inspection point..."
          className="w-full p-3 rounded-lg border outline-none resize-none"
          style={{ borderColor: KAYAD_COLORS.softBlue, minHeight: '100px' }}
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={onAddDefect}
          className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
          style={{ backgroundColor: KAYAD_COLORS.amber }}
        >
          <AlertTriangle size={18} />
          Add Defect
        </button>
        <button
          className="w-full py-3 rounded-lg font-medium"
          style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
        >
          Mark as N/A
        </button>
      </div>
    </motion.aside>
  );
}
