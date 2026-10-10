import React, { useState } from 'react';
import {
  Building,
  Car,
  Gavel,
  Banknote,
  ClipboardCheck,
  FileText,
  Users,
  Shield,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  ExternalLink,
  FileCheck,
  Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type {
  ComplianceCheck,
  ComplianceCategory,
  ComplianceItem
} from '../../utils/auctionCompliance';
import {
  COMPLIANCE_CATEGORIES,
  getChecksByCategory,
  getComplianceSummary
} from '../../utils/auctionCompliance';

export interface ComplianceChecklistProps {
  checks: ComplianceCheck[];
  onCheckToggle?: (checkId: string, isComplete: boolean) => void;
  onViewPolicy?: (policyId: string) => void;
  onSubmitForReview?: () => void;
  isEditable?: boolean;
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  organization: <Building className="w-5 h-5" />,
  vehicle: <Car className="w-5 h-5" />,
  auction: <Gavel className="w-5 h-5" />,
  financial: <Banknote className="w-5 h-5" />,
  inspection: <ClipboardCheck className="w-5 h-5" />,
  document: <FileText className="w-5 h-5" />,
  marketplace_policy: <Shield className="w-5 h-5" />,
  customer_protection: <Users className="w-5 h-5" />,
};

// Single check item
const ComplianceCheckItem: React.FC<{
  check: ComplianceCheck;
  onToggle?: (id: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ check, onToggle, editable }) => {
  const categoryInfo = COMPLIANCE_CATEGORIES[check.category];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
      check.isComplete
        ? 'bg-emerald-50 border-emerald-200'
        : check.severity === 'required'
          ? 'bg-red-50 border-red-200'
          : 'bg-[#F6FAF9] border-[#D7E7E4]'
    }`}>
      <button
        onClick={() => editable && onToggle?.(check.id, !check.isComplete)}
        disabled={!editable}
        className={`mt-0.5 ${check.isComplete ? 'text-emerald-600' : 'text-[#94A3B8]'} ${
          editable ? 'cursor-pointer hover:text-emerald-600' : 'cursor-default'
        }`}
      >
        {check.isComplete ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${
            check.isComplete ? 'text-emerald-800' : 'text-[#0A3340]'
          }`}>
            {check.label}
          </span>
          {check.severity === 'required' && !check.isComplete && (
            <Badge variant="danger" size="sm" className="text-[10px] bg-red-100 text-red-700 border-red-200">
              Required
            </Badge>
          )}
          {check.severity === 'recommended' && !check.isComplete && (
            <Badge variant="warning" size="sm" className="text-[10px] bg-[#DDF4F0] text-[#12576D] border-[#BDE5DE]">
              Recommended
            </Badge>
          )}
          {check.isVerified && (
            <Badge variant="success" size="sm" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
              <FileCheck className="w-3 h-3 mr-0.5" />
              Verified
            </Badge>
          )}
          {check.expiryDate && (
            <Badge variant="neutral" size="sm" className="text-[10px] bg-[#EEF7F5] text-[#64748B] border-[#D7E7E4]">
              <Clock className="w-3 h-3 mr-0.5" />
              Expires: {new Date(check.expiryDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
        <p className="text-xs text-[#64748B] mt-0.5">{check.description}</p>
        {check.documentUrl && (
          <a
            href={check.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#176B87] font-medium mt-1 flex items-center gap-1 hover:underline"
          >
            View Document
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};

// Category section accordion
const ComplianceCategorySection: React.FC<{
  category: ComplianceCategory;
  checks: ComplianceCheck[];
  isExpanded: boolean;
  onToggle: () => void;
  onCheckToggle?: (checkId: string, complete: boolean) => void;
  editable?: boolean;
}> = ({ category, checks, isExpanded, onToggle, onCheckToggle, editable }) => {
  const categoryInfo = COMPLIANCE_CATEGORIES[category];
  const completedCount = checks.filter(c => c.isComplete).length;
  const totalCount = checks.length;
  const requiredCount = checks.filter(c => c.severity === 'required').length;
  const requiredComplete = checks.filter(c => c.severity === 'required' && c.isComplete).length;
  const isComplete = completedCount === totalCount;
  const hasIncompleteRequired = requiredComplete < requiredCount;

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isComplete ? 'border-emerald-200' : hasIncompleteRequired ? 'border-red-200' : 'border-[#D7E7E4]'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isComplete ? 'bg-emerald-50 hover:bg-emerald-100' : hasIncompleteRequired ? 'bg-red-50 hover:bg-red-100' : 'bg-[#F6FAF9] hover:bg-[#EEF7F5]'
        }`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isComplete ? 'bg-emerald-100 text-emerald-600' : hasIncompleteRequired ? 'bg-red-100 text-red-600' : 'bg-white text-[#64748B]'
        }`} style={{ color: categoryInfo.color }}>
          {CATEGORY_ICONS[category]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-[#176B87]">{categoryInfo.label}</h4>
          <p className="text-xs text-[#64748B]">{categoryInfo.description}</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-[#176B87]">{completedCount}/{totalCount}</div>
          {requiredCount > 0 && (
            <div className="text-[10px] text-[#64748B]">
              {requiredComplete}/{requiredCount} required
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-white space-y-2">
          {checks.map(check => (
            <ComplianceCheckItem
              key={check.id}
              check={check}
              onToggle={onCheckToggle}
              editable={editable}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Main checklist component
export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({
  checks,
  onCheckToggle,
  onViewPolicy,
  onSubmitForReview,
  isEditable = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<ComplianceCategory>>(
    new Set(['organization', 'financial'])
  );

  const checksByCategory = getChecksByCategory(checks);
  const summary = getComplianceSummary(checks);

  const toggleCategory = (category: ComplianceCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleCheckToggle = (checkId: string, isComplete: boolean) => {
    onCheckToggle?.(checkId, isComplete);
  };

  const canSubmitForReview = summary.requiredCompleted === summary.required;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card className="p-5 bg-gradient-to-r from-[#0A3340] to-[#12576d] text-white border-none">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Progress Ring */}
          <div className="relative w-24 h-24">
            <svg className="transform -rotate-90" width="96" height="96">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke={summary.requiredCompleted === summary.required ? '#10B981' : '#176b87'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - summary.percentage / 100)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">{summary.percentage}%</span>
              <span className="text-[10px] text-[#94A3B8]">Complete</span>
            </div>
          </div>

          {/* Summary */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black mb-2">
              Compliance Checklist
            </h3>
            <p className="text-[#BDE5DE] text-sm mb-4">
              {canSubmitForReview
                ? 'All required items are complete. Ready to submit for review.'
                : `${summary.required - summary.requiredCompleted} required items must be completed before submitting.`
              }
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${summary.requiredCompleted === summary.required ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-sm text-[#BDE5DE]">
                  {summary.requiredCompleted}/{summary.required} Required
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#13B8A6]" />
                <span className="text-sm text-[#BDE5DE]">
                  {summary.recommendedCompleted}/{summary.recommended} Recommended
                </span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            size="lg"
            disabled={!canSubmitForReview}
            onClick={onSubmitForReview}
            className={`px-6 font-bold ${
              canSubmitForReview
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-[#91CEC5] text-[#64748B] cursor-not-allowed'
            }`}
          >
            {canSubmitForReview ? (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Submit for Review
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 mr-2" />
                Complete Required Items
              </>
            )}
          </Button>
        </div>

        {/* Not Ready Notice */}
        {!canSubmitForReview && (
          <div className="mt-4 p-3 bg-[#13B8A6]/20 border border-[#5AAFA4]/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#13B8A6] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#13B8A6]">Required Items Incomplete</p>
              <p className="text-xs text-[#BDE5DE] mt-1">
                Please complete all required compliance items before submitting your auction for review.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Category Sections */}
      <div className="space-y-3">
        {Object.entries(checksByCategory)
          .filter(([_, checks]) => checks.length > 0)
          .sort(([a], [b]) => {
            const order = Object.keys(COMPLIANCE_CATEGORIES);
            return order.indexOf(a) - order.indexOf(b);
          })
          .map(([category, categoryChecks]) => (
            <ComplianceCategorySection
              key={category}
              category={category as ComplianceCategory}
              checks={categoryChecks}
              isExpanded={expandedCategories.has(category as ComplianceCategory)}
              onToggle={() => toggleCategory(category as ComplianceCategory)}
              onCheckToggle={handleCheckToggle}
              editable={isEditable}
            />
          ))
        }
      </div>

      {/* Bottom Action */}
      {canSubmitForReview && onSubmitForReview && (
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={onSubmitForReview}
            className="px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Submit for Compliance Review
          </Button>
        </div>
      )}
    </div>
  );
};

export default ComplianceChecklist;
