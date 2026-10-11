import React, { useEffect, useState } from 'react';
import { Calculator, FileText, ClipboardList, Loader2 } from 'lucide-react';
import { createLoanApplication, getMyLoanApplications, LoanApplication, LoanApiError } from '../../../services/loanApi';
import type { UserProfile } from '../../../types';

/**
 * Rebuilt entirely - the original (2005 lines, 11 sections: home,
 * marketplace, calculator, pre-qualification, application, tracker,
 * documents, bank-portal, dealer-center, leasing, insurance) had zero
 * real backend connection anywhere (confirmed directly - no fetch/
 * service imports in the entire file) and, separately, still named
 * specific banks and a specific SACCO as available lenders despite
 * this project having no signed partnership with any of them (fixed
 * in an earlier pass on this same file).
 *
 * Rebuilt around what's genuinely real and achievable:
 * - a real affordability calculator - honest, local arithmetic, no
 *   backend needed, no named lenders.
 * - a real application form and a real tracker showing the buyer's
 *   own real, submitted applications and their real status, both
 *   backed by a new, real backend built for this rebuild
 *   (backend/models/LoanApplication.js, loan_applications table,
 *   services/loanApi.ts) - a buyer applies once, an admin reviews and
 *   updates the real status, the buyer sees the real result.
 * Left out (not attempted as fake versions): pre-qualification,
 * documents vault, a separate bank-review portal, a dealer center,
 * leasing, and insurance - none of these have a real backend
 * equivalent, and building a real version of any of them (especially
 * a real bank-side underwriting portal) is a genuinely separate,
 * larger undertaking than this rebuild.
 */

interface FinanceMarketplaceProps {
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onNavigate?: (section: string) => void;
  mode?: 'public' | 'account';
}

export const FinanceMarketplace: React.FC<FinanceMarketplaceProps> = ({ user, onOpenAuth, onNavigate, mode = 'public' }) => {
  const userId = String(user?.id || (user as UserProfile & { _id?: string } | null | undefined)?._id || '');
  const [vehiclePrice, setVehiclePrice] = useState(2500000);
  const [deposit, setDeposit] = useState(500000);
  const [termMonths, setTermMonths] = useState(48);
  const [rate, setRate] = useState(13);

  const safeVehiclePrice = Math.max(1, Number(vehiclePrice) || 1);
  const safeDeposit = Math.min(Math.max(0, Number(deposit) || 0), safeVehiclePrice - 1);
  const safeTermMonths = Math.max(1, Number(termMonths) || 1);
  const safeRate = Math.min(100, Math.max(0, Number(rate) || 0));
  const loanAmount = Math.max(1, safeVehiclePrice - safeDeposit);
  const monthlyRate = safeRate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -safeTermMonths))
    : loanAmount / safeTermMonths;
  const totalCost = monthlyPayment * safeTermMonths + safeDeposit;

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('employed');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [myApplications, setMyApplications] = useState<LoanApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [reloadApps, setReloadApps] = useState(0);

  useEffect(() => {
    if (mode !== 'account' || !userId) {
      setMyApplications([]);
      setAppsError(null);
      setLoadingApps(false);
      return;
    }
    let cancelled = false;
    setLoadingApps(true);
    setAppsError(null);
    setMyApplications([]);
    getMyLoanApplications()
      .then((apps) => { if (!cancelled) setMyApplications(apps); })
      .catch(() => { if (!cancelled) setAppsError('Your financing applications could not be loaded. Try again.'); })
      .finally(() => { if (!cancelled) setLoadingApps(false); });
    return () => { cancelled = true; };
  }, [mode, userId, submitted, reloadApps]);

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onOpenAuth?.(); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createLoanApplication({
        vehiclePrice,
        depositAmount: deposit,
        loanAmount,
        termMonths,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : undefined,
        employmentStatus,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof LoanApiError ? err.message : 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold text-[#176B87] font-display">Vehicle Financing</h1>
        <p className="text-sm text-[#64748B] mt-1">{mode === 'account' ? 'Manage your private financing request and review its recorded status.' : 'Explore affordability estimates and understand the financing request process.'}</p>
      </div>

      {/* CALCULATOR - honest, local arithmetic, no named lenders */}
      <section className="bg-white border border-[#D7E7E4] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#176B87]" />
          <h2 className="text-sm font-bold text-[#176B87]">Affordability Calculator</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <label className="text-xs text-[#64748B]">
            Vehicle price (Ksh)
            <input type="number" min={1} value={vehiclePrice} onChange={(e) => { const next = Math.max(1, Number(e.target.value) || 1); setVehiclePrice(next); if (deposit >= next) setDeposit(Math.max(0, next - 1)); }} className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#64748B]">
            Deposit (Ksh)
            <input type="number" min={0} max={Math.max(0, vehiclePrice - 1)} value={deposit} onChange={(e) => setDeposit(Math.min(Math.max(0, Number(e.target.value) || 0), Math.max(0, vehiclePrice - 1)))} className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#64748B]">
            Term (months)
            <select value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm">
              <option value={24}>24</option>
              <option value={36}>36</option>
              <option value={48}>48</option>
              <option value={60}>60</option>
            </select>
          </label>
          <label className="text-xs text-[#64748B]">
            Illustrative annual rate assumption (% p.a.)
            <input type="number" min={0} max={100} value={rate} onChange={(e) => setRate(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="bg-[#F5F2EB] rounded-xl p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-[#64748B] uppercase font-bold">Loan Amount</p>
            <p className="text-sm font-bold text-[#176B87]">Ksh {loanAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase font-bold">Est. Monthly Payment</p>
            <p className="text-sm font-bold text-[#176B87]">Ksh {Math.round(monthlyPayment).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] uppercase font-bold">Total Cost</p>
            <p className="text-sm font-bold text-[#176B87]">Ksh {Math.round(totalCost).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-[#64748B] mt-2">Illustration only. The rate is an editable assumption, not a KAYAD offer or a quote from a lender. Actual rates, fees, eligibility and terms must be confirmed with the lender.</p>
      </section>

      {mode === 'public' && (
        <section className="bg-white border border-[#D7E7E4] rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-[#176B87]">How vehicle financing works through KAYAD</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">KAYAD can record a financing request and show the status recorded by its backend. KAYAD is not a lender, and a submitted request is not an approval or a lender offer.</p>
          </div>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-[#64748B]">
            <li>Verified lender offers, rates and fees are not currently displayed on this page.</li>
            <li>Eligibility, document requirements, final terms and lending decisions belong to the lender handling an application.</li>
            <li>Do not send identity or financial documents through informal messages. Follow only the authenticated process and instructions presented for your request.</li>
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-[#D7E7E4] pt-4">
            <button type="button" onClick={() => user ? onNavigate?.('buyer-platform') : onOpenAuth?.()} className="rounded-lg bg-[#176B87] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A3340]">{user ? 'Manage financing in My Garage' : 'Sign in to manage financing'}</button>
            <span className="text-xs text-[#64748B]">Applications and their recorded status are available in your private account workspace.</span>
          </div>
        </section>
      )}

      {/* APPLICATION FORM IS ONLY RENDERED INSIDE THE AUTHENTICATED ACCOUNT WORKSPACE. */}
      {mode === 'account' && (
      <section className="bg-white border border-[#D7E7E4] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#176B87]" />
          <h2 className="text-sm font-bold text-[#176B87]">Apply for Financing</h2>
        </div>
        {submitted ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <p className="font-bold mb-1">Application submitted</p>
            <p>We'll review your application and update its status below.</p>
            <button onClick={() => setSubmitted(false)} className="text-emerald-800 font-bold underline mt-2">Submit another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-3">
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold">{submitError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs text-[#64748B]">
                Monthly income (Ksh)
                <input type="number" min={0} value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} required className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="text-xs text-[#64748B]">
                Employment status
                <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className="w-full mt-1 border border-[#D7E7E4] rounded-lg px-3 py-2 text-sm">
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="business_owner">Business owner</option>
                </select>
              </label>
            </div>
            <p className="text-[10px] text-[#94A3B8]">Uses the vehicle price, deposit, and term from the calculator above.</p>
            <button type="submit" disabled={submitting} className="bg-[#176B87] hover:bg-[#0A3340] text-white text-xs font-bold rounded-lg px-5 py-2.5 disabled:opacity-50">
              {submitting ? 'Submitting…' : user ? 'Submit Application' : 'Sign In to Apply'}
            </button>
          </form>
        )}
      </section>
      )}

      {/* REAL TRACKER - the user's own real applications, inside My Garage only */}
      {mode === 'account' && user && (
        <section className="bg-white border border-[#D7E7E4] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-[#176B87]" />
            <h2 className="text-sm font-bold text-[#176B87]">My Applications</h2>
          </div>
          {loadingApps ? (
            <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
              <Loader2 className="w-5 h-5 text-[#94A3B8] animate-spin" />
              <span className="ml-2 text-xs text-[#64748B]">Loading your applications…</span>
            </div>
          ) : appsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
              <p>{appsError}</p>
              <button type="button" onClick={() => setReloadApps((value) => value + 1)} className="mt-2 font-bold underline">Retry</button>
            </div>
          ) : myApplications.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">No applications yet.</p>
          ) : (
            <div className="space-y-2">
              {myApplications.map((app) => (
                <div key={app.id} className="border border-[#D7E7E4] rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#176B87]">Ksh {app.loanAmount.toLocaleString()} over {app.termMonths} months</p>
                    <p className="text-[11px] text-[#64748B]">Submitted {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                    'bg-[#DDF4F0] text-[#12576D]'
                  }`}>
                    {app.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default FinanceMarketplace;
