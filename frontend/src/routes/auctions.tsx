import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { AuctionCard } from "@/components/site/AuctionCard";
import { DEMO_AUCTIONS } from "@/lib/demo-data";

export const Route = createFileRoute("/auctions")({
  head: () => ({
    meta: [
      { title: "Live Auctions — KAYAD" },
      { name: "description", content: "Bid in real-time on premium cars across Kenya." },
    ],
  }),
  component: () => {
    const live = DEMO_AUCTIONS.filter((a) => a.live);
    const upcoming = DEMO_AUCTIONS.filter((a) => !a.live);
    return (
      <PageShell>
        <PageHero
          eyebrow="Live Now"
          title="Live Auctions"
          subtitle="Bid in real-time with snipe protection. Every auction is secured by M-Pesa escrow."
        />

        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8 space-y-16">
          {/* Live */}
          <div>
            <div className="mb-7 flex items-center gap-3">
              <span className="label-pill label-pill-live">
                <span className="dot-live" /> {live.length} live
              </span>
              <h2 className="font-display text-2xl font-bold text-foreground">Bidding Open</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((a) => <AuctionCard key={a.id} a={a} />)}
            </div>
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div>
              <div className="mb-7 flex items-center gap-3">
                <span className="label-pill label-pill-gold">Upcoming</span>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Coming Soon
                </h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((a) => <AuctionCard key={a.id} a={a} />)}
              </div>
            </div>
          )}
        </div>
      </PageShell>
    );
  },
});
