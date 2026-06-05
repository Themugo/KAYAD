import usePageMeta from '../hooks/usePageMeta';

export default function PrivacyPage() {
  usePageMeta('Privacy Policy', 'Kayad\'s privacy policy - how we collect, use, and protect your personal data.');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 40 }}>
      <div className="container" style={{ maxWidth: 760, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
            Legal
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', margin: '0 0 16px' }}>
            Privacy <span style={{ color: 'var(--gold)' }}>Policy</span>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Last updated: January 2026</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            {
              title: '1. Information We Collect',
              content: 'We collect information you provide directly, such as your name, email, phone number, and payment details when you register, list a vehicle, or make a purchase. We also collect usage data including browsing patterns, search queries, and device information.',
            },
            {
              title: '2. How We Use Your Information',
              content: 'Your information is used to operate and improve our marketplace, process transactions, verify identities, facilitate auctions, communicate with you about our services, and comply with legal obligations.',
            },
            {
              title: '3. Data Sharing',
              content: 'We do not sell your personal data. We may share information with verified dealers to facilitate transactions, with payment processors to handle M-Pesa transactions, and with law enforcement when required by law.',
            },
            {
              title: '4. Data Security',
              content: 'We implement industry-standard security measures including encryption, secure servers, and regular security audits. Your payment information is processed through secure, PCI-compliant payment providers.',
            },
            {
              title: '5. Your Rights',
              content: 'You have the right to access, correct, or delete your personal data. You can manage your privacy settings in your account dashboard. Contact us at privacy@kayad.space for any data-related requests.',
            },
            {
              title: '6. Cookies',
              content: 'We use essential cookies for authentication and session management, and analytics cookies to understand how users interact with our platform. You can control cookie preferences through your browser settings.',
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
