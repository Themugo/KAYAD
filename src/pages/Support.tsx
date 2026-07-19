import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, ChevronDown, ArrowRight, Clock } from 'lucide-react';

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  {
    q: 'How do I buy a car on KAYAD?',
    a: 'Browse our gallery, select a vehicle, review the pre-inspection report, and proceed to payment through our secure Escrow Vault. Our team guides you every step of the way.',
  },
  {
    q: 'How does the Escrow Vault protect me?',
    a: 'Your payment is held in a CBK-regulated escrow account. Funds are only released to the seller after you confirm receipt of the vehicle in the agreed condition.',
  },
  {
    q: 'Can I inspect a vehicle before buying?',
    a: 'Yes. All vehicles on KAYAD come with a 150-point certified inspection report. You may also book an independent re-inspection at any point before purchase.',
  },
  {
    q: 'How do I list a car for sale?',
    a: 'Create a seller account, submit your vehicle details, and book a pre-inspection. Once certified, your listing goes live within 24 hours.',
  },
  {
    q: 'What happens if I win an auction and change my mind?',
    a: 'All auction bids are legally binding. Withdrawal after winning incurs a 5% penalty of the bid amount. Please bid responsibly.',
  },
  {
    q: 'How long does the buying process take?',
    a: 'From listing to handover typically takes 3–7 business days. Escrow clearance adds 24–48 hours after confirmation.',
  },
  {
    q: 'Is KAYAD available outside Nairobi?',
    a: 'Yes! We operate nationwide with inspection partners in Mombasa, Kisumu, Nakuru, Eldoret, and Thika. Delivery services are also available.',
  },
  {
    q: 'What fees does KAYAD charge?',
    a: 'Buyers pay zero fees. Sellers pay a 2.5% success fee only upon a completed sale. Escrow costs 1% capped at KES 50,000.',
  },
];

function FAQItem({ q, a }: FAQ) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-cream-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="font-sans font-semibold text-charcoal-900 text-sm group-hover:text-gold-700 transition-colors duration-200 pr-4">
          {q}
        </span>
        <ChevronDown
          size={18}
          className={`text-warm-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-gold-700' : ''}`}
        />
      </button>
      {open && (
        <p className="font-sans text-sm text-warm-500 leading-relaxed pb-5">{a}</p>
      )}
    </div>
  );
}

export default function Support() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 pt-16 pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label text-gold-400 mb-3">We're Here to Help</p>
          <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mb-4">Support Centre</h1>
          <p className="font-sans text-white/50 text-base max-w-xl">
            Have a question about buying, selling, escrow, or auctions? Our team is available 7 days a week.
          </p>
        </div>
      </div>

      {/* Contact methods */}
      <section className="py-14 bg-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Phone,
                title: 'Call Us',
                info: '+254 700 000 000',
                sub: 'Mon–Sun, 8am – 8pm',
                action: 'Call Now',
              },
              {
                icon: MessageCircle,
                title: 'Live Chat',
                info: 'Available on website',
                sub: 'Typical response: 2 min',
                action: 'Start Chat',
              },
              {
                icon: Mail,
                title: 'Email Us',
                info: 'hello@kayad.co.ke',
                sub: 'Response within 4 hours',
                action: 'Send Email',
              },
            ].map(({ icon: Icon, title, info, sub, action }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-cream-200 hover:shadow-lg hover:border-gold-500/30 transition-all duration-300 group text-center">
                <div className="w-12 h-12 bg-gold-700/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-gold-700 transition-colors duration-300">
                  <Icon size={22} className="text-gold-700 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-serif text-lg text-charcoal-900 font-semibold mb-1">{title}</h3>
                <p className="font-sans text-sm font-semibold text-charcoal-800 mb-1">{info}</p>
                <p className="font-sans text-xs text-warm-400 mb-4 flex items-center justify-center gap-1">
                  <Clock size={11} /> {sub}
                </p>
                <button className="font-sans text-sm font-semibold text-gold-700 hover:text-gold-600 transition-colors">
                  {action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ + Contact form */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* FAQ */}
            <div>
              <p className="section-label mb-3">Common Questions</p>
              <h2 className="section-heading mb-8">Frequently Asked Questions</h2>
              <div className="bg-white rounded-2xl border border-cream-200 px-6">
                {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
              </div>
            </div>

            {/* Contact form */}
            <div>
              <p className="section-label mb-3">Direct Message</p>
              <h2 className="section-heading mb-8">Send Us a Message</h2>
              {sent ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M8 16l5 5 11-11" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-2xl text-charcoal-900 font-bold mb-2">Message Sent!</h3>
                  <p className="font-sans text-sm text-warm-500">We'll get back to you within 4 hours.</p>
                  <button onClick={() => setSent(false)} className="mt-5 text-gold-700 font-sans text-sm font-medium hover:underline">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-cream-200 p-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Email</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Subject</label>
                    <select
                      value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm text-charcoal-800 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all"
                    >
                      <option value="">Select a topic…</option>
                      <option>Buying a Vehicle</option>
                      <option>Selling a Vehicle</option>
                      <option>Escrow Vault</option>
                      <option>Pre-Inspection</option>
                      <option>Auction Support</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-sans text-xs font-semibold text-warm-400 tracking-wider uppercase mb-1.5 block">Message</label>
                    <textarea
                      rows={5}
                      required
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 bg-cream-50 border border-cream-300 rounded-xl font-sans text-sm outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30 transition-all resize-none"
                      placeholder="Describe your question or issue…"
                    />
                  </div>
                  <button type="submit" className="w-full btn-gold justify-center text-base py-4">
                    Send Message <ArrowRight size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Office location */}
      <section className="bg-charcoal-900 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={22} className="text-gold-400" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-white font-bold mb-1">Visit Our Office</h3>
                <p className="font-sans text-sm text-white/50">Westgate Mall, Westlands, Nairobi — Ground Floor, Suite 12</p>
                <p className="font-sans text-xs text-white/30 mt-1">Open Mon–Sat, 9am–5pm</p>
              </div>
            </div>
            <div className="md:ml-auto">
              <button className="btn-gold">
                Get Directions <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
