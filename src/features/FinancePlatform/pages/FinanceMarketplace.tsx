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
}

export const FinanceMarketplace: React.FC<FinanceMarketplaceProps> = ({ user, onOpenAuth }) => {
  const [vehiclePrice, setVehiclePrice] = useState(2500000);
  const [deposit, setDeposit] = useState(500000);
  const [termMonths, setTermMonths] = useState(48);
  const [rate, setRate] = useState(13);

  const loanAmount = Math.max(0, vehiclePrice - deposit);
  const monthlyRate = rate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths))
    : loanAmount / termMonths;
  const totalCost = monthlyPayment * termMonths + deposit;

  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('employed');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [myApplications, setMyApplications] = useState<LoanApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  useEffect(() => {
    if (!user) { setLoadingApps(false); return; }
    let cancelled = false;
    getMyLoanApplications()
      .then((apps) => { if (!cancelled) setMyApplications(apps); })
      .catch(() => { /* a failed load shouldn't block the rest of the page */ })
      .finally(() => { if (!cancelled) setLoadingApps(false); });
    return () => { cancelled = true; };
  }, [user, submitted]);

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
        <h1 className="text-2xl font-bold text-[#1E3063] font-display">Vehicle Financing</h1>
        <p className="text-sm text-slate-500 mt-1">Estimate your monthly payment and apply for financing</p>
      </div>

      {/* CALCULATOR - honest, local arithmetic, no named lenders */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-[#C85A32]" />
          <h2 className="text-sm font-bold text-[#1E3063]">Affordability Calculator</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <label className="text-xs text-slate-600">
            Vehicle price (Ksh)
            <input type="number" value={vehiclePrice} onChange={(e) => setVehiclePrice(Number(e.target.value) || 0)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">
            Deposit (Ksh)
            <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value) || 0)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">
            Term (months)
            <select value={termMonths} onChange={(e) => setTermMonths(Number(e.target.value))} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value={24}>24</option>
              <option value={36}>36</option>
              <option value={48}>48</option>
              <option value={60}>60</option>
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Estimated interest rate (% p.a.)
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 0)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="bg-[#F5F2EB] rounded-xl p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Loan Amount</p>
            <p className="text-sm font-bold text-[#1E3063]">Ksh {loanAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Est. Monthly Payment</p>
            <p className="text-sm font-bold text-[#1E3063]">Ksh {Math.round(monthlyPayment).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Cost</p>
            <p className="text-sm font-bold text-[#1E3063]">Ksh {Math.round(totalCost).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Estimate only - actual rates and terms depend on the lender's own assessment.</p>
      </section>

      {/* REAL APPLICATION FORM */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#C85A32]" />
          <h2 className="text-sm font-bold text-[#1E3063]">Apply for Financing</h2>
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
              <label className="text-xs text-slate-600">
                Monthly income (Ksh)
                <input type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} required className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </label>
              <label className="text-xs text-slate-600">
                Employment status
                <select value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value="employed">Employed</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="business_owner">Business owner</option>
                </select>
              </label>
            </div>
            <p className="text-[10px] text-slate-400">Uses the vehicle price, deposit, and term from the calculator above.</p>
            <button type="submit" disabled={submitting} className="bg-[#1E3063] hover:bg-[#17244B] text-white text-xs font-bold rounded-lg px-5 py-2.5 disabled:opacity-50">
              {submitting ? 'Submitting…' : user ? 'Submit Application' : 'Sign In to Apply'}
            </button>
          </form>
        )}
      </section>

      {/* REAL TRACKER - the user's own real applications */}
      {user && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-[#C85A32]" />
            <h2 className="text-sm font-bold text-[#1E3063]">My Applications</h2>
          </div>
          {loadingApps ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : myApplications.length === 0 ? (
            <p className="text-xs text-slate-400">No applications yet.</p>
          ) : (
            <div className="space-y-2">
              {myApplications.map((app) => (
                <div key={app.id} className="border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#1E3063]">Ksh {app.loanAmount.toLocaleString()} over {app.termMonths} months</p>
                    <p className="text-[11px] text-slate-500">Submitted {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'declined' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
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
