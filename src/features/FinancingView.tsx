import React, { useState } from 'react';
import { 
  CreditCard, 
  Calculator, 
  ArrowRight, 
  Landmark, 
  CheckCircle2, 
  Percent, 
  FileCheck, 
  Sparkles, 
  ShieldCheck, 
  Building2,
  Clock
} from 'lucide-react';
import { PageHeader, StatWidget, Card, Badge, Button } from '../components/ui';

export const FinancingView: React.FC = () => {
  const [vehiclePrice, setVehiclePrice] = useState<number>(3500000);
  const [depositPercent, setDepositPercent] = useState<number>(20);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [isApplied, setIsApplied] = useState<boolean>(false);

  const depositAmount = (vehiclePrice * depositPercent) / 100;
  const loanAmount = Math.max(0, vehiclePrice - depositAmount);
  const monthlyInterestRate = 0.13 / 12; // 13% p.a. reducing balance
  const estimatedMonthly = Math.round(
    (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -tenureMonths))
  );

  const partnerBanks = [
    { name: 'NCBA Drive', rate: '12.8% p.a.', maxFinancing: '80%', turnaround: '24 Hours', badge: 'Preferred Partner' },
    { name: 'Equity Bank Asset Finance', rate: '13.0% p.a.', maxFinancing: '85%', turnaround: '48 Hours', badge: 'Pre-Approved' },
    { name: 'KCB Auto Loan', rate: '13.2% p.a.', maxFinancing: '80%', turnaround: '24 Hours', badge: 'Express Approval' },
    { name: 'Absa Vehicle Finance', rate: '13.5% p.a.', maxFinancing: '80%', turnaround: '36 Hours', badge: 'KRA Verified' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        badgeIcon={<CreditCard className="w-4 h-4 text-amber-500" />}
        badgeText="Tier-1 Bank Auto Financing"
        title="Pre-Approved Vehicle Asset Financing Portal"
        description="Calculate instant loan installments and secure up to 85% asset financing through East Africa's leading banking partners."
        rightElement={
          <div className="flex gap-2 flex-wrap">
            <Badge variant="neutral" size="md">NCBA Drive</Badge>
            <Badge variant="neutral" size="md">KCB Auto</Badge>
            <Badge variant="neutral" size="md">Equity Asset</Badge>
          </div>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Maximum Financing LTV"
          value="Up to 85%"
          trend="20% Minimum Down Payment"
          trendType="positive"
          icon={<Percent className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Partner Bank Rates"
          value="12.8% p.a."
          trend="Reducing Balance Rate"
          trendType="positive"
          icon={<Landmark className="w-4 h-4 text-blue-500" />}
        />

        <StatWidget
          label="Approval Decision Time"
          value="< 24 Hours"
          trend="KAYAD Express Route"
          trendType="neutral"
          icon={<Clock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Logbook Requirement"
          value="Joint Ownership"
          trend="TIMS Transfer Handled"
          trendType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
        />
      </div>

      {/* Interactive Loan Estimator Command Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Controls Card (7 Cols) */}
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              Asset Financing Estimator Console
            </h3>
            <Badge variant="success" size="sm">
              Instant Calculation
            </Badge>
          </div>

          {/* Vehicle Price Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Vehicle Purchase Price</span>
              <span className="text-[#1E3063] font-black text-sm">Ksh {vehiclePrice.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000000}
              max={15000000}
              step={250000}
              value={vehiclePrice}
              onChange={(e) => setVehiclePrice(Number(e.target.value))}
              className="w-full accent-[#1E3063] cursor-pointer"
            />
          </div>

          {/* Deposit Percent Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Down Payment ({depositPercent}%)</span>
              <span className="text-emerald-700 font-black text-sm">Ksh {depositAmount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={depositPercent}
              onChange={(e) => setDepositPercent(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Loan Tenure Selection Pills */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Loan Repayment Period</span>
              <span className="text-[#1E3063] font-black text-sm">{tenureMonths} Months ({(tenureMonths / 12).toFixed(1)} Yrs)</span>
            </div>
            <div className="grid grid-cols-5 gap-2 pt-1 text-xs">
              {[12, 24, 36, 48, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setTenureMonths(m)}
                  className={`py-2.5 rounded-xl font-extrabold border transition-all ${
                    tenureMonths === m
                      ? 'bg-[#1E3063] text-white border-[#1E3063] shadow-md scale-95'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Calculation Result & Action Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1E3063] via-[#17244B] to-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 border border-amber-400/30">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Monthly Repayment
              </span>
              <Badge variant="accent" size="sm">
                Reducing Balance
              </Badge>
            </div>

            <div className="text-4xl font-black font-display text-white">
              Ksh {estimatedMonthly.toLocaleString()} <span className="text-xs font-semibold text-slate-300">/ month</span>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-white/10 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Financed Principal Amount:</span>
                <span className="font-extrabold text-white">Ksh {loanAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Interest Rate Estimate:</span>
                <span className="font-extrabold text-emerald-400">13% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Logbook Security:</span>
                <span className="font-extrabold text-amber-300">Joint Bank Ownership</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {isApplied ? (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-xl text-xs font-bold text-center space-y-1">
                <p className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Pre-Approval Request Submitted!
                </p>
                <p className="text-[11px] text-slate-300 font-normal">A financing agent will contact you within 2 hours.</p>
              </div>
            ) : (
              <Button 
                variant="accent" 
                size="lg" 
                fullWidth
                onClick={() => setIsApplied(true)}
              >
                <span>Apply for Instant Pre-Approval</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

      </div>

      {/* Partner Bank Options Grid */}
      <div className="space-y-4 pt-2">
        <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
          <Landmark className="w-5 h-5 text-amber-500" />
          Top Partner Banking Rates & Loan Features
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {partnerBanks.map((bank, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-amber-400 transition-all shadow-xs">
              <div className="flex items-center justify-between">
                <Badge variant="verified" size="sm">
                  {bank.badge}
                </Badge>
                <span className="text-[10px] text-slate-400 font-bold">{bank.turnaround}</span>
              </div>

              <div>
                <h4 className="font-extrabold text-[#1E3063] text-sm">{bank.name}</h4>
                <p className="text-lg font-black text-[#1E3063] mt-0.5">{bank.rate}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1 font-medium">
                <p className="flex justify-between">
                  <span>Max LTV Financing:</span>
                  <strong className="text-slate-800">{bank.maxFinancing}</strong>
                </p>
                <p className="flex justify-between">
                  <span>150-Pt Audit Status:</span>
                  <strong className="text-emerald-700">Pre-Qualified</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default FinancingView;
