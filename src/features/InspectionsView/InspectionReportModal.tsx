import React, { useCallback, useEffect, useState } from 'react';
import { FileCheck, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { inspectionApi } from '../InspectionMarketplace/services/api';
import type { InspectionReport } from '../InspectionMarketplace/types/inspection';
import { InspectionRecord, kayadReportView } from './inspectionJourney';

interface InspectionReportModalProps {
  record: InspectionRecord | null;
  onClose: () => void;
}

const humanise = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const Fact: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm">
    <dt className="text-[#64748B]">{label}</dt>
    <dd className="font-semibold text-[#0A3340] text-right">{value ?? <span className="text-[#94A3B8] font-medium">Not provided</span>}</dd>
  </div>
);

const ScoreBlock: React.FC<{ score?: number; condition?: string }> = ({ score, condition }) => (
  <div className="rounded-2xl bg-[#176B87] text-white p-5 flex items-center justify-between gap-4">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#DDF4F0]">Overall score</p>
      <p className="text-3xl font-black font-mono text-[#B8EEE7]">{score !== undefined ? `${score}/100` : 'Not recorded'}</p>
    </div>
    <div className="text-right">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#DDF4F0]">Condition</p>
      <p className="text-base font-bold">{condition || 'Not recorded'}</p>
    </div>
  </div>
);

export const InspectionReportModal: React.FC<InspectionReportModalProps> = ({ record, onClose }) => {
  const [provider, setProvider] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerReportId = record?.report?.kind === 'provider' ? record.report.reportId : null;

  const load = useCallback(async () => {
    if (!providerReportId) return;
    setLoading(true);
    setError(null);
    try {
      setProvider(await inspectionApi.getReport(providerReportId));
    } catch {
      setProvider(null);
      setError('This report could not be loaded. It is only available to the customer who booked the inspection.');
    } finally {
      setLoading(false);
    }
  }, [providerReportId]);

  useEffect(() => {
    setProvider(null);
    void load();
  }, [load]);

  if (!record || !record.report) return null;

  return (
    <Modal isOpen onClose={onClose} title={`Inspection report — ${record.vehicleTitle}`} size="xl">
      {record.report.kind === 'kayad' ? (
        <KayadReport record={record} />
      ) : loading ? (
        <p role="status" className="flex items-center gap-2 text-sm text-[#64748B] py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Loading your report…</p>
      ) : error ? (
        <div role="alert" className="space-y-3 py-4 text-center">
          <p className="text-sm text-rose-700">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Try again</Button>
        </div>
      ) : provider ? (
        <ProviderReport report={provider} />
      ) : null}
      <div className="flex justify-end pt-5 mt-5 border-t border-[#D7E7E4]">
        <Button variant="secondary" onClick={onClose}>Close report</Button>
      </div>
    </Modal>
  );
};

const KayadReport: React.FC<{ record: InspectionRecord }> = ({ record }) => {
  if (record.report?.kind !== 'kayad') return null;
  const view = kayadReportView(record.report.order);
  return (
    <div className="space-y-5">
      <ScoreBlock score={view.score} condition={view.conditionRating} />
      <dl className="space-y-2 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
        <Fact label="Order reference" value={<span className="font-mono break-all">{view.reference}</span>} />
        <Fact label="Inspector" value={view.inspectorName} />
        <Fact label="Carried out by" value={view.businessName} />
        <Fact label="Completed" value={view.completedOn} />
      </dl>
      <section aria-labelledby="kayad-report-notes" className="space-y-1.5">
        <h3 id="kayad-report-notes" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Inspector’s notes</h3>
        <p className="text-sm text-[#12576D] leading-relaxed rounded-xl border border-[#D7E7E4] bg-white p-4 whitespace-pre-line">{view.notes || 'The inspector did not leave notes on this report.'}</p>
      </section>
      {view.checklist.length > 0 && (
        <section aria-labelledby="kayad-report-checklist" className="space-y-1.5">
          <h3 id="kayad-report-checklist" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Checklist ({view.checklist.length})</h3>
          <ul className="divide-y divide-[#D7E7E4] rounded-xl border border-[#D7E7E4] bg-white text-sm">
            {view.checklist.map((item, i) => (
              <li key={`${item.label}-${i}`} className="flex justify-between gap-3 px-4 py-2.5"><span className="text-[#12576D]">{item.label}</span>{item.result && <span className="font-semibold text-[#0A3340]">{item.result}</span>}</li>
            ))}
          </ul>
        </section>
      )}
      {view.photos.length > 0 && (
        <section aria-labelledby="kayad-report-photos" className="space-y-1.5">
          <h3 id="kayad-report-photos" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Inspection photos ({view.photos.length})</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {view.photos.map((url, i) => (
              <li key={url}><a href={url} target="_blank" rel="noopener noreferrer"><img src={url} loading="lazy" alt={`Inspection photo ${i + 1} of ${record.vehicleTitle}`} className="aspect-[4/3] w-full rounded-lg object-cover border border-[#D7E7E4]" /></a></li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-[#64748B] flex items-start gap-1.5"><FileCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />This report shows only what the inspector submitted to KAYAD. Items that were not recorded are not shown.</p>
    </div>
  );
};

const ProviderReport: React.FC<{ report: InspectionReport }> = ({ report }) => {
  const scores = Object.entries(report.categoryScores || {}).filter(([, v]) => typeof v === 'number' && Number.isFinite(v as number));
  const critical = Array.isArray(report.criticalIssues) ? report.criticalIssues : [];
  const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
  return (
    <div className="space-y-5">
      <ScoreBlock score={typeof report.overallScore === 'number' ? Number(report.overallScore) : undefined} condition={report.overallCondition ? humanise(String(report.overallCondition)) : undefined} />
      <dl className="space-y-2 rounded-xl border border-[#D7E7E4] bg-[#F6FAF9] p-4">
        <Fact label="Report number" value={<span className="font-mono">{report.reportNumber}</span>} />
        <Fact label="Provider" value={report.provider?.name} />
        <Fact label="Inspector" value={report.inspector?.name} />
        <Fact label="Package" value={report.package?.name} />
        <Fact label="Inspection date" value={report.inspectionDate ? new Date(report.inspectionDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined} />
      </dl>
      {report.executiveSummary && (
        <section aria-labelledby="provider-report-summary" className="space-y-1.5">
          <h3 id="provider-report-summary" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Summary</h3>
          <p className="text-sm text-[#12576D] leading-relaxed rounded-xl border border-[#D7E7E4] bg-white p-4 whitespace-pre-line">{report.executiveSummary}</p>
        </section>
      )}
      {critical.length > 0 && (
        <section aria-labelledby="provider-report-critical" className="space-y-1.5">
          <h3 id="provider-report-critical" className="text-xs font-bold uppercase tracking-wider text-rose-700">Critical issues ({critical.length})</h3>
          <ul className="space-y-2">
            {critical.map((issue, i) => (
              <li key={i} className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><strong>{issue.category}{issue.item ? ` — ${issue.item}` : ''}.</strong> {issue.description}</li>
            ))}
          </ul>
        </section>
      )}
      {scores.length > 0 && (
        <section aria-labelledby="provider-report-scores" className="space-y-1.5">
          <h3 id="provider-report-scores" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Scores by area</h3>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 rounded-xl border border-[#D7E7E4] bg-white p-4 text-sm">
            {scores.map(([area, value]) => (
              <li key={area} className="flex justify-between gap-3"><span className="text-[#64748B]">{humanise(area)}</span><span className="font-semibold text-[#0A3340]">{String(value)}/100</span></li>
            ))}
          </ul>
        </section>
      )}
      {recommendations.length > 0 && (
        <section aria-labelledby="provider-report-recs" className="space-y-1.5">
          <h3 id="provider-report-recs" className="text-xs font-bold uppercase tracking-wider text-[#176B87]">Recommendations</h3>
          <ul className="list-disc pl-5 text-sm text-[#12576D] space-y-1">{recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </section>
      )}
      {report.pdfUrl && (
        <p><a className="text-sm font-bold text-[#12576d] underline underline-offset-2" href={`/api/inspection/reports/${encodeURIComponent(report.id)}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF report</a></p>
      )}
    </div>
  );
};

export default InspectionReportModal;
