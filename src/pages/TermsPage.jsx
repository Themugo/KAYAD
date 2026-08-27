import usePageMeta from '../hooks/usePageMeta';

export default function TermsPage() {
  usePageMeta('Terms of Service', 'Kayad\'s terms of service - the rules and guidelines for using our marketplace.');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 40 }}>
      <div className="container" style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
            Legal
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', margin: '0 0 16px' }}>
            Terms of <span style={{ color: 'var(--gold)' }}>Service</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Last updated: January 2026</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            {
              title: '1. Acceptance of Terms',
              content: 'By accessing or using Kayad (the "Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our services. We reserve the right to modify these terms at any time.',
            },
            {
              title: '2. Account Registration',
              content: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials. Dealers and sellers must undergo verification before listing vehicles.',
            },
            {
              title: '3. Listings and Auctions',
              content: 'All vehicle listings must be accurate and truthful. Auction bids are binding commitments. Sellers must honor accepted bids. Kayad reserves the right to remove listings that violate our policies.',
            },
            {
              title: '4. Escrow and Payments',
              content: 'Escrow services hold funds securely until delivery is confirmed by the buyer. M-Pesa payments are processed through Safaricom\'s Daraja API. Kayad charges a platform fee on completed transactions.',
            },
            {
              title: '5. Prohibited Conduct',
              content: 'Users may not: (a) list stolen or fraudulent vehicles, (b) manipulate auction bids, (c) impersonate other users or dealers, (d) use the platform for illegal activities, or (e) circumvent platform fees.',
            },
            {
              title: '6. Dispute Resolution',
              content: 'Disputes between buyers and sellers are first handled through our escrow dispute process. Unresolved disputes may be escalated to mediation. Kenyan law governs all disputes arising from use of the Platform.',
            },
            {
              title: '7. Limitation of Liability',
              content: 'Kayad acts as a marketplace and does not guarantee the condition, authenticity, or legality of vehicles listed. We are not liable for disputes between users beyond our escrow obligations.',
            },
          ].map((section, i) => (
            <div key={i}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: '1.3rem', color: '#fff', margin: '0 0 12px' }}>{section.title}</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, margin: 0 }}>{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
