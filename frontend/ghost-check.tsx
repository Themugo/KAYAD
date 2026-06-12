import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, FileSearch, AlertTriangle, CheckCircle2, Fingerprint } from "lucide-react";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";

const CHECKS = [
  { icon: <FileSearch />, title: "NTSA Records", body: "Verify registration history, previous owners, and registration status from NTSA directly." },
  { icon: <AlertTriangle />, title: "Accident Reports", body: "Cross-checked against insurance and NTSA accident databases — know before you buy." },
  { icon: <ShieldCheck />, title: "Theft & Lien Check", body: "Confirm the car isn't stolen and has no outstanding finance or court orders against it." },
  { icon: <CheckCircle2 />, title: "Odometer Verification", body: "Detect mileage rollbacks with multi-source verification across inspection and service records." },
  { icon: <Fingerprint />, title: "Ownership Chain", body: "Full history of every owner — how many, for how long, and whether title transfers were clean." },
];

export const Route = createFileRoute("/ghost-check")({
  head: () => ({
    meta: [
      { title: "Ghost Check — KAYAD" },
      { name: "description", content: "Comprehensive vehicle history reports for Kenyan cars." },
    ],
  }),
  component: () => (
    <PageShell>
      <PageHero
        eyebrow="Vehicle History"
        title="Ghost Check"
        subtitle="Every car has a story. Know it before you buy — comprehensive history reports powered by NTSA, insurance, and court records."
      />

      <div className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((x) => (
            <div key={x.title} className="feature-card p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                {x.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">{x.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{x.body}</p>
            </div>
          ))}
        </div>

        {/* CTA block */}
        <div
          className="mt-14 relative overflow-hidden rounded-2xl border border-gold/25 p-10 text-center"
          style={{ background: "var(--gradient-surface)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.80 0.11 82 / 0.07) 0%, transparent 70%)" }}
          />
          <div className="relative">
            <h3 className="font-display text-3xl font-bold text-foreground">
              Request a{" "}
              <span className="text-gradient-gold italic">Ghost Check</span> Report
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in to request a verified history report for any vehicle on the platform.
            </p>
            <Link to="/auth" search={{ tab: "signup" } as never}>
              <Button
                className="mt-7 font-semibold uppercase tracking-wider shadow-[var(--shadow-gold)]"
                size="lg"
                style={{ backgroundImage: "var(--gradient-gold)", color: "var(--gold-foreground)" }}
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  ),
});
