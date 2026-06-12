import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ShieldCheck, Lock, Gavel, Award, Car,
  ShoppingBag, HeadphonesIcon, Users, Tag, Search,
  TrendingUp, Star,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { PageShell } from "@/components/site/PageShell";
import { AuctionCard } from "@/components/site/AuctionCard";
import { Button } from "@/components/ui/button";
import { DEMO_AUCTIONS, STATS, formatKES } from "@/lib/demo-data";
import heroCar from "@/assets/hero-car.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KAYAD — Where Kenya Drives | Premium Car Marketplace" },
      {
        name: "description",
        content:
          "Kenya's premium car marketplace. Live auctions, verified dealers, and M-Pesa secured escrow. East Africa's most sophisticated automotive platform.",
      },
      { property: "og:title", content: "KAYAD — Where Kenya Drives" },
      {
        property: "og:description",
        content: "Live auctions, verified dealers, M-Pesa secured escrow.",
      },
    ],
  }),
  component: HomePage,
}));

/* ── Animated counter ───────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatItem({
  icon,
  value,
  label,
  suffix = "",
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
}) {
  const v = useCountUp(value);
  return (
    <div className="flex items-center gap-4 p-6">
      <div className="text-gold/70 shrink-0">{icon}</div>
      <div>
        <div className="stat-value">
          {v}
          {suffix}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ── Live ticker ────────────────────────────────────────────────────── */
function LiveTicker() {
  const liveCount = DEMO_AUCTIONS.filter((a) => a.live).length;
  const msg = `🔴 ${liveCount} vehicles LIVE NOW — bidding open`;
  const items = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div
      className="overflow-hidden border-y border-border/30 py-2"
      style={{
        background:
          "linear-gradient(90deg, oklch(0.62 0.22 22 / 0.04), oklch(0.62 0.22 22 / 0.02))",
      }}
    >
      <div className="flex">
        <div className="ticker-track">
          {[...items, ...items].map((_, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 pr-10 text-[10px] font-semibold uppercase tracking-[0.1em] text-live/80"
            >
              <span className="dot-live shrink-0" />
              {msg}
              <span className="text-border">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Hero section ───────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroCar}
          alt="Luxury car at golden hour"
          width={1920}
          height={1080}
          className="h-full w-full object-cover object-center"
        />
        {/* Horizontal gradient — text legibility */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero)" }}
        />
        {/* Bottom fade into page */}
        <div
          className="absolute inset-0"
          style={{ background: "var(--gradient-hero-b)" }}
        />
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-background/20" />
      </div>

      {/* Content */}
      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 lg:px-8 lg:py-36">
        <div className="max-w-[640px]">
          {/* Eyebrow */}
          <div className="eyebrow mb-6 animate-fade-up">
            Kenya's Premium Car Marketplace
          </div>

          {/* Live badge */}
          <div className="mb-6 animate-fade-up delay-100">
            <span className="label-pill label-pill-live backdrop-blur-sm">
              <span className="dot-live" />
              {DEMO_AUCTIONS.filter((a) => a.live).length} auctions live now
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-6xl font-bold leading-[0.92] text-foreground md:text-7xl lg:text-[5.5rem] animate-fade-up delay-150">
            WHERE KENYA
            <br />
            <em className="italic text-gradient-gold">DRIVES</em>
          </h1>

          <p className="mt-6 max-w-lg text-base text-foreground/65 md:text-lg animate-fade-up delay-200">
            Live auctions with snipe protection, KRA-verified dealers, and
            M-Pesa secured escrow — East Africa's most trusted automotive
            platform.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3 animate-fade-up delay-300">
            <Link to="/gallery">
              <Button
                size="lg"
                className="font-semibold uppercase tracking-wider shadow-[var(--shadow-gold)] hover:shadow-[var(--shadow-gold)] transition-shadow"
                style={{
                  backgroundImage: "var(--gradient-gold)",
                  color: "var(--gold-foreground)",
                }}
              >
                Enter the Gallery
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auctions">
              <Button
                size="lg"
                variant="outline"
                className="border-foreground/25 bg-background/30 backdrop-blur-sm uppercase tracking-wider hover:border-gold/50 hover:text-gold transition-colors"
              >
                Live Auctions
                <span className="ml-2 dot-live" />
              </Button>
            </Link>
          </div>

          {/* Trust mini-badges */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-foreground/70 animate-fade-up delay-400">
            {[
              { icon: <ShieldCheck className="h-4 w-4 text-gold" />, label: "Verified Dealers" },
              { icon: <Lock className="h-4 w-4 text-gold" />, label: "M-Pesa Escrow" },
              { icon: <Gavel className="h-4 w-4 text-gold" />, label: "Live Auctions" },
              { icon: <Award className="h-4 w-4 text-gold" />, label: "Ghost Check" },
            ].map(({ icon, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-foreground/25 animate-fade-up delay-500 pointer-events-none">
        <div className="h-8 w-px bg-gradient-to-b from-transparent to-foreground/25" />
        <span className="text-[9px] uppercase tracking-[0.2em]">Scroll</span>
      </div>
    </section>
  );
}

/* ── Stats strip ────────────────────────────────────────────────────── */
function StatsStrip() {
  return (
    <section className="relative -mt-6 z-10 px-4 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-xl border border-border/50 bg-surface/95 backdrop-blur-xl shadow-[var(--shadow-card)] overflow-hidden">
          <div className="grid grid-cols-2 divide-x divide-y divide-border/30 md:grid-cols-4 md:divide-y-0">
            <StatItem icon={<Car className="h-6 w-6" />} value={STATS[0].value} label={STATS[0].label} />
            <StatItem icon={<TrendingUp className="h-6 w-6" />} value={STATS[1].value} label={STATS[1].label} />
            <StatItem icon={<Gavel className="h-6 w-6" />} value={STATS[2].value} label={STATS[2].label} suffix=" live" />
            <StatItem icon={<ShoppingBag className="h-6 w-6" />} value={STATS[3].value} label={STATS[3].label} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Live auctions grid ─────────────────────────────────────────────── */
function LiveAuctions() {
  const live = DEMO_AUCTIONS.filter((a) => a.live).slice(0, 4);
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <span className="label-pill label-pill-live mb-3 inline-flex">
            <span className="dot-live" /> Live Now
          </span>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Live{" "}
            <span className="text-gradient-gold italic">Auctions</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Real-time bidding — every second counts.
          </p>
        </div>
        <Link
          to="/auctions"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-gold hover:underline underline-offset-4 md:flex"
        >
          All Auctions <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {live.map((a) => (
          <AuctionCard key={a.id} a={a} />
        ))}
      </div>

      <div className="mt-6 flex justify-center md:hidden">
        <Link to="/auctions">
          <Button variant="outline" className="w-full max-w-xs">
            View All Live Auctions
          </Button>
        </Link>
      </div>
    </section>
  );
}

/* ── Feature pillars ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Gavel className="h-6 w-6" />,
    title: "Live Auctions",
    body: "Real-time bidding with snipe protection and automatic time extensions. Every bid, every second, matters.",
    href: "/auctions",
    cta: "Bid Now",
    color: "oklch(0.80 0.11 82)",
    glow: "oklch(0.80 0.11 82 / 0.07)",
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: "M-Pesa Escrow",
    body: "Your money is held securely until vehicle delivery is confirmed. Pay with confidence, every time.",
    href: "/how-it-works",
    cta: "How It Works",
    color: "oklch(0.72 0.16 152)",
    glow: "oklch(0.72 0.16 152 / 0.06)",
  },
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Verified Dealers",
    body: "Every dealer is KRA-vetted and rated by real buyers. Browse with the transparency Kenya deserves.",
    href: "/gallery",
    cta: "Browse Dealers",
    color: "oklch(0.65 0.18 242)",
    glow: "oklch(0.65 0.18 242 / 0.06)",
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "Ghost Check",
    body: "Full vehicle history — NTSA records, accident reports, theft checks, odometer verification.",
    href: "/ghost-check",
    cta: "Check a Car",
    color: "oklch(0.70 0.14 310)",
    glow: "oklch(0.70 0.14 310 / 0.06)",
  },
] as const;

function Features() {
  return (
    <section className="border-y border-border/30 bg-surface/40 py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Section header */}
        <div className="mb-12 text-center">
          <div className="eyebrow mb-4 justify-center">Why KAYAD</div>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Built for East Africa.{" "}
            <span className="text-gradient-gold italic">Trusted by Thousands.</span>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.href} className="block">
              <div
                className="feature-card h-full p-6"
                style={{ "--feature-glow": f.glow } as React.CSSProperties}
              >
                {/* Icon */}
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg border"
                  style={{
                    color: f.color,
                    background: f.glow,
                    borderColor: `${f.color.replace(")", " / 0.20)")}`,
                  }}
                >
                  {f.icon}
                </div>

                <h3 className="font-display text-xl font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>

                <div
                  className="mt-5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider transition-gap"
                  style={{ color: f.color }}
                >
                  {f.cta}
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Browseable gallery strip ───────────────────────────────────────── */
function GalleryStrip() {
  const upcoming = DEMO_AUCTIONS.filter((a) => !a.live);
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-3">The Gallery</div>
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Upcoming{" "}
            <span className="text-gradient-gold italic">Inventory</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Premium vehicles from Kenya's most trusted dealers.
          </p>
        </div>
        <Link
          to="/gallery"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-gold hover:underline underline-offset-4 md:flex"
        >
          Full Gallery <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.slice(0, 3).map((a) => (
          <AuctionCard key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}

/* ── Trust strip ────────────────────────────────────────────────────── */
const TRUST = [
  { icon: <ShieldCheck />, title: "Ghost Check", body: "Full vehicle history before you commit." },
  { icon: <Lock />, title: "M-Pesa Escrow", body: "Funds held safely until delivery confirmed." },
  { icon: <Users />, title: "Verified Dealers", body: "Every dealer reviewed and rated by buyers." },
  { icon: <HeadphonesIcon />, title: "24/7 Support", body: "Our team is always here for you." },
];

function TrustStrip() {
  return (
    <section className="border-y border-border/30 bg-surface py-12">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {TRUST.map((t) => (
          <div key={t.title} className="flex items-start gap-4">
            <div className="shrink-0 rounded-lg border border-gold/25 bg-gold/10 p-2.5 text-gold">
              {t.icon}
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{t.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── CTA section ────────────────────────────────────────────────────── */
function CtaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 lg:px-8">
      <div
        className="relative overflow-hidden rounded-2xl border border-gold/25 p-10 text-center md:p-16"
        style={{ background: "var(--gradient-surface)" }}
      >
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.80 0.11 82 / 0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative">
          <Tag className="mx-auto h-10 w-10 text-gold mb-4" />

          <div className="eyebrow mb-4 justify-center">
            Start Selling Today
          </div>

          <h2 className="font-display text-4xl font-bold text-foreground md:text-5xl lg:text-6xl">
            Ready to{" "}
            <em className="italic text-gradient-gold">Sell?</em>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Join thousands of verified Kenyan dealers and private sellers.
            List your first vehicle free and reach serious buyers across East Africa.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/dealer-application">
              <Button
                size="lg"
                className="font-semibold uppercase tracking-wider shadow-[var(--shadow-gold)]"
                style={{
                  backgroundImage: "var(--gradient-gold)",
                  color: "var(--gold-foreground)",
                }}
              >
                Apply as Dealer
              </Button>
            </Link>
            <Link to="/auth" search={{ tab: "signup" } as never}>
              <Button
                size="lg"
                variant="outline"
                className="uppercase tracking-wider border-foreground/25 hover:border-gold/50 hover:text-gold"
              >
                Sell as Individual
              </Button>
            </Link>
          </div>

          {/* Trust micro-badges */}
          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {["Free to list", "KRA Verified", "M-Pesa Ready", "Instant listing"].map((t) => (
              <span key={t} className="label-pill label-pill-gold">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Page composition ───────────────────────────────────────────────── */
function HomePage() {
  return (
    <PageShell>
      <Hero />
      <LiveTicker />
      <StatsStrip />
      <LiveAuctions />
      <Features />
      <GalleryStrip />
      <TrustStrip />
      <CtaSection />
    </PageShell>
  );
}
