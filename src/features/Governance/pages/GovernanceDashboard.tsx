import { useEffect, useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { getGovernanceDashboard } from '../../../services/governanceApi';

export default function GovernanceDashboard() {
  const [message, setMessage] = useState('Checking governance data availability…');

  useEffect(() => {
    getGovernanceDashboard()
      .then(() => setMessage('Governance data is available.'))
      .catch((error) => {
        const code = error?.response?.data?.code;
        setMessage(code === 'GOVERNANCE_NOT_CONFIGURED'
          ? 'Governance records are not yet configured in the authoritative database.'
          : 'Governance data could not be loaded.');
      });
  }, []);

  return (
    <section className="min-h-[400px] rounded-xl border border-[#D7E7E4] bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-[#EEF7F5] p-3"><Shield className="text-[#12576D]" size={24} /></div>
        <div>
          <h1 className="text-xl font-semibold text-[#0A3340]">Governance & Risk</h1>
          <p className="mt-1 text-sm text-[#64748B]">Production governance data is shown only when backed by the authoritative database.</p>
        </div>
      </div>
      <div className="mt-8 rounded-lg border border-[#BDE5DE] bg-[#F3FAF9] p-4 text-sm text-[#0A3340]">
        <div className="flex gap-3"><AlertTriangle size={20} className="mt-0.5 shrink-0" /><span>{message}</span></div>
      </div>
    </section>
  );
}
