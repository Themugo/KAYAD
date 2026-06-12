import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

/**
 * Reusable page-level hero banner.
 * eyebrow  — small gold label above the title
 * title    — alternating gold on every other word
 * subtitle — muted description
 * actions  — optional CTA slot rendered below subtitle
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const words = title.split(" ");

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--gradient-surface)" }}
      />
      {/* Ambient gold glow */}
      <div
        className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, oklch(0.80 0.11 82 / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 lg:px-8 lg:py-20">
        {eyebrow && (
          <div className="eyebrow mb-5 animate-fade-up">{eyebrow}</div>
        )}
        <h1 className="font-display text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl animate-fade-up delay-100">
          {words.map((w, i) =>
            i % 2 === 1 ? (
              <em key={i} className="text-gradient-gold not-italic">
                {w}{" "}
              </em>
            ) : (
              <span key={i}>{w} </span>
            )
          )}
        </h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg animate-fade-up delay-200">
            {subtitle}
          </p>
        )}
        {actions && (
          <div className="mt-8 animate-fade-up delay-300">{actions}</div>
        )}
      </div>
    </section>
  );
}
