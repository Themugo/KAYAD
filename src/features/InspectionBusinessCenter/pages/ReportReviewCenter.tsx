// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - REPORT REVIEW CENTER
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText,
  Check,
  X,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  Download,
  ChevronRight,
  Star,
  Car,
  User,
  Calendar,
  MessageSquare,
  CheckCircle,
  Edit,
  Plus,
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

// Workflow stages
const WORKFLOW_STAGES = [
  { id: 'engineer_complete', label: 'Engineer Complete', color: '#3b82f6' },
  { id: 'qa_review', label: 'QA Review', color: '#f59e0b' },
  { id: 'corrections_requested', label: 'Corrections', color: '#8b5cf6' },
  { id: 'approved', label: 'Approved', color: '#10b981' },
  { id: 'sent', label: 'Sent to Customer', color: '#6b7280' },
];

// Sample reports
const SAMPLE_REPORTS = [
  { id: 'r1', reportNumber: 'KAYAD-IR-2024-001', status: 'qa_review', overallScore: 78, overallCondition: 'good', bookingRef: 'KAYAD-001', customer: 'John Kamau', vehicle: 'Toyota Corolla 2022', engineer: 'David Maina', submittedAt: '2024-01-14 14:30', reviewedBy: null, corrections: [] },
  { id: 'r2', reportNumber: 'KAYAD-IR-2024-002', status: 'engineer_complete', overallScore: 85, overallCondition: 'good', bookingRef: 'KAYAD-002', customer: 'Sarah Wanjiku', vehicle: 'Mercedes C-Class 2021', engineer: 'Faith Njeri', submittedAt: '2024-01-14 16:45', reviewedBy: null, corrections: [] },
  { id: 'r3', reportNumber: 'KAYAD-IR-2024-003', status: 'corrections_requested', overallScore: 72, overallCondition: 'fair', bookingRef: 'KAYAD-003', customer: 'Auto Dealers Ltd', vehicle: 'Toyota Land Cruiser 2020', engineer: 'James Ochieng', submittedAt: '2024-01-14 18:00', reviewedBy: 'Grace Wambui', corrections: [{ section: 'Engine', issue: 'Oil leak description incomplete' }, { section: 'Brakes', issue: 'Missing pad measurement' }] },
  { id: 'r4', reportNumber: 'KAYAD-IR-2024-004', status: 'approved', overallScore: 92, overallCondition: 'excellent', bookingRef: 'KAYAD-004', customer: 'Michael Odhiambo', vehicle: 'BMW X5 2023', engineer: 'David Maina', submittedAt: '2024-01-13 10:00', reviewedBy: 'Grace Wambui', corrections: [] },
  { id: 'r5', reportNumber: 'KAYAD-IR-2024-005', status: 'sent', overallScore: 88, overallCondition: 'good', bookingRef: 'KAYAD-005', customer: 'Lucy Achieng', vehicle: 'VW Touareg 2022', engineer: 'Faith Njeri', submittedAt: '2024-01-12 15:00', reviewedBy: 'Grace Wambui', corrections: [] },
  { id: 'r6', reportNumber: 'KAYAD-IR-2024-006', status: 'qa_review', overallScore: 65, overallCondition: 'fair', bookingRef: 'KAYAD-006', customer: 'Peter Njoroge', vehicle: 'Nissan Altima 2020', engineer: 'James Ochieng', submittedAt: '2024-01-14 19:30', reviewedBy: null, corrections: [] },
];

export default function ReportReviewCenter({ providerId }: { providerId: string }) {
  const [reports, setReports] = useState(SAMPLE_REPORTS);
  const [selectedReport, setSelectedReport] = useState<typeof SAMPLE_REPORTS[0] | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);

  const filteredReports = filterStatus 
    ? reports.filter(r => r.status === filterStatus)
    : reports;

  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    WORKFLOW_STAGES.forEach(s => counts[s.id] = 0);
    reports.forEach(r => counts[r.status] = (counts[r.status] || 0) + 1);
    return counts;
  };

  const handleApprove = (reportId: string) => {
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: 'approved', reviewedBy: 'Grace Wambui' } : r
    ));
    setShowApproveModal(false);
    setSelectedReport(null);
  };

  const handleRequestCorrections = (reportId: string, corrections: { section: string; issue: string }[]) => {
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: 'corrections_requested', corrections, reviewedBy: 'Grace Wambui' } : r
    ));
    setShowCorrectionsModal(false);
    setSelectedReport(null);
  };

  const handleSendToCustomer = (reportId: string) => {
    setReports(prev => prev.map(r => 
      r.id === reportId ? { ...r, status: 'sent' } : r
    ));
    setSelectedReport(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Report Review Center
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            Quality assurance workflow for inspection reports
          </p>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
        <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Workflow Progress</h2>
        <div className="flex items-center justify-between">
          {WORKFLOW_STAGES.map((stage, index) => {
            const count = getStatusCounts()[stage.id] || 0;
            return (
              <div key={stage.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: stage.color, color: KAYAD_COLORS.white }}
                  >
                    {count}
                  </div>
                  <span className="text-xs mt-2 text-center" style={{ color: KAYAD_COLORS.softBlue }}>
                    {stage.label}
                  </span>
                </div>
                {index < WORKFLOW_STAGES.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2" style={{ backgroundColor: KAYAD_COLORS.warmBeige }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilterStatus(null)}
          className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
            !filterStatus ? 'text-white' : ''
          }`}
          style={{
            backgroundColor: !filterStatus ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
            color: !filterStatus ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
          }}
        >
          All ({reports.length})
        </button>
        {WORKFLOW_STAGES.map(stage => (
          <button
            key={stage.id}
            onClick={() => setFilterStatus(stage.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              filterStatus === stage.id ? 'text-white' : ''
            }`}
            style={{
              backgroundColor: filterStatus === stage.id ? stage.color : KAYAD_COLORS.white,
              color: filterStatus === stage.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
            }}
          >
            {stage.label} ({getStatusCounts()[stage.id] || 0})
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredReports.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            onClick={() => setSelectedReport(report)}
            onApprove={() => { setSelectedReport(report); setShowApproveModal(true); }}
            onRequestCorrections={() => { setSelectedReport(report); setShowCorrectionsModal(true); }}
            onSend={() => handleSendToCustomer(report.id)}
          />
        ))}
        
        {filteredReports.length === 0 && (
          <div className="col-span-2 text-center py-12 rounded-xl" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <FileText size={48} className="mx-auto mb-4" style={{ color: KAYAD_COLORS.softBlue }} />
            <p style={{ color: KAYAD_COLORS.softBlue }}>No reports found</p>
          </div>
        )}
      </div>

      {/* Report Detail Panel */}
      {selectedReport && !showApproveModal && !showCorrectionsModal && (
        <ReportDetailPanel
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onApprove={() => setShowApproveModal(true)}
          onRequestCorrections={() => setShowCorrectionsModal(true)}
          onSend={() => handleSendToCustomer(selectedReport.id)}
        />
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedReport && (
        <ApproveModal
          report={selectedReport}
          onClose={() => setShowApproveModal(false)}
          onConfirm={() => handleApprove(selectedReport.id)}
        />
      )}

      {/* Corrections Modal */}
      {showCorrectionsModal && selectedReport && (
        <CorrectionsModal
          report={selectedReport}
          onClose={() => setShowCorrectionsModal(false)}
          onSubmit={(corrections) => handleRequestCorrections(selectedReport.id, corrections)}
        />
      )}
    </div>
  );
}

function ReportCard({ report, onClick, onApprove, onRequestCorrections, onSend }: any) {
  const stage = WORKFLOW_STAGES.find(s => s.id === report.status) || WORKFLOW_STAGES[0];
  const conditionColors: Record<string, string> = {
    excellent: KAYAD_COLORS.emerald,
    good: '#3b82f6',
    fair: KAYAD_COLORS.amber,
    poor: KAYAD_COLORS.mutedTerracotta,
    bad: KAYAD_COLORS.red,
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl overflow-hidden shadow-md cursor-pointer"
      style={{ backgroundColor: KAYAD_COLORS.white }}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
              {report.reportNumber}
            </h3>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
              {report.bookingRef}
            </p>
          </div>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium capitalize"
            style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
          >
            {stage.label}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Car size={14} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{report.vehicle}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{report.customer}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={14} style={{ color: KAYAD_COLORS.softBlue }} />
            <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Engineer: {report.engineer}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Score</p>
              <p className="text-lg font-bold" style={{ color: conditionColors[report.overallCondition] }}>
                {report.overallScore}
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>Condition</p>
              <p className="text-sm font-medium capitalize" style={{ color: conditionColors[report.overallCondition] }}>
                {report.overallCondition}
              </p>
            </div>
          </div>
          
          {report.corrections.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <AlertTriangle size={12} />
              {report.corrections.length} issues
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        {report.status === 'qa_review' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="flex-1 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-1"
              style={{ backgroundColor: KAYAD_COLORS.emerald }}
            >
              <Check size={16} />
              Approve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRequestCorrections(); }}
              className="flex-1 py-2 rounded-lg font-medium flex items-center justify-center gap-1"
              style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
            >
              <Edit size={16} />
              Request Fix
            </button>
          </>
        )}
        {report.status === 'approved' && (
          <button
            onClick={(e) => { e.stopPropagation(); onSend(); }}
            className="flex-1 py-2 rounded-lg font-medium text-white flex items-center justify-center gap-1"
            style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
          >
            <Send size={16} />
            Send to Customer
          </button>
        )}
        {report.status !== 'qa_review' && report.status !== 'approved' && (
          <button
            className="flex-1 py-2 rounded-lg font-medium"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
          >
            View Details
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ReportDetailPanel({ report, onClose, onApprove, onRequestCorrections, onSend }: any) {
  const stage = WORKFLOW_STAGES.find(s => s.id === report.status) || WORKFLOW_STAGES[0];

  return (
    <motion.div
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      className="fixed right-0 top-0 h-full w-[500px] shadow-xl overflow-y-auto z-50"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
              {report.reportNumber}
            </h2>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
              {report.bookingRef}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} style={{ color: KAYAD_COLORS.softBlue }} />
          </button>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          <span 
            className="px-4 py-2 rounded-full text-sm font-medium"
            style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
          >
            {stage.label}
          </span>
        </div>

        {/* Score */}
        <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
          <div className="text-center">
            <p className="text-5xl font-bold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>
              {report.overallScore}
            </p>
            <p className="text-lg capitalize" style={{ color: KAYAD_COLORS.softBlue }}>
              {report.overallCondition} Condition
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4 mb-6">
          <DetailRow icon={<Car size={16} />} label="Vehicle" value={report.vehicle} />
          <DetailRow icon={<User size={16} />} label="Customer" value={report.customer} />
          <DetailRow icon={<User size={16} />} label="Inspector" value={report.engineer} />
          <DetailRow icon={<Calendar size={16} />} label="Submitted" value={report.submittedAt} />
          {report.reviewedBy && (
            <DetailRow icon={<CheckCircle size={16} />} label="Reviewed By" value={report.reviewedBy} />
          )}
        </div>

        {/* Category Scores */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: KAYAD_COLORS.lightNavy }}>Category Scores</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Engine', 'Transmission', 'Suspension', 'Brakes', 'Electrical', 'Interior'].map(cat => (
              <div key={cat} className="flex justify-between p-2 rounded" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{cat}</span>
                <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
                  {Math.floor(Math.random() * 20) + 80}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Corrections */}
        {report.corrections.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: KAYAD_COLORS.red }}>
              <AlertTriangle size={16} />
              Required Corrections
            </h3>
            <div className="space-y-2">
              {report.corrections.map((c: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border" style={{ borderColor: KAYAD_COLORS.red, backgroundColor: '#fef2f2' }}>
                  <p className="font-medium text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{c.section}</p>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.red }}>{c.issue}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {report.status === 'qa_review' && (
            <>
              <button
                onClick={onApprove}
                className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: KAYAD_COLORS.emerald }}
              >
                <CheckCircle size={18} />
                Approve Report
              </button>
              <button
                onClick={onRequestCorrections}
                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
              >
                <Edit size={18} />
                Request Corrections
              </button>
            </>
          )}
          {report.status === 'approved' && (
            <button
              onClick={onSend}
              className="w-full py-3 rounded-lg font-medium text-white flex items-center justify-center gap-2"
              style={{ backgroundColor: KAYAD_COLORS.lightNavy }}
            >
              <Send size={18} />
              Send to Customer
            </button>
          )}
          <button className="w-full py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
            <Download size={16} className="inline mr-2" />
            Download PDF
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div style={{ color: KAYAD_COLORS.softBlue }}>{icon}</div>
      <div>
        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{value}</p>
      </div>
    </div>
  );
}

function ApproveModal({ report, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl p-6 w-[400px]"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#10b98120' }}>
            <CheckCircle size={24} style={{ color: KAYAD_COLORS.emerald }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Approve Report</h2>
            <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{report.reportNumber}</p>
          </div>
        </div>
        
        <p className="mb-6" style={{ color: KAYAD_COLORS.softBlue }}>
          Are you sure you want to approve this inspection report? It will be ready to send to the customer.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg font-medium"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: KAYAD_COLORS.emerald }}
          >
            Approve
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CorrectionsModal({ report, onClose, onSubmit }: any) {
  const [corrections, setCorrections] = useState([{ section: '', issue: '' }]);

  const addCorrection = () => {
    setCorrections([...corrections, { section: '', issue: '' }]);
  };

  const updateCorrection = (index: number, field: string, value: string) => {
    const updated = [...corrections];
    updated[index] = { ...updated[index], [field]: value };
    setCorrections(updated);
  };

  const handleSubmit = () => {
    const validCorrections = corrections.filter(c => c.section && c.issue);
    if (validCorrections.length > 0) {
      onSubmit(validCorrections);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-white rounded-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f59e0b20' }}>
              <Edit size={24} style={{ color: KAYAD_COLORS.amber }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Request Corrections</h2>
              <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{report.reportNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X size={20} style={{ color: KAYAD_COLORS.softBlue }} />
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          {corrections.map((correction, index) => (
            <div key={index} className="p-4 rounded-lg border" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>
                  Correction #{index + 1}
                </span>
                {corrections.length > 1 && (
                  <button
                    onClick={() => setCorrections(corrections.filter((_, i) => i !== index))}
                    className="text-red-500 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Section (e.g., Engine, Brakes)"
                value={correction.section}
                onChange={(e) => updateCorrection(index, 'section', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border mb-2 outline-none"
                style={{ borderColor: KAYAD_COLORS.softBlue }}
              />
              <textarea
                placeholder="Issue description"
                value={correction.issue}
                onChange={(e) => updateCorrection(index, 'issue', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border outline-none resize-none"
                style={{ borderColor: KAYAD_COLORS.softBlue }}
                rows={2}
              />
            </div>
          ))}
        </div>
        
        <button
          onClick={addCorrection}
          className="w-full py-2 rounded-lg font-medium mb-4 flex items-center justify-center gap-2"
          style={{ borderColor: KAYAD_COLORS.softBlue, border: '1px dashed', color: KAYAD_COLORS.softBlue }}
        >
          <Plus size={16} />
          Add Another Correction
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg font-medium"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: KAYAD_COLORS.amber }}
          >
            Request Fixes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
