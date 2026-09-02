import { AlertTriangle } from 'lucide-react';

export default function EnterpriseCommandCenter() {
  return (
    <section className="min-h-[400px] rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-1 text-amber-600" size={24} />
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Enterprise Command Center</h1>
          <p className="mt-2 text-sm text-slate-600">Live command-center telemetry is not configured. No synthetic KPIs, activity, alerts, or operational actions are displayed.</p>
        </div>
      </div>
    </section>
  );
}
