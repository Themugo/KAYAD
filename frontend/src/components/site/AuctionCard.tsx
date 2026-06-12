import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Gavel } from "lucide-react";
import type { Auction } from "@/lib/demo-data";
import { formatKES } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

export function AuctionCard({ a }: { a: Auction }) {
  return (
    <div className="card-hover group overflow-hidden rounded-xl border border-border/50 bg-surface">
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <img
          src={a.image}
          alt={a.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />

        {/* Top-left badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {a.live && (
            <span className="label-pill label-pill-live backdrop-blur-sm">
              <span className="dot-live" />
              <Clock className="h-2.5 w-2.5" />
              {a.timeLeft}
            </span>
          )}
          {!a.live && (
            <span className="label-pill label-pill-gold backdrop-blur-sm">
              Upcoming
            </span>
          )}
        </div>

        {/* Bid count badge — top right */}
        <div className="absolute right-3 top-3">
          <span className="flex items-center gap-1 rounded-full bg-background/75 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-foreground/80 border border-border/40">
            <Gavel className="h-2.5 w-2.5 text-gold" />
            {a.bids} bids
          </span>
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent" />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground leading-snug">
            {a.title}{" "}
            <span className="text-muted-foreground font-sans font-normal text-sm">
              {a.year}
            </span>
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-gold/50" />
            {a.location}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {a.live ? "Current bid" : "Starting bid"}
            </div>
            <div className="text-xl font-bold text-gradient-gold font-display">
              {formatKES(a.price)}
            </div>
          </div>

          <Link to="/auctions">
            <Button
              size="sm"
              className="shrink-0 text-[11px] font-bold uppercase tracking-wider transition-all hover:shadow-[var(--shadow-gold-sm)]"
              style={{
                backgroundImage: a.live ? "var(--gradient-gold)" : undefined,
                color: a.live ? "var(--gold-foreground)" : undefined,
              }}
              variant={a.live ? "default" : "outline"}
            >
              {a.live ? "Bid Now" : "View"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
