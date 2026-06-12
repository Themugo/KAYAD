import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ShieldCheck, Gavel, Handshake, ArrowRight } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: <Search className="h-7 w-7" />,
    title: "Browse & Discover",
    body: "Explore verified inventory from trusted dealers or live auctions across Kenya. Filter by brand, price, location, and more.",
    detail: "14+ vehicles. 11 brands.",
  },
  {
    icon: <ShieldCheck className="h-7 w-7" />,
    title: "Run a Ghost Check",
    body: "Inspect a vehicle's full history before you bid or buy — NTSA records, accident reports, theft checks, odometer verification.",
    detail: "Full NTSA integration.",
  },
  {
    icon: <Gavel className="h-7 w-7" />,
    title: "Bid or Buy Now",
    body: "Place real-time bids on live auctions with snipe protection, or purchase directly at the listed price.",
    detail: "Automatic time extensions.",
  },
  {
    icon: <Handshake className="h-7 w-7" />,
    title: "M-Pesa Escrow",
    body: "Pay securely through M-Pesa escrow. Funds are held safely and only released after delivery is confirmed by both parties.",
    detail: "Zero-risk payments.",
  },
];

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — KAYAD" },
      { name: "description", content: "From browsing to bidding to delivery — here's how KAYAD works." },
    ],
  }),
  component: () => (
    <PageShell>
      <PageHero
        eyebrow="Simple. Secure. Smart."
        title="How It Works"
        subtitle="Four steps from browsing to driving away — backed by M-Pesa escrow at every stage."
      />

      <div className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        <ol className="relative space-y-5">
          {/* Vertical connector line */}
          <div className="absolute left-[27px] top-14 bottom-14 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent hidden md:block" />

          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="relative flex gap-6 rounded-xl border border-border/50 bg-surface p-6 card-hover"
            >
              {/* Step number */}
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg font-display text-2xl font-bold shadow-[var(--shadow-gold-sm)] z-10"
                style={{
                  backgroundImage: "var(--gradient-gold)",
                  color: "var(--gold-foreground)",
                }}
              >
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-gold">
                  {s.icon}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Step {i + 1}
                  </span>
                  <span className="label-pill label-pill-gold ml-auto shrink-0">
                    {s.detail}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* CTA */}
        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link to="/gallery">
            <Button
              size="lg"
              style={{ backgroundImage: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
              className="font-semibold uppercase tracking-wider"
            >
              Start Browsing <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/ghost-check">
            <Button size="lg" variant="outline" className="uppercase tracking-wider">
              Run a Ghost Check
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  ),
});
