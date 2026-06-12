import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { AuctionCard } from "@/components/site/AuctionCard";
import { DEMO_AUCTIONS } from "@/lib/demo-data";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — KAYAD" },
      { name: "description", content: "Browse premium vehicles from verified Kenyan dealers." },
    ],
  }),
  component: () => (
    <PageShell>
      <PageHero
        eyebrow="Browse Inventory"
        title="The Gallery"
        subtitle="Curated premium vehicles from Kenya's most trusted and verified dealers."
      />
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {DEMO_AUCTIONS.length} vehicles available
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_AUCTIONS.map((a) => <AuctionCard key={a.id} a={a} />)}
        </div>
      </div>
    </PageShell>
  ),
});
