import { useState, useMemo } from 'react';
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';

const EXCISE_RATES = [
  { max: 1500, rate: 0.20, label: '≤ 1500cc' },
  { max: 2500, rate: 0.25, label: '1501–2500cc' },
  { max: Infinity, rate: 0.30, label: '> 2500cc' },
];

const BANK_RATES = [
  { name: 'KCB', rate: 0.13, years: [1, 2, 3, 4, 5] },
  { name: 'Equity', rate: 0.14, years: [1, 2, 3, 4, 5] },
  { name: 'Co-op', rate: 0.145, years: [1, 2, 3, 4] },
  { name: 'NCBA', rate: 0.15, years: [1, 2, 3, 4] },
  { name: 'Stanbic', rate: 0.18, years: [1, 2, 3] },
];

export default function TcoCalculator({ vehicle }) {
  const [open, setOpen] = useState(false);

  // Determine reasonable defaults from vehicle
  const defaultCc = vehicle?.engine
    ? parseInt(vehicle.engine.replace(/[^0-9]/g, ''), 10) || 1800
    : 1800;

  const [cc, setCc] = useState(defaultCc);
  const [downPct, setDownPct] = useState(20);
  const [loanYears, setLoanYears] = useState(3);
  const [selectedBank, setSelectedBank] = useState(0);

  const isUsed = vehicle?.dutyStatus === 'already_in_kenya' || !vehicle?.dutyStatus;
  const customsRate = isUsed ? 0.25 : 0.35;
  const exciseSlab = EXCISE_RATES.find(s => cc <= s.max) || EXCISE_RATES[2];
  const price = vehicle?.price || 0;

  const tco = useMemo(() => {
    // Import duties (if not already in Kenya)
    let importDuty = 0;
    if (!isUsed) {
      const customs = price * customsRate;
      const excise = price * exciseSlab.rate;
      const vat = (price + customs + excise) * 0.16;
      const idf = price * 0.02;
      const rdl = price * 0.015;
      const portFees = 95000;
      importDuty = customs + excise + vat + idf + rdl + portFees;
    }

    // Insurance (3-5% of vehicle value annually - use 4%)
    const annualInsurance = price * 0.04;

    // Financing
    const loanAmt = price * (1 - downPct / 100);
    const bank = BANK_RATES[selectedBank];
    const monthlyRate = bank.rate / 12;
    const nMonths = loanYears * 12;
    const monthlyPmt = monthlyRate === 0
      ? loanAmt / nMonths
      : (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, nMonths)) / (Math.pow(1 + monthlyRate, nMonths) - 1);
    const totalFinanced = monthlyPmt * nMonths;
    const totalInterest = totalFinanced - loanAmt;

    return { importDuty, annualInsurance, monthlyPmt, totalFinanced, totalInterest, loanAmt };
  }, [price, cc, downPct, loanYears, selectedBank, isUsed, customsRate, exciseSlab]);

  return (
    <div style={{
      background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
      overflow: 'hidden', marginTop: 12,
    }}>
      <button onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'transparent', border: 'none',
          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator size={13} style={{ color: 'var(--gold)' }} /> Total Cost of Ownership
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />}
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Duty Status Indicator */}
          {isUsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
              padding: '8px 10px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 8,
              fontSize: 10, color: '#22c55e', fontWeight: 600,
            }}>
              <Info size={10} /> Already in Kenya — no import duties applied
            </div>
          )}

          {/* Engine CC Slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
              Engine Displacement: <strong style={{ color: '#fff' }}>{cc} cc</strong>
              <span style={{ float: 'right', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>Excise: {(exciseSlab.rate * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min={800} max={5000} step={100} value={cc}
              onChange={e => setCc(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--gold)' }}
            />
          </div>

          {/* Down Payment Slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
              Down Payment: <strong style={{ color: '#fff' }}>{downPct}%</strong>
              <span style={{ float: 'right', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>KES {(price * downPct / 100).toLocaleString('en-KE')}</span>
            </div>
            <input type="range" min={10} max={40} step={5} value={downPct}
              onChange={e => setDownPct(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--gold)' }}
            />
          </div>

          {/* Bank + Term Selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 4 }}>Bank</div>
              <select value={selectedBank} onChange={e => setSelectedBank(Number(e.target.value))}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  fontSize: 10, fontWeight: 600,
                }}>
                {BANK_RATES.map((b, i) => (
                  <option key={b.name} value={i}>{b.name} ({(b.rate * 100).toFixed(0)}% APR)</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 4 }}>Term</div>
              <select value={loanYears} onChange={e => setLoanYears(Number(e.target.value))}
                style={{
                  width: '100%', padding: '6px 8px', borderRadius: 6,
                  background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                  fontSize: 10, fontWeight: 600,
                }}>
                {BANK_RATES[selectedBank].years.map(y => (
                  <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          <div style={{
            background: 'rgba(212,168,67,0.04)', border: '1px solid rgba(212,168,67,0.1)', borderRadius: 10,
            padding: '12px 14px',
          }}>
            {!isUsed && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Import Duty Breakdown</div>
                {[
                  { l: 'Customs Duty (25-35%)', v: Math.round(price * customsRate) },
                  { l: `Excise Duty (${(exciseSlab.rate * 100).toFixed(0)}%)`, v: Math.round(price * exciseSlab.rate) },
                  { l: 'VAT 16%', v: Math.round((price + price * customsRate + price * exciseSlab.rate) * 0.16) },
                  { l: 'IDF 2%', v: Math.round(price * 0.02) },
                  { l: 'RDL 1.5%', v: Math.round(price * 0.015) },
                  { l: 'Port / Clearing', v: 95000 },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                    <span>{r.l}</span>
                    <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>KES {r.v.toLocaleString('en-KE')}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(212,168,67,0.1)', margin: '4px 0 6px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                  <span>Total Import Duty</span>
                  <span>KES {Math.round(tco.importDuty).toLocaleString('en-KE')}</span>
                </div>
              </div>
            )}

            {/* Insurance */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '3px 0' }}>
              <span>Annual Insurance (4% est.)</span>
              <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>KES {Math.round(tco.annualInsurance).toLocaleString('en-KE')}</span>
            </div>

            {/* Financing */}
            {tco.loanAmt > 0 && (
              <div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', margin: '6px 0' }} />
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
                  Financing ({BANK_RATES[selectedBank].name})
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                  <span>Loan Amount</span>
                  <span style={{ fontWeight: 600 }}>KES {Math.round(tco.loanAmt).toLocaleString('en-KE')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                  <span>Monthly Payment</span>
                  <span style={{ fontWeight: 700, color: 'var(--gold)' }}>KES {Math.round(tco.monthlyPmt).toLocaleString('en-KE')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                  <span>Total Interest</span>
                  <span style={{ fontWeight: 600 }}>KES {Math.round(tco.totalInterest).toLocaleString('en-KE')}</span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div style={{
              borderTop: '1px solid rgba(212,168,67,0.15)', margin: '8px 0 4px', paddingTop: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {isUsed ? 'Total Vehicle Cost' : 'Total Landed & On-Road'}
              </span>
              <span style={{ fontSize: 12, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                KES {Math.round(price + tco.importDuty).toLocaleString('en-KE')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
