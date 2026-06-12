import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Shield, Zap, Heart } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — KAYAD" },
      { name: "description", content: "KAYAD is East Africa's most sophisticated automotive marketplace." },
    ],
  }),
  component: () => (
    <PageShell>
      <PageHero
        eyebrow="Our Story"
        title="About KAYAD"
        subtitle="Built for Kenya. Built for trust. Built to last."
      />

      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {/* Mission */}
        <div className="mx-auto max-w-3xl">
          <p className="text-lg leading-relaxed text-foreground/85">
            KAYAD —{" "}
            <em className="italic text-gradient-gold">Where Kenya Drives</em> —
            is East Africa's most sophisticated automotive marketplace. We connect verified
            dealers, individual sellers, and serious buyers through a transparent live-auction
            platform backed by M-Pesa secured escrow.
          </p>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Every dealer is verified. Every car can be Ghost Checked. Every shilling is
            escrowed. We built KAYAD because Kenyans deserve a car marketplace as ambitious,
            transparent, and trustworthy as the country itself.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { v: "100%", l: "Verified dealers" },
            { v: "24/7", l: "Live support" },
            { v: "M-Pesa", l: "Secured escrow" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-xl border border-gold/20 bg-surface p-8 text-center card-hover"
            >
              <div className="font-display text-4xl font-bold text-gradient-gold">{s.v}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mt-16">
          <div className="eyebrow mb-6 justify-center text-center block w-full">Our Values</div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: <Shield className="h-6 w-6" />, title: "Trust First", body: "Every dealer, every vehicle, every transaction — verified." },
              { icon: <Zap className="h-6 w-6" />, title: "Built for Speed", body: "Live auctions, instant bids, real-time everything." },
              { icon: <Heart className="h-6 w-6" />, title: "Made for Kenya", body: "M-Pesa native, NTSA integrated, Swahili-friendly." },
            ].map((v) => (
              <div key={v.title} className="feature-card p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                  {v.icon}
                </div>
                <h3 className="font-display text-xl font-bold text-foreground">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  ),
});
