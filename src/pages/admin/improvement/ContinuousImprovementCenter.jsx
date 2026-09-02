import { AlertTriangle } from 'lucide-react';

export default function ContinuousImprovementCenter() {
  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-1 text-amber-600" size={24} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Continuous Improvement</h1>
          <p className="mt-2 text-sm text-slate-600">Improvement analytics, experiments, roadmaps, and recommendations are unavailable until an authoritative production data source is configured.</p>
        </div>
      </div>
    </section>
  );
}
