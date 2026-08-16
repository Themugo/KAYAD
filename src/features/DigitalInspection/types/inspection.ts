// ============================================================
// KAYAD 150-POINT DIGITAL INSPECTION ENGINE - TYPES
// ============================================================

// Inspection Status
export type InspectionStatus = 
  | 'in_progress'
  | 'completed'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'archived';

// Workflow Stages
export type WorkflowStage =
  | 'job_verification'
  | 'customer_confirmation'
  | 'vehicle_identification'
  | 'exterior_inspection'
  | 'interior_inspection'
  | 'engine_inspection'
  | 'transmission_inspection'
  | 'suspension_inspection'
  | 'steering_inspection'
  | 'brake_inspection'
  | 'electrical_inspection'
  | 'diagnostics'
  | 'road_test'
  | 'safety_systems'
  | 'final_assessment'
  | 'customer_review'
  | 'digital_signature'
  | 'report_generation';

// Stage Labels
export const STAGE_LABELS: Record<WorkflowStage, string> = {
  job_verification: 'Job Verification',
  customer_confirmation: 'Customer Confirmation',
  vehicle_identification: 'Vehicle Identification',
  exterior_inspection: 'Exterior Inspection',
  interior_inspection: 'Interior Inspection',
  engine_inspection: 'Engine Bay',
  transmission_inspection: 'Transmission',
  suspension_inspection: 'Suspension',
  steering_inspection: 'Steering',
  brake_inspection: 'Brakes',
  electrical_inspection: 'Electrical',
  diagnostics: 'Diagnostics',
  road_test: 'Road Test',
  safety_systems: 'Safety Systems',
  final_assessment: 'Final Assessment',
  customer_review: 'Customer Review',
  digital_signature: 'Digital Signature',
  report_generation: 'Report Generation',
};

// Condition Ratings
export type ConditionRating =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'requires_attention'
  | 'critical'
  | 'not_tested'
  | 'not_applicable';

export const CONDITION_LABELS: Record<ConditionRating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  requires_attention: 'Requires Attention',
  critical: 'Critical',
  not_tested: 'Not Tested',
  not_applicable: 'N/A',
};

export const CONDITION_COLORS: Record<ConditionRating, string> = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  requires_attention: '#f97316',
  critical: '#ef4444',
  not_tested: '#6b7280',
  not_applicable: '#9ca3af',
};

// Defect Classifications
export type DefectClassification =
  | 'safety_critical'
  | 'mechanical'
  | 'electrical'
  | 'cosmetic'
  | 'maintenance'
  | 'advisory'
  | 'monitor';

export const DEFECT_LABELS: Record<DefectClassification, string> = {
  safety_critical: 'Safety Critical',
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  cosmetic: 'Cosmetic',
  maintenance: 'Maintenance',
  advisory: 'Advisory',
  monitor: 'Monitor',
};

// Severity Levels
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#65a30d',
};

// Evidence Types
export type EvidenceType = 'photo' | 'video' | 'voice_note' | 'measurement' | 'diagnostic' | 'document';

// Categories
export type InspectionCategory =
  | 'exterior'
  | 'interior'
  | 'engine'
  | 'transmission'
  | 'suspension'
  | 'steering'
  | 'brakes'
  | 'electrical'
  | 'road_test'
  | 'safety';

export const CATEGORY_LABELS: Record<InspectionCategory, string> = {
  exterior: 'Exterior',
  interior: 'Interior',
  engine: 'Engine',
  transmission: 'Transmission',
  suspension: 'Suspension',
  steering: 'Steering',
  brakes: 'Brakes',
  electrical: 'Electrical',
  road_test: 'Road Test',
  safety: 'Safety Systems',
};

// Interfaces
export interface Inspection {
  id: string;
  bookingId: string;
  providerId: string;
  status: InspectionStatus;
  currentStage: WorkflowStage;
  vehicle: VehicleIdentification;
  scores?: InspectionScores;
  stages?: Stage[];
  points?: InspectionPoint[];
  defects?: Defect[];
  progress?: Progress;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleIdentification {
  vin?: string;
  chassis?: string;
  engineNumber?: string;
  registration?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: number;
  engineCapacity?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  odometer?: number;
  colour?: string;
  countryOrigin?: string;
  bodyType?: string;
  logbookVerified?: boolean;
  timsVerified?: boolean;
}

export interface InspectionScores {
  overallScore: number;
  overallGrade: string;
  mechanicalScore: number;
  safetyScore: number;
  bodyScore: number;
  interiorScore: number;
  electricalScore: number;
  roadworthinessScore: number;
}

export interface Stage {
  id: string;
  name: WorkflowStage;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  totalPoints: number;
  completedPoints: number;
  startedAt?: string;
  completedAt?: string;
}

export interface InspectionPoint {
  id: string;
  stageId: string;
  pointCode: string;
  pointName: string;
  category?: InspectionCategory;
  conditionRating?: ConditionRating;
  defectClassification?: DefectClassification;
  inspectorNotes?: string;
  recommendation?: string;
  evidence?: Evidence[];
  requiresPhoto?: boolean;
  requiresVideo?: boolean;
  requiresDiagnostic?: boolean;
}

export interface Evidence {
  id: string;
  pointId: string;
  type: EvidenceType;
  url?: string;
  thumbnailUrl?: string;
  caption?: string;
  measurementValue?: string;
  measurementUnit?: string;
  diagnosticCode?: string;
  createdAt: string;
}

export interface Defect {
  id: string;
  pointId?: string;
  title: string;
  description?: string;
  classification: DefectClassification;
  severity: SeverityLevel;
  location?: string;
  recommendation?: string;
  estimatedCost?: number;
  urgency?: 'immediate' | 'within_week' | 'within_month' | 'when_convenient';
  isResolved?: boolean;
}

export interface FindingCategory {
  category: InspectionCategory;
  label: string;
  passedCount: number;
  attentionCount: number;
  failedCount: number;
  findings: Defect[];
}

export interface Progress {
  pointsPercentage: number;
  stagesPercentage: number;
  completedStages: number;
  totalStages: number;
  completedPoints: number;
  totalPoints: number;
}

export interface InspectionReport {
  id: string;
  inspectionId: string;
  reportNumber: string;
  version: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'published' | 'archived';
  content?: ReportContent;
  pdfUrl?: string;
  contentHash?: string;
  inspectorSignature?: string;
  inspectorSignedAt?: string;
  reviewerSignature?: string;
  reviewerSignedAt?: string;
  verificationCode?: string;
  createdAt: string;
}

export interface ReportContent {
  reportMetadata: {
    reportNumber: string;
    generatedAt: string;
    inspectionDate: string;
    reportVersion: number;
  };
  executiveSummary: {
    overallAssessment: string;
    recommendation: string;
    quickStats: {
      totalDefects: number;
      criticalDefects: number;
      overallScore: number;
      overallGrade: string;
    };
  };
  vehicleOverview: {
    identification: Record<string, string>;
    specifications: Record<string, string | number>;
    technical: Record<string, string | number>;
  };
  scores: InspectionScores;
  inspectionFindings: FindingCategory[];
  defects: Record<string, Defect[]>;
  severityAnalysis: Record<SeverityLevel, Defect[]>;
  recommendations: {
    immediate: Defect[];
    withinWeek: Defect[];
    withinMonth: Defect[];
    whenConvenient: Defect[];
  };
  evidenceSummary: {
    totalPhotos: number;
    totalVideos: number;
    totalMeasurements: number;
    totalDiagnostics: number;
  };
}

// 150-Point Inspection Template
export interface InspectionTemplate {
  stages: {
    name: WorkflowStage;
    order: number;
    categories: InspectionCategory[];
  }[];
  categories: {
    name: InspectionCategory;
    label: string;
    points: {
      code: string;
      name: string;
      isMandatory?: boolean;
      requiresPhoto?: boolean;
      requiresDiagnostic?: boolean;
    }[];
  }[];
}
