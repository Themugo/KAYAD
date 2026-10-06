import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Car,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Gavel,
  HelpCircle,
  Landmark,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Card, Button, Input } from '../components/ui';

export type FAQCategory = 'all' | 'marketplace' | 'auctions' | 'inspections' | 'escrow' | 'financing' | 'transfer';

export interface FAQItem {
  id: string;
  category: FAQCategory;
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  question: string;
  answer: string;
  nextStep?: string;
  popular?: boolean;
}

const iconClass = 'w-3.5 h-3.5';

export const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-market-1',
    category: 'marketplace',
    categoryLabel: 'Marketplace',
    categoryIcon: <Car className={iconClass} />,
    question: 'How do I buy a vehicle through KAYAD?',
    answer: 'Start with Marketplace discovery, review the listing information available for the vehicle, use the available inspection path when appropriate, and follow the purchase and protected-transaction steps presented for that vehicle. If you already have a deal reference, include it when contacting Support so the team can work from the correct case.',
    nextStep: 'Open Marketplace',
    popular: true,
  },
  {
    id: 'faq-market-2',
    category: 'marketplace',
    categoryLabel: 'Marketplace',
    categoryIcon: <Car className={iconClass} />,
    question: 'How do I report a problem with a vehicle listing or seller?',
    answer: 'Do not rely on a public listing message for a formal resolution. Open a Support case and include the vehicle, seller or listing reference plus a clear description of the issue. The support case becomes the traceable route for follow-up.',
    nextStep: 'Open a support case',
  },
  {
    id: 'faq-auctions-1',
    category: 'auctions',
    categoryLabel: 'Auctions',
    categoryIcon: <Gavel className={iconClass} />,
    question: 'What happens after I win a KAYAD auction?',
    answer: 'A winning auction outcome moves into the transaction and settlement workflow available to the winning buyer. Follow the purchase instructions attached to the transaction rather than treating the auction screen itself as proof of payment or ownership transfer.',
    nextStep: 'Open Auction',
    popular: true,
  },
  {
    id: 'faq-auctions-2',
    category: 'auctions',
    categoryLabel: 'Auctions',
    categoryIcon: <Gavel className={iconClass} />,
    question: 'I have a problem with a bid or auction result. What should I do?',
    answer: 'Keep the auction or vehicle reference and open a Support case. Describe what you saw, when it happened, and what outcome you expected. This gives the resolution team a traceable case instead of an untracked message.',
    nextStep: 'Open a support case',
  },
  {
    id: 'faq-ins-1',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className={iconClass} />,
    question: 'What is included in a KAYAD pre-purchase inspection?',
    answer: 'Inspections are performed by independent inspection providers. Checklist depth and pricing are provider-specific, so KAYAD does not present one fixed inspection point count as a universal standard. The inspection record and report shown for your order are the authoritative source for that inspection.',
    nextStep: 'Open Inspection',
    popular: true,
  },
  {
    id: 'faq-ins-2',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className={iconClass} />,
    question: 'What if the inspection finds a serious problem?',
    answer: 'Keep the inspection order and report reference. If the finding affects an active purchase or escrow case, open a Support case with the inspection reference and explain the issue. Refund, dispute and settlement outcomes are governed by the applicable transaction state and review process; the Support page does not promise an automatic refund.',
    nextStep: 'Open a support case',
  },
  {
    id: 'faq-ins-3',
    category: 'inspections',
    categoryLabel: 'Pre-Purchase Inspection',
    categoryIcon: <ClipboardCheck className={iconClass} />,
    question: 'Can I use my own mechanic?',
    answer: 'You can raise the request with the seller and KAYAD Support. If the inspection needs to be part of a KAYAD inspection order, use the inspection workflow so the applicable provider, scheduling and report records remain attached to the transaction.',
    nextStep: 'Open Inspection',
  },
  {
    id: 'faq-esc-1',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <LockKeyhole className={iconClass} />,
    question: 'How does KAYAD Escrow protect a transaction?',
    answer: 'KAYAD Escrow is built around a controlled transaction lifecycle. Funding, buyer confirmation, delivery, release, dispute and refund states are recorded by the backend. A release or refund is not created simply because a page says it should happen; the authorized transaction state and financial controls are authoritative.',
    nextStep: 'Open Escrow',
    popular: true,
  },
  {
    id: 'faq-esc-2',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <LockKeyhole className={iconClass} />,
    question: 'How do I know where to send an escrow payment?',
    answer: 'Use the funding instructions returned for your actual escrow case. Do not use bank or payment details copied from a general FAQ or from another transaction. If the instructions are missing, unclear or appear inconsistent with your case, stop and open Support before sending funds.',
    nextStep: 'Open Escrow',
  },
  {
    id: 'faq-esc-3',
    category: 'escrow',
    categoryLabel: 'Escrow',
    categoryIcon: <LockKeyhole className={iconClass} />,
    question: 'What happens if an escrow transaction is disputed?',
    answer: 'A dispute becomes a controlled transaction state. Resolution can lead to the applicable release or refund path, with financial records and settlement controls kept separate. Open a Support case for a human-readable case trail, and include the escrow reference.',
    nextStep: 'Open a support case',
  },
  {
    id: 'faq-fin-1',
    category: 'financing',
    categoryLabel: 'Financing',
    categoryIcon: <Landmark className={iconClass} />,
    question: 'How does vehicle financing work through KAYAD?',
    answer: 'Financing is partner- and underwriting-dependent. Requirements, rates, approval decisions and final terms come from the applicable financing workflow and partner. Support can help explain where your application sits, but cannot substitute for the lender’s underwriting decision.',
    nextStep: 'Open Financing',
  },
  {
    id: 'faq-fin-2',
    category: 'financing',
    categoryLabel: 'Financing',
    categoryIcon: <Landmark className={iconClass} />,
    question: 'My financing application is delayed or unclear. What should I send Support?',
    answer: 'Include the application or vehicle reference, the stage you reached, and the specific information you need. Do not place bank statements, ID documents or other sensitive financial documents into a general support description unless the authenticated workflow explicitly requests them.',
    nextStep: 'Open a support case',
  },
  {
    id: 'faq-transfer-1',
    category: 'transfer',
    categoryLabel: 'Transfer & Ownership',
    categoryIcon: <FileText className={iconClass} />,
    question: 'How do I get help with logbook or ownership transfer?',
    answer: 'Ownership transfer is a governed post-transaction fulfilment step. KAYAD Support can help you identify the correct transaction and current case state. The support page does not claim a live direct government-registry integration or automatic title clearance.',
    nextStep: 'Open a support case',
    popular: true,
  },
  {
    id: 'faq-account-1',
    category: 'transfer',
    categoryLabel: 'Account & Access',
    categoryIcon: <UserRound className={iconClass} />,
    question: 'I cannot access my account or a transaction.',
    answer: 'Use the sign-in flow first. If you can sign in but cannot see a transaction, inspection, escrow case or support case that should belong to you, open a Support case and provide the relevant reference. Support access is owner-scoped by the authenticated account.',
    nextStep: 'Sign in',
  },
];

interface SupportFAQProps {
  onContactSupport?: () => void;
  onNavigate?: (target: string) => void;
  onOpenAuth?: () => void;
}

export const SupportFAQ: React.FC<SupportFAQProps> = ({ onContactSupport, onNavigate, onOpenAuth }) => {
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<string[]>(['faq-market-1', 'faq-esc-1']);

  const filteredFaqs = useMemo(() => FAQ_DATA.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [item.question, item.answer, item.categoryLabel, item.nextStep]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(q));
  }), [selectedCategory, searchQuery]);

  const categories: { id: FAQCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All help', icon: <HelpCircle className={iconClass} /> },
    { id: 'marketplace', label: 'Marketplace', icon: <Car className={iconClass} /> },
    { id: 'auctions', label: 'Auctions', icon: <Gavel className={iconClass} /> },
    { id: 'inspections', label: 'Inspection', icon: <ClipboardCheck className={iconClass} /> },
    { id: 'escrow', label: 'Escrow', icon: <LockKeyhole className={iconClass} /> },
    { id: 'financing', label: 'Financing', icon: <Landmark className={iconClass} /> },
    { id: 'transfer', label: 'Account & transfer', icon: <FileText className={iconClass} /> },
  ];

  const toggleItem = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]);
  };

  const handleNextStep = (faq: FAQItem) => {
    if (faq.nextStep === 'Open support case') {
      onContactSupport?.();
      return;
    }
    if (faq.nextStep === 'Sign in') {
      onOpenAuth?.();
      return;
    }
    if (!onNavigate) {
      onContactSupport?.();
      return;
    }
    onNavigate(faq.nextStep === 'Marketplace' ? 'gallery' : faq.nextStep === 'Open Auction' ? 'auctions' : faq.nextStep === 'Open Inspection' ? 'inspections' : faq.nextStep === 'Open Escrow' ? 'escrow' : faq.nextStep === 'Open Financing' ? 'financing' : faq.nextStep === 'Sign in' ? 'signin' : 'support');
  };

  return (
    <section className="space-y-5" aria-labelledby="support-knowledge-heading">
      <div className="rounded-[28px] border border-[#D7E7E4] bg-white shadow-sm overflow-hidden">
        <div className="bg-[#0A3340] px-5 py-6 sm:px-7 sm:py-7 text-white">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9BE5D9]">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified help for the KAYAD journey
              </div>
              <h2 id="support-knowledge-heading" className="text-2xl sm:text-3xl font-black tracking-tight">Find the answer before you open a case.</h2>
              <p className="text-sm leading-6 text-slate-300">Search the same language used across Marketplace, Auctions, Inspection, Escrow, Financing and transaction fulfilment.</p>
            </div>
            <div className="w-full lg:w-[380px]">
              <Input
                aria-label="Search KAYAD help"
                placeholder="Search by problem, transaction or service…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4 text-slate-400" />}
                className="bg-white text-slate-900 border-white/20 shadow-lg"
              />
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {categories.map(category => {
              const count = category.id === 'all' ? FAQ_DATA.length : FAQ_DATA.filter(item => item.category === category.id).length;
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${active ? 'bg-[#176B87] text-white' : 'text-slate-600 hover:bg-[#EEF7F5]'}`}
                >
                  {category.icon}
                  {category.label}
                  <span className={`px-1.5 rounded-full text-[10px] ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {filteredFaqs.length === 0 ? (
        <Card className="p-10 text-center bg-white">
          <HelpCircle className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="mt-3 text-sm font-extrabold text-[#0A3340]">No matching answer</h3>
          <p className="mt-1 text-xs text-slate-500">Try a vehicle, auction, inspection, escrow, financing or account term.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}>Reset search</Button>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {filteredFaqs.map(faq => {
            const expanded = expandedIds.includes(faq.id);
            return (
              <div key={faq.id} className={`rounded-2xl border bg-white overflow-hidden transition-shadow ${expanded ? 'border-[#176B87]/25 shadow-sm' : 'border-slate-200'}`}>
                <button type="button" onClick={() => toggleItem(faq.id)} className="w-full text-left px-4 sm:px-5 py-4 flex items-start gap-4">
                  <div className="mt-0.5 w-8 h-8 rounded-xl bg-[#EEF7F5] text-[#176B87] flex items-center justify-center shrink-0">{faq.categoryIcon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#176B87]">{faq.categoryLabel}</span>
                      {faq.popular && <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">Popular</span>}
                    </div>
                    <h3 className="text-sm sm:text-[15px] font-extrabold text-[#0A3340] leading-snug">{faq.question}</h3>
                  </div>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${expanded ? 'bg-[#176B87] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </button>
                {expanded && (
                  <div className="px-4 sm:px-5 pb-5 pl-16 sm:pl-[68px]">
                    <p className="text-sm leading-6 text-slate-600 max-w-4xl">{faq.answer}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {faq.nextStep && (
                        <button type="button" onClick={() => handleNextStep(faq)} className="inline-flex items-center gap-2 rounded-xl bg-[#176B87] text-white px-3.5 py-2.5 text-xs font-extrabold hover:bg-[#0A3340] transition-colors">
                          {faq.nextStep} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onContactSupport && faq.nextStep !== 'Open support case' && (
                        <button type="button" onClick={onContactSupport} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 text-[#176B87] px-3.5 py-2.5 text-xs font-extrabold hover:bg-slate-50">
                          Still need help
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SupportFAQ;
