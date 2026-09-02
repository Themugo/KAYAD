from pathlib import Path
p=Path('/mnt/data/phase16')

# 1) Supabase client: remove fake placeholder/demo auth and make realtime optional.
f=p/'src/lib/supabaseClient.ts'
f.write_text('''import { createClient, SupabaseClient } from '@supabase/supabase-js';\n\nconst supabaseUrl = import.meta.env.VITE_SUPABASE_URL;\nconst supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;\n\n// KAYAD authentication is owned by the Express backend (HttpOnly cookie/JWT).\n// Supabase is used here only for optional Realtime subscriptions. Never create\n// a fake client with placeholder credentials and never use Supabase Auth as the\n// application identity layer.\nexport const supabase: SupabaseClient | null =\n  supabaseUrl && supabaseAnonKey\n    ? createClient(supabaseUrl, supabaseAnonKey, {\n        auth: {\n          persistSession: false,\n          autoRefreshToken: false,\n          detectSessionInUrl: false,\n        },\n        realtime: { params: { eventsPerSecond: 10 } },\n        global: { headers: { 'X-Requested-With': 'XMLHttpRequest' } },\n      })\n    : null;\n\nexport function isRealtimeConfigured(): boolean {\n  return Boolean(supabase);\n}\n\nexport type RealtimeChannel = ReturnType<SupabaseClient['channel']>;\n''')

# 2) Socket context: connection state reflects actual configured realtime, and subscriptions fail closed.
f=p/'src/context/SocketContext.tsx'
s=f.read_text()
s=s.replace("import { supabase, RealtimeChannel } from '../lib/supabaseClient';", "import { supabase, RealtimeChannel } from '../lib/supabaseClient';")
s=s.replace("    if (user) {\n      setConnected(true);\n    } else {\n      setConnected(false);\n    }", "    setConnected(Boolean(user && supabase));")
s=s.replace("      channelsRef.current.forEach(ch => supabase.removeChannel(ch));", "      channelsRef.current.forEach(ch => supabase?.removeChannel(ch));")
s=s.replace("  const joinAuction = useCallback((carId: string, handlers: AuctionHandlers = {}): RealtimeChannel | undefined => {\n    const channel = supabase", "  const joinAuction = useCallback((carId: string, handlers: AuctionHandlers = {}): RealtimeChannel | undefined => {\n    if (!supabase || !user) return undefined;\n    const channel = supabase")
s=s.replace("  const joinNotifications = useCallback((handlers: NotificationHandlers = {}): RealtimeChannel | null => {\n    if (!user) return null;", "  const joinNotifications = useCallback((handlers: NotificationHandlers = {}): RealtimeChannel | null => {\n    if (!user || !supabase) return null;")
s=s.replace("  const joinMessages = useCallback((conversationId: string, handlers: MessageHandlers = {}): RealtimeChannel | undefined => {\n    const channel = supabase", "  const joinMessages = useCallback((conversationId: string, handlers: MessageHandlers = {}): RealtimeChannel | undefined => {\n    if (!supabase || !user) return undefined;\n    const channel = supabase")
s=s.replace("      supabase.removeChannel(channel);", "      supabase?.removeChannel(channel);")
f.write_text(s)

# 3) Communication hub: eliminate fake attachment/file success. Keep navigation actions only.
f=p/'src/features/UnifiedCommunicationHub.tsx'
s=f.read_text()
start=s.index('  // Send Attachment Simulation')
end=s.index('  // Category Icon & Badge Colors Mapping', start)
replacement='''  // Attachment and transaction-vault writes are not backed by a real\n  // frontend/backend contract yet. Never manufacture a message, URL,\n  // document identity, GPS point, appointment, file size, or upload success.\n  const handleSendAttachment = (type: MessageAttachment['type']) => {\n    setShowAttachMenu(false);\n    showToast(`${type === 'image' ? 'Image' : type === 'document' ? 'Document' : type === 'location' ? 'Location' : 'Appointment'} sharing is not available until the secure attachment service is connected.`);\n  };\n\n  const handleUploadFileToVault = (e: React.FormEvent) => {\n    e.preventDefault();\n    setShowUploadModal(false);\n    setNewFileName('');\n    showToast('Transaction file uploads are not available until the secure file-vault service is connected.');\n  };\n\n'''
s=s[:start]+replacement+s[end:]
# Remove misleading hard-coded UI title and button wording where obvious.
s=s.replace('Upload New File Handler into Transaction Shared Vault', 'Secure transaction file vault')
s=s.replace('Uploaded ${newFile.fileName} to transaction file vault.', 'Transaction file upload is unavailable.')
f.write_text(s)

# 4) Financing: wire the existing real loan API and remove fabricated lender/application state.
f=p/'src/features/FinancingView.tsx'
s=f.read_text()
s=s.replace("import React, { useState, useMemo, useRef } from 'react';", "import React, { useState, useMemo, useRef, useEffect } from 'react';")
s=s.replace("import { PageHeader, StatWidget, Card, Badge, Button, LazyImage } from '../components/ui';", "import { PageHeader, StatWidget, Card, Badge, Button, LazyImage } from '../components/ui';\nimport { useAuth } from '../context/AuthContext';\nimport { createLoanApplication, getMyLoanApplications, LoanApiError, type LoanApplication } from '../services/loanApi';")
s=s.replace("  // Application Form State\n  const [activeTab", "  const { user } = useAuth();\n\n  // Application Form State\n  const [activeTab")
s=s.replace("  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);\n\n  // Active Application Tracker State (Single active status)\n  const [currentAppStatus, setCurrentAppStatus] = useState<ApplicationStatus>('Under Review');", "  const [applicationSuccess, setApplicationSuccess] = useState<boolean>(false);\n  const [applicationSubmitting, setApplicationSubmitting] = useState(false);\n  const [applicationError, setApplicationError] = useState<string | null>(null);\n  const [myApplications, setMyApplications] = useState<LoanApplication[]>([]);\n  const [currentApplication, setCurrentApplication] = useState<LoanApplication | null>(null);\n  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);\n\n  // Application state is backend-authoritative. No fabricated active status/ref.\n  const currentAppStatus: ApplicationStatus | null = currentApplication\n    ? ({ submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved', declined: 'Declined', withdrawn: 'Declined' } as const)[currentApplication.status]\n    : null;\n\n  useEffect(() => {\n    if (!user) {\n      setMyApplications([]);\n      setCurrentApplication(null);\n      return;\n    }\n    let cancelled = false;\n    getMyLoanApplications()\n      .then(apps => {\n        if (cancelled) return;\n        setMyApplications(apps);\n        setCurrentApplication(apps[0] || null);\n      })\n      .catch(() => {\n        if (!cancelled) { setMyApplications([]); setCurrentApplication(null); }\n      });\n    return () => { cancelled = true; };\n  }, [user]);")
# Replace entire partner dataset block with empty authoritative-until-connected list.
start=s.index('  // Partner Banks Dataset')
end=s.index('  // Filtered compare list', start)
s=s[:start]+'''  // No lender directory endpoint is currently connected to this UI.\n  // Do not ship invented bank names, rates, eligibility rules, approval times,\n  // fees, or regulatory claims as if they were live partner offers.\n  const partnerBanks: PartnerBank[] = useMemo(() => [], []);\n\n'''+s[end:]
# Generic application opener.
s=s.replace("  const handleOpenApply = (bank: PartnerBank) => {\n    setSelectedBankForApply(bank);\n    setIsApplyModalOpen(true);\n    setApplicationSuccess(false);\n  };", "  const handleOpenApply = () => {\n    setSelectedBankForApply({\n      id: 'kayad-financing', name: 'KAYAD Financing Request', shortName: 'KAYAD',\n      logoBg: 'bg-[#1E3063] text-white', rateRange: 'Not quoted', baseRate: annualInterestRate,\n      maxFinancing: 'Subject to lender terms', minDepositPercent: depositPercent,\n      maxTermMonths: tenureMonths, approvalTime: 'Not quoted', earlyRepaymentPolicy: 'Subject to lender terms',\n      eligibilitySummary: 'A financing request is submitted to KAYAD for review; no lender offer is implied.',\n      badge: 'Request', features: []\n    });\n    setIsApplyModalOpen(true);\n    setApplicationSuccess(false);\n    setApplicationError(null);\n  };\n\n  const submitFinancingRequest = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (!user) { setApplicationError('Please sign in before submitting a financing request.'); return; }\n    setApplicationSubmitting(true);\n    setApplicationError(null);\n    try {\n      const created = await createLoanApplication({\n        vehiclePrice, depositAmount, loanAmount, termMonths: tenureMonths,\n        monthlyIncome: monthlyIncome || undefined, employmentStatus: employmentType,\n      });\n      setMyApplications(prev => [created, ...prev.filter(a => a.id !== created.id)]);\n      setCurrentApplication(created);\n      setApplicationSuccess(true);\n    } catch (err) {\n      setApplicationError(err instanceof LoanApiError ? err.message : 'Could not submit the financing request.');\n    } finally {\n      setApplicationSubmitting(false);\n    }\n  };\n")
# Make document toggles fail closed.
s=s.replace("  const handleDocToggle = (docKey: string) => {\n    setUploadedDocs(prev => ({ ...prev, [docKey]: !prev[docKey] }));\n  };", "  const handleDocToggle = () => {\n    // The financing API has no document-upload contract yet. Do not mark local\n    // files as verified or imply that a lender received them.\n    setApplicationError('Document upload is not connected yet. No document was marked as verified.');\n  };")
# Remove initial fake uploaded docs.
s=s.replace("  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({\n    nationalId: true,\n    payslips: true,\n    bankStatements: false,\n    employmentLetter: false\n  });", "  const [uploadedDocs] = useState<Record<string, boolean>>({});")
# Calculator CTA that used lender comparison -> real request.
s=s.replace('<span>Compare Lenders for this Plan</span>', '<span>Submit Financing Request</span>')
s=s.replace("onClick={() => {\n                setActiveTab('lenders');\n              }}", "onClick={handleOpenApply}", 1)
# Replace lender section content by honest unavailable state, preserving heading.
old='''        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">\n          {partnerBanks.map((bank) => {'''
if old in s:
    idx=s.index(old)
    # Find matching closing by known next section marker.
    end=s.index('      {/* ==========================================\n          5. COMPARE FINANCING OFFERS', idx)
    section=s[idx:end]
    # Keep heading preceding idx, replace cards body.
    body='''        <Card className="p-6 bg-slate-50 border-slate-200">\n          <div className="flex items-start gap-3">\n            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />\n            <div className="space-y-1">\n              <p className="font-extrabold text-[#1E3063]">Lender offers are not connected yet</p>\n              <p className="text-sm text-slate-600">KAYAD will not display invented bank rates, fees, approval times, or eligibility claims. You can submit a real financing request using the connected loan-application service above.</p>\n            </div>\n          </div>\n        </Card>\n      </div>\n\n'''
    s=s[:idx]+body+s[end:]
# Compare section: no banks -> honest message. Replace whole comparison div until tracker section marker.
marker5='      {/* ==========================================\n          5. COMPARE FINANCING OFFERS'
if marker5 in s:
    st=s.index(marker5)
    en=s.index('        {/* SINGLE ACTIVE APPLICATION STATUS BANNER', st)
    comp='''      {/* ==========================================\n          5. COMPARE FINANCING OFFERS\n          ========================================== */}\n      {activeTab === 'comparison' && (\n        <Card className="p-6 bg-slate-50 border-slate-200">\n          <div className="flex items-start gap-3">\n            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />\n            <div>\n              <h2 className="text-xl font-black text-[#1E3063]">Lender comparison unavailable</h2>\n              <p className="text-sm text-slate-600 mt-1">A verified lender-offer feed is not connected to KAYAD yet. No synthetic comparison data is shown.</p>\n            </div>\n          </div>\n        </Card>\n      )}\n\n'''
    s=s[:st]+comp+s[en:]
# Tracker section: make conditional and remove fake ref/status claims. Simple targeted replacements.
s=s.replace('''            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Active Application Ref #KYD-FIN-8892</p>''', '''            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Backend Loan Application</p>''')
s=s.replace('''            <Badge variant={\n              currentAppStatus === 'Approved' || currentAppStatus === 'Completed' ? 'success' :\n              currentAppStatus === 'Declined' ? 'danger' : 'escrow'\n            } size="md">\n              Current Status: {currentAppStatus}\n            </Badge>''', '''            {currentAppStatus && <Badge variant={currentAppStatus === 'Approved' ? 'success' : currentAppStatus === 'Declined' ? 'danger' : 'escrow'} size="md">Current Status: {currentAppStatus}</Badge>}''')
# Make tracker only when real application exists by wrapping nearby Card. Easier leave card but replace contents via ternary is cumbersome. Add no-app note before card and condition via marker.
s=s.replace('''        {/* SINGLE ACTIVE APPLICATION STATUS BANNER (Never multiple active statuses) */}\n        <Card''', '''        {/* SINGLE ACTIVE APPLICATION STATUS BANNER — backend-authoritative */}\n        {!currentApplication && <Card className="p-6 bg-slate-50 border-slate-200"><p className="text-sm text-slate-600">No financing application has been submitted from this account yet.</p></Card>}\n        {currentApplication && <Card''')
# Close the added fragment at the first exact card closure before document module. Identify by section marker.
needle='''        </Card>\n      </div>\n\n      {/* ==========================================\n          7. SECURE DOCUMENT UPLOAD MODULE'''
if needle in s:
    s=s.replace(needle, '''        </Card>}\n      </div>\n\n      {/* ==========================================\n          7. SECURE DOCUMENT UPLOAD MODULE''',1)
# Status message text should not claim unsupported lifecycle.
s=s.replace("{currentAppStatus === 'Under Review' && 'Your application is currently under review with the lending bank\\'s underwriting team.'}", "{currentAppStatus === 'Under Review' && 'Your application is currently under review.'}")
s=s.replace("{currentAppStatus === 'Draft' && 'Your calculator inputs are saved. Click Apply to submit to partner banks.'}", "{currentAppStatus === 'Draft' && 'No submitted financing application is currently active.'}")
s=s.replace("{currentAppStatus === 'Submitted' && 'Application received. Upload requested documents below to expedite review.'}", "{currentAppStatus === 'Submitted' && 'Application received by KAYAD. Further status changes are backend-authoritative.'}")
s=s.replace("{currentAppStatus === 'Documents Requested' && 'Please upload your 6-month certified bank statement to complete credit audit.'}", "")
s=s.replace("{currentAppStatus === 'Conditionally Approved' && 'Congratulations! Conditional term sheet issued pending vehicle physical inspection.'}", "")
s=s.replace("{currentAppStatus === 'Approved' && 'Final approval granted! Check your email for loan contract signing details.'}", "{currentAppStatus === 'Approved' && 'The application is marked approved by the backend.'}")
s=s.replace("{currentAppStatus === 'Declined' && 'Lender declined current terms. Consider increasing down payment deposit.'}", "{currentAppStatus === 'Declined' && 'The application is marked declined by the backend.'}")
s=s.replace("{currentAppStatus === 'Completed' && 'Loan disbursed and vehicle logbook endorsed. Drive away safely!'}", "")
s=s.replace("KAYAD lead desk updates your portal status automatically as bank underwriters process your file.", "Application status shown here comes from the KAYAD backend; lender-side status is not fabricated.")
# Modal form: change onSubmit to real handler and success copy.
s=s.replace('''              <form \n                onSubmit={(e) => {\n                  e.preventDefault();\n                  setApplicationSuccess(true);\n                  setCurrentAppStatus('Submitted');\n                }} ''', '''              <form onSubmit={submitFinancingRequest} ''')
s=s.replace('''                    Your pre-qualification file has been securely routed to <strong>{selectedBankForApply.shortName}</strong>. A dedicated bank asset officer will call you within 2 business hours.''', '''                    Your financing request was submitted successfully. The backend has recorded the application; no lender approval or call time is being promised.''')
s=s.replace('''                <div className="pt-2">''', '''                {applicationError && <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700">{applicationError}</div>}\n                <div className="pt-2">''',1)
s=s.replace('''                    <span>Submit Pre-Approval Lead to {selectedBankForApply.shortName}</span>''', '''                    <span>{applicationSubmitting ? 'Submitting…' : 'Submit Financing Request'}</span>''')
s=s.replace('''                    type="submit"''', '''                    type="submit"\n                    disabled={applicationSubmitting}''',1)
# Remove fake hardcoded identity/phone/KRA inputs in modal: replace block between summary end and monthly income label.
# Find the exact start of name input block after summary.
needle='''                  <div>\n                    <label className="font-bold text-slate-700">Monthly Gross Income (Ksh)</label>'''
if needle in s:
    # Locate prior summary close and needle; the name/phone/kra block immediately before needle.
    pos=s.index(needle)
    # Walk back to the last occurrence of a div containing required text. Safer use known label.
    name_label=s.rfind('''<label className="font-bold text-slate-700">Full Legal Name</label>''', 0, pos)
    if name_label!=-1:
        block_start=s.rfind('                  <div>',0,name_label)
        s=s[:block_start]+s[pos:]
# Wire monthly income input to state.
s=s.replace('''placeholder="e.g. 120000"\n                      className="w-full mt-1 p-2.5''', '''placeholder="e.g. 120000"\n                      value={monthlyIncome || ''}\n                      onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}\n                      className="w-full mt-1 p-2.5''')
f.write_text(s)

# 5) Admin business rules: remove sample data and make UI start empty until API integration exists.
f=p/'src/pages/admin/automation/components/BusinessRulesManager.jsx'
s=f.read_text()
start=s.index('// Sample rules')
end=s.index('const statusColors', start)
s=s[:start]+'''// Business rules must come from the backend. This component no longer\n// boots with fabricated rules, execution counts, or historical timestamps.\nconst initialRules = [];\n\n'''+s[end:]
s=s.replace('const [rules, setRules] = useState(sampleRules);', 'const [rules, setRules] = useState(initialRules);')
# Disable local-only mutations with honest notice.
s=s.replace('''  const saveRule = () => {''', '''  const saveRule = () => {\n    // The editor is intentionally fail-closed until create/update endpoints are wired here.\n    alert('Business rule persistence is not connected in this console yet. No local-only rule was saved.');\n    return;''')
s=s.replace('''  const toggleRuleStatus = (ruleId) => {\n    setRules(rules.map(r => {''', '''  const toggleRuleStatus = () => {\n    alert('Business rule persistence is not connected in this console yet. No local-only status change was saved.');\n    return;\n    /* setRules(rules.map(r => {''')
# close commented body before return block by converting first matching ending.
s=s.replace('''      return r;\n    }));\n  };\n\n  return (''', '''      return r;\n    })); */\n  };\n\n  return (''',1)
f.write_text(s)

# Add phase manifest.
(p/'PHASE_16_COMPLETE.md').write_text('''# KAYAD Phase 16 — Production Truth & Live Contract Hardening\n\n## Scope\n- Removed Supabase placeholder/demo credentials and Supabase Auth session helpers from the client. Supabase is now optional Realtime only; KAYAD backend auth remains authoritative.\n- Made Realtime connection/subscription paths fail closed when Supabase Realtime is not configured.\n- Removed fabricated communication attachments, GPS locations, appointment records, file sizes, URLs, and transaction-vault upload success.\n- Wired the existing financing UI to the real `/api/loans` backend service for authenticated loan applications and backend-authoritative status.\n- Removed unverified lender offer/rate/eligibility/approval datasets from the financing marketplace and replaced them with an explicit unavailable state.\n- Removed fabricated business-rule records and local-only persistence/status changes from the admin business-rules console until its backend CRUD contract is connected.\n\n## Validation\n- Targeted source scan and structural checks performed after edits.\n- Full dependency build remains environment-dependent; Phase 14 Node baseline remains 22.22.2.\n''')
