import React, { useState, useRef } from 'react';
import { HelpCircle, ShieldCheck, CheckCircle2, MessageSquare } from 'lucide-react';
import { PageHeader, Card, Select, Textarea, Button, Badge } from '../../../components/ui';
import SupportFAQ from './SupportFAQ';

export const SupportView: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [issue, setIssue] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;
    setSubmitted(true);
  };

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        badgeIcon={<HelpCircle className="w-4 h-4 text-amber-500" />}
        badgeText="24/7 Buyer & Seller Support"
        title="Escrow Protection, Inspections & Help Center"
        description="Self-service knowledge base, instant FAQ search, and dedicated resolution team for East Africa vehicle transactions."
        rightElement={
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-400 font-semibold uppercase">Resolution Hotline</p>
            <p className="text-sm font-extrabold text-[#1E3063]">+254 700 000 999</p>
          </div>
        }
      />

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) ACCORDION FEATURE */}
      <SupportFAQ onContactSupport={handleScrollToForm} />

      {/* Support Grid (Ticket Submission + Guarantee) */}
      <div ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
        {/* Help Form */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1E3063] font-display flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Submit Ticket or Open Dispute
            </h3>
            <Badge variant="accent" size="sm">15-Min Response SLA</Badge>
          </div>

          {submitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <p className="font-bold">Support Request Received (#SUP-882)</p>
              <p>A KAYAD Escrow & Technical Audit Agent will contact you within 15 minutes.</p>
              <button onClick={() => { setSubmitted(false); setIssue(''); }} className="text-emerald-800 font-bold underline pt-2 cursor-pointer">
                Submit another inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <Select
                label="Inquiry Category"
                options={[
                  { value: 'escrow', label: 'Escrow Vault Deposit & Refund' },
                  { value: 'inspection', label: '150-Point Inspection Verification' },
                  { value: 'financing', label: 'Bank Auto Loan Pre-Approval' },
                  { value: 'ntsa', label: 'NTSA TIMS Logbook Transfer' },
                  { value: 'seller', label: 'Seller & Yard Verification' }
                ]}
              />

              <Textarea
                label="Describe Issue"
                rows={4}
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Provide vehicle title, deal reference (e.g. ESC-901-KE), or inspection ID..."
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
              >
                Submit Support Ticket
              </Button>
            </form>
          )}
        </Card>

        {/* Guarantee Info */}
        <div className="bg-[#1E3063] text-white rounded-2xl p-6 shadow-card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> 100% Buyer Protection Guarantee
            </span>
            <h4 className="text-lg font-bold font-display">Zero Risk Vehicle Purchases</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              If a vehicle fails inspection or logbook verification during the escrow hold, 100% of your deposit is refunded immediately to your M-Pesa or bank account without penalties.
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs text-slate-200 space-y-1">
            <p className="font-bold text-white">Nairobi Resolution Center:</p>
            <p>Westlands Business Hub, Floor 4, Waiyaki Way, Nairobi, Kenya</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportView;

