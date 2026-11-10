import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '../components/BrandMark';

type Section = { heading: string; body: string[] };
const UPDATED = '10 November 2026';

const TERMS: Section[] = [
  { heading: '1. About these terms', body: [
    'KAYAD is an online marketplace in Kenya where dealers and private sellers list vehicles and where buyers can browse, enquire, bid in auctions and, where offered, use escrow and inspection services. By creating an account or using KAYAD you agree to these terms.',
    'KAYAD provides the platform. Unless a listing says otherwise, the sale of a vehicle is an agreement between the buyer and the seller, not with KAYAD.',
  ] },
  { heading: '2. Accounts', body: [
    'You must give accurate details and keep your sign-in secure. You are responsible for activity on your account. Tell Support straight away if you think someone else has used it.',
    'Selling as a dealer requires KAYAD to review and approve your business first. Private sellers can list within the limits shown in the seller area.',
  ] },
  { heading: '3. Listings', body: [
    'Sellers are responsible for the accuracy of their listings, photos, prices and availability. A verified badge is shown only where KAYAD has actually verified the listing or seller; it is not a guarantee of a vehicle’s condition.',
    'KAYAD may remove listings or restrict accounts that are misleading, unlawful or reported as fraudulent.',
  ] },
  { heading: '4. Auctions and bid commitments', body: [
    'To bid in an auction you register and pay the bid commitment shown on that auction. The payment screen and auction-specific rules must identify the collection recipient and applicable refund route before you confirm. Collection options may differ by auction and are available only where the relevant payment, custody and reconciliation capability has been enabled. Private sellers cannot choose where commitments are paid.',
    'Pay commitments only through the payment flow presented inside KAYAD (for example, an M-Pesa prompt to your phone). Do not pay a commitment to a person who contacts you separately or to payment details that are not shown in the KAYAD flow. If the recipient or refund route is unclear, do not proceed and contact Support.',
    'Bids are shown under an anonymous bidder ID, not your real name. Bids are binding offers, and the auction closes at the time shown on it.',
    'When an auction closes the winner is notified and can view a winner certificate. The winner then arranges payment and handover with the dealer or seller within the payment period shown on the auction. KAYAD is not a party to that arrangement unless you use an escrow service.',
    'If the winner does not complete payment within that period (and any grace period shown), the seller may re-award the auction, and the winner’s commitment may be forfeited where the auction rules allow it.',
  ] },
  { heading: '5. Refunds of commitments', body: [
    'The refund destination and process depend on the collection route shown for the auction and the applicable auction rules. A KAYAD wallet credit or M-Pesa withdrawal is available only where that capability is enabled and shown in your account; do not assume every commitment can be withdrawn. Where a commitment is paid directly to a dealer under an enabled dealer-collection arrangement, the dealer is responsible for returning it under the auction rules. Keep your payment receipt and contact Support if a refund is overdue or disputed.',
  ] },
  { heading: '6. Comments and conduct', body: [
    'Comments on auctions appear under your anonymous bidder ID. Do not post links, phone numbers, email addresses or requests to pay or move a conversation off KAYAD. Abusive or fraudulent content can be hidden, and repeated reports hide a comment automatically while it is reviewed.',
    'Do not use KAYAD to commit fraud, interfere with bidding, scrape data in bulk or break the law.',
  ] },
  { heading: '7. Fees and payments', body: [
    'Fees that apply to a service, listing or auction are shown before you confirm. Payments are made in Kenya shillings through M-Pesa or the methods shown in the app.',
  ] },
  { heading: '8. Liability', body: [
    'KAYAD does not inspect or own the vehicles listed and is not responsible for a seller’s statements. To the extent the law allows, KAYAD is not liable for losses arising from a sale between a buyer and seller. Nothing in these terms limits any right you have under Kenyan consumer law.',
  ] },
  { heading: '9. Changes and contact', body: [
    'We may update these terms; the date above shows the latest version, and continued use means you accept the update. For questions or disputes contact Support from the Support page.',
  ] },
];

const PRIVACY: Section[] = [
  { heading: '1. What this covers', body: [
    'This policy explains what personal information KAYAD collects, why, and the choices you have. It applies to the KAYAD website and app in Kenya and is meant to be read together with the Terms of Service.',
  ] },
  { heading: '2. Information we collect', body: [
    'Account details: your name, phone number, email address and password (stored in protected form). Dealers and service providers also give business details for review.',
    'Activity: vehicles you save or enquire about, messages you send through KAYAD, auction registrations, bids, comments, follows and likes, and notifications you receive.',
    'Payments: the M-Pesa phone number used, amounts, references and status of commitments, refunds, wallet movements and withdrawals. We do not receive your M-Pesa PIN.',
    'Usage: pages visited and technical details such as device and browser type, used to keep the service secure and to understand what is useful. Auction view counts use a salted, one-way hash of a visitor, not your name.',
  ] },
  { heading: '3. How we use it', body: [
    'To run your account and the marketplace, process commitments, refunds and payouts, show auction standings under an anonymous bidder ID, send notices you ask for (for example when an auction you follow starts or ends), prevent fraud and abuse, and improve KAYAD.',
    'Your real name is not shown to other bidders. A seller or dealer sees your details only where needed for an enquiry or to complete a sale you won.',
  ] },
  { heading: '4. Sharing', body: [
    'We share only information needed for the relevant purpose with sellers and dealers you choose to deal with, payment providers such as Safaricom M-Pesa, technical and operational service providers that support hosting, storage, communications, security and analytics, and public authorities where the law requires. These providers may process information on KAYAD’s instructions or under their own legal obligations. We do not sell your personal information. The specific provider list, processing locations and applicable cross-border transfer safeguards should be confirmed in the current provider register; this policy does not claim that all processing takes place in Kenya.',
  ] },
  { heading: '5. Keeping and protecting it', body: [
    'We retain information for as long as it is reasonably needed for the purpose for which it was collected, to operate your account and transactions, prevent fraud, meet applicable legal and accounting duties, and establish or defend claims. We restrict access and use security controls for sensitive information. Information should be securely deleted or de-identified when it is no longer required, subject to lawful retention obligations. KAYAD does not publish fixed retention periods for each data category in this policy; those periods require confirmation against the operational retention schedule.',
  ] },
  { heading: '6. Your rights', body: [
    'Under the Kenya Data Protection Act, 2019 you may exercise applicable rights, including access, correction, deletion, objection and withdrawal of consent where processing is based on consent. To make a request, email support@kayad.space from your registered email address or use the Support page. State the right you wish to exercise and the account phone number or email used on KAYAD. We may ask for proportionate information to verify that you control the account; never send your password, M-Pesa PIN or one-time security code. We will acknowledge the request, route it for review, and respond within the period required by applicable law. If we cannot fulfil a request, we will explain the reason and any available review or complaint route.',
  ] },
  { heading: '7. Cookies and local storage', body: [
    'KAYAD uses cookies and browser storage to keep you signed in, remember preferences and secure the service.',
  ] },
  { heading: '8. Data controller and contact', body: [
    'For privacy questions and data-rights requests, contact KAYAD at support@kayad.space or through the Support page. The KAYAD brand name and support email are the public contact details currently stated here; the legal name and registered address of the data controller, and any designated data protection officer contact, must be confirmed and published by the service operator.',
  ] },
  { heading: '9. Changes', body: [
    'We may update this policy; the date above shows the latest version.',
  ] },
];

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const isTerms = kind === 'terms';
  const sections = isTerms ? TERMS : PRIVACY;
  const title = isTerms ? 'Terms of Service' : 'Privacy Policy';
  return (
    <main className="min-h-screen bg-[#F6FAF9] text-[#0A3340]" data-testid={`legal-${kind}`}>
      <header className="bg-white border-b border-[#D7E7E4]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" aria-label="KAYAD home" className="min-w-0"><BrandMark size={32} nameClassName="text-base font-extrabold text-[#0A3340]" /></Link>
          <Link to="/" className="inline-flex items-center gap-1.5 min-h-10 px-3 rounded-xl border border-[#D7E7E4] text-xs font-bold text-[#12576D] hover:bg-[#EEF7F5]"><ArrowLeft className="w-4 h-4" aria-hidden="true" />Back to KAYAD</Link>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-3xl font-extrabold m-0">{title}</h1>
        <p className="text-sm text-[#64748B] mt-2 mb-8">Last updated {UPDATED}</p>
        <nav aria-label="On this page" className="mb-8 rounded-2xl border border-[#D7E7E4] bg-white p-4">
          <ul className="grid gap-1.5 sm:grid-cols-2 list-none p-0 m-0 text-sm">
            {sections.map((s, i) => (<li key={s.heading}><a href={`#s${i + 1}`} className="text-[#12576D] hover:underline">{s.heading}</a></li>))}
          </ul>
        </nav>
        <div className="space-y-7">
          {sections.map((s, i) => (
            <section key={s.heading} id={`s${i + 1}`} aria-labelledby={`h${i + 1}`}>
              <h2 id={`h${i + 1}`} className="text-lg font-bold m-0 mb-2">{s.heading}</h2>
              {s.body.map((p, k) => (<p key={k} className="text-[15px] leading-relaxed text-[#334155] m-0 mb-3">{p}</p>))}
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-[#475569]">
          Questions? Visit <Link to="/?nav=support" className="font-semibold text-[#12576D] underline">Support</Link>. See also the{' '}
          <Link to={isTerms ? '/privacy' : '/terms'} className="font-semibold text-[#12576D] underline">{isTerms ? 'Privacy Policy' : 'Terms of Service'}</Link>.
        </p>
      </article>
    </main>
  );
}
