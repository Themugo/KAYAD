from pathlib import Path
p=Path('/mnt/data/phase16')
# remove duplicate dormant chat implementation
import shutil
shutil.rmtree(p/'src/features/ChatView/components', ignore_errors=True)
(p/'src/features/ChatView/index.ts').unlink(missing_ok=True)
# Financing root
f=p/'src/features/FinancingView.tsx'; s=f.read_text()
s=s.replace("import React, { useState, useMemo, useRef } from 'react';", "import React, { useState, useMemo, useRef, useEffect } from 'react';")
s=s.replace("import { PageHeader, StatWidget, Card, Badge, Button, LazyImage } from '../components/ui';", "import { PageHeader, StatWidget, Card, Badge, Button, LazyImage } from '../components/ui';\nimport { useAuth } from '../context/AuthContext';\nimport { createLoanApplication, getMyLoanApplications, LoanApiError, type LoanApplication } from '../services/loanApi';")
s=s.replace("  // Mode Switcher: 'buyer' | 'bank_portal'", "  const { user } = useAuth();\n\n  // Mode Switcher: 'buyer' | 'bank_portal'")
s=s.replace("  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);\n\n  // Active Application Tracker State (Single active status)\n  const [currentAppStatus, setCurrentAppStatus] = useState<ApplicationStatus>('Under Review');\n  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({\n    nationalId: true,\n    payslips: true,\n    bankStatements: false,\n    employmentLetter: false\n  });", "  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);\n  const [applicationSubmitting, setApplicationSubmitting] = useState(false);\n  const [applicationError, setApplicationError] = useState<string | null>(null);\n  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);\n  const [currentApplication, setCurrentApplication] = useState<LoanApplication | null>(null);\n  const currentAppStatus: ApplicationStatus | null = currentApplication\n    ? ({ submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', declined: 'Declined', withdrawn: 'Declined' } as const)[currentApplication.status]\n    : null;\n  const uploadedDocs: Record<string, boolean> = {};\n\n  useEffect(() => {\n    if (!user) { setCurrentApplication(null); return; }\n    let cancelled = false;\n    getMyLoanApplications().then(apps => {\n      if (!cancelled) setCurrentApplication(apps[0] || null);\n    }).catch(() => {\n      if (!cancelled) setCurrentApplication(null);\n    });\n    return () => { cancelled = true; };\n  }, [user]);")
# Replace bank dataset with no unverified offers.
start=s.index('  // Partner Banks Dataset')
end=s.index('  // Filtered compare list', start)
s=s[:start]+'''  // Lender offers must come from a verified backend partner directory.\n  // Until that contract is connected, do not present invented rates, fees,\n  // eligibility thresholds, approval times, or partner names as live offers.\n  const partnerBanks: PartnerBank[] = useMemo(() => [], []);\n\n'''+s[end:]
# Replace handlers block.
start=s.index('  const handleOpenApply')
end=s.index('  // Only real marketplace vehicles', start)
s=s[:start]+'''  const handleOpenApply = () => {\n    setSelectedBankForApply({\n      id: 'kayad-financing', name: 'KAYAD Financing Request', shortName: 'KAYAD',\n      logoBg: 'bg-[#1E3063] text-white', rateRange: 'Not quoted', baseRate: annualInterestRate,\n      maxFinancing: 'Subject to lender terms', minDepositPercent: depositPercent, maxTermMonths: tenureMonths,\n      approvalTime: 'Not quoted', earlyRepaymentPolicy: 'Subject to lender terms',\n      eligibilitySummary: 'Submitting this request does not imply lender approval or a lender offer.',\n      badge: 'Request', features: []\n    });\n    setIsApplyModalOpen(true); setApplicationSuccess(false); setApplicationError(null);\n  };\n\n  const submitFinancingRequest = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!user) { setApplicationError('Please sign in before submitting a financing request.'); return; }\n    setApplicationSubmitting(true); setApplicationError(null);\n    try {\n      const created = await createLoanApplication({ vehiclePrice, depositAmount, loanAmount, termMonths: tenureMonths, monthlyIncome: monthlyIncome || undefined, employmentStatus: employmentType });\n      setCurrentApplication(created); setApplicationSuccess(true);\n    } catch (err) {\n      setApplicationError(err instanceof LoanApiError ? err.message : 'Could not submit the financing request.');\n    } finally { setApplicationSubmitting(false); }\n  };\n\n  const handleDocToggle = () => {\n    setApplicationError('Document upload is not connected yet. No document was marked as verified.');\n  };\n\n'''+s[end:]
# Calculator lender CTA -> request
s=s.replace('''onClick={() => {\n                setActiveTab('lenders');\n              }}''', 'onClick={handleOpenApply}', 1)
s=s.replace('<span>Compare Lenders for this Plan</span>', '<span>Submit Financing Request</span>')
# Replace lender cards block.
needle='''        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">\n          {partnerBanks.map((bank) => {'''
if needle in s:
    a=s.index(needle); b=s.index('      {/* ==========================================\n          5. COMPARE FINANCING OFFERS',a)
    s=s[:a]+'''        <Card className="p-6 bg-slate-50 border-slate-200">\n          <div className="flex items-start gap-3">\n            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />\n            <div><p className="font-extrabold text-[#1E3063]">Verified lender offers are not connected yet</p><p className="text-sm text-slate-600 mt-1">KAYAD will not display invented lender rates, fees, approval times, or eligibility claims. Submit a real financing request instead.</p></div>\n          </div>\n        </Card>\n      </div>\n\n'''+s[b:]
# Replace comparison section through tracker marker (marker absent; use status comment)
a=s.index('      {/* ==========================================\n          5. COMPARE FINANCING OFFERS')
b=s.index('        {/* SINGLE APPLICATION STATUS', a) if '        {/* SINGLE APPLICATION STATUS' in s else s.index('        {/* SINGLE ACTIVE APPLICATION STATUS',a)
s=s[:a]+'''      {/* ==========================================\n          5. COMPARE FINANCING OFFERS\n          ========================================== */}\n      {activeTab === 'comparison' && <Card className="p-6 bg-slate-50 border-slate-200"><div className="flex items-start gap-3"><Info className="w-5 h-5 text-amber-600" /><div><h2 className="text-xl font-black text-[#1E3063]">Lender comparison unavailable</h2><p className="text-sm text-slate-600 mt-1">A verified lender-offer feed is not connected yet. No synthetic comparison data is shown.</p></div></div></Card>}\n\n'''+s[b:]
# Status ref and badge.
s=s.replace('Active Application Ref #KYD-FIN-8892','Backend Loan Application')
# Exact badge block via regex-ish
import re
s=re.sub(r'''\s*<Badge variant=\{\n\s*currentAppStatus === 'Approved' \|\| currentAppStatus === 'Completed' \? 'success' :\n\s*currentAppStatus === 'Declined' \? 'danger' : 'escrow'\n\s*\} size="md">\n\s*Current Status: \{currentAppStatus\}\n\s*</Badge>''', '''\n            {currentAppStatus && <Badge variant={currentAppStatus === 'Approved' ? 'success' : currentAppStatus === 'Declined' ? 'danger' : 'escrow'} size="md">Current Status: {currentAppStatus}</Badge>}''', s)
# Real form submit
s=s.replace('''onSubmit={(e) => {\n                  e.preventDefault();\n                  setApplicationSuccess(true);\n                  setCurrentAppStatus('Submitted');\n                }}''', 'onSubmit={submitFinancingRequest}')
s=s.replace('Your pre-qualification file has been securely routed to <strong>{selectedBankForApply.shortName}</strong>. A dedicated bank asset officer will call you within 2 business hours.', 'Your financing request was recorded by the KAYAD backend. No lender approval or callback time is promised.')
s=s.replace('''<span>Submit Pre-Approval Lead to {selectedBankForApply.shortName}</span>''','''<span>{applicationSubmitting ? 'Submitting…' : 'Submit Financing Request'}</span>''')
# Add error before submit button and disable.
s=s.replace('''                <div className="pt-2">\n                  <Button''','''                {applicationError && <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">{applicationError}</div>}\n                <div className="pt-2">\n                  <Button''',1)
s=s.replace('''                    type="submit"\n                  >''','''                    type="submit"\n                    disabled={applicationSubmitting}\n                  >''',1)
# Remove fake name/phone/KRA fields in modal by regex between Summary Box and Monthly Gross Income.
start=s.index('                {/* Summary Box */}')
mi=s.index('''                  <div>\n                    <label className="font-bold text-slate-700">Monthly Gross Income (Ksh)</label>''', start)
summary_end=s.index('                </div>\n\n                <div className="pt-2">', start)
# If monthly income appears before summary_end, preserve from its div through the closing summary_end.
mi_end=s.index('                </div>\n\n                <div className="pt-2">', mi)
block=s[mi:mi_end]
# inject controlled value
block=block.replace('''placeholder="e.g. 120000"''','''placeholder="e.g. 120000"\n                      value={monthlyIncome || ''}\n                      onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}''')
# summary_end contains name etc before mi, rebuild summary prefix + income block + closing
prefix=s[start:mi]
# remove all after last summary close? prefix currently includes fake fields. Keep only through the first summary closing before fake fields.
summary_close=prefix.find('                </div>\n\n')
if summary_close!=-1:
    prefix=prefix[:summary_close+len('                </div>\n\n')]
s=s[:start]+prefix+block+'                </div>\n\n'+s[mi_end+len('                </div>\n\n'):]
# No fake uploaded docs; document UI should not say verified.
s=s.replace("{isUploaded ? 'Verified ✓' : 'Pending'}", "Pending")
s=s.replace("{isUploaded ? 'Replace Document' : 'Upload Document'}", "Upload unavailable")
# status messages: remove unsupported claims
s=s.replace("{currentAppStatus === 'Under Review' && 'Your application is currently under review with the lending bank\\'s underwriting team.'}", "{currentAppStatus === 'Under Review' && 'Your application is currently under review.'}")
s=s.replace("{currentAppStatus === 'Submitted' && 'Application received. Upload requested documents below to expedite review.'}", "{currentAppStatus === 'Submitted' && 'Application received by KAYAD. Further status changes are backend-authoritative.'}")
s=s.replace("{currentAppStatus === 'Approved' && 'Final approval granted! Check your email for loan contract signing details.'}", "{currentAppStatus === 'Approved' && 'The application is marked approved by the backend.'}")
s=s.replace("{currentAppStatus === 'Declined' && 'Lender declined current terms. Consider increasing down payment deposit.'}", "{currentAppStatus === 'Declined' && 'The application is marked declined by the backend.'}")
s=s.replace("KAYAD lead desk updates your portal status automatically as bank underwriters process your file.", "Application status shown here comes from the KAYAD backend; no lender-side status is fabricated.")
f.write_text(s)
# Admin rules simple: remove sample block and local state edits, but preserve UI.
f=p/'src/pages/admin/automation/components/BusinessRulesManager.jsx'; s=f.read_text()
a=s.index('// Sample rules'); b=s.index('const statusColors',a)
s=s[:a]+'''// Rules are backend-authoritative. The console starts empty until its CRUD\n// integration loads real records; it never seeds fabricated rules or execution history.\nconst initialRules = [];\n\n'''+s[b:]
s=s.replace('useState(sampleRules)','useState(initialRules)')
# local save/toggle become fail-closed; use console warning instead of alert to avoid UX blocking.
a=s.index('  const saveRule = () => {'); b=s.index('  return (',a)
s=s[:a]+'''  const saveRule = () => {\n    console.warn('[BusinessRulesManager] Backend CRUD integration is not connected; rule was not persisted.');\n    return;\n  };\n\n  const toggleRuleStatus = () => {\n    console.warn('[BusinessRulesManager] Backend CRUD integration is not connected; status was not changed.');\n    return;\n  };\n\n'''+s[b:]
f.write_text(s)
