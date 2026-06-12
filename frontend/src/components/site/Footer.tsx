import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin } from "lucide-react";

const LINKS = {
  Marketplace: [
    ["Gallery", "/gallery"],
    ["Live Auctions", "/auctions"],
    ["Ghost Check", "/ghost-check"],
    ["How It Works", "/how-it-works"],
  ],
  Company: [
    ["About Us", "/about"],
    ["Become a Dealer", "/dealer-application"],
    ["Join Free", "/auth"],
  ],
  Account: [
    ["Sign In", "/auth"],
    ["Dashboard", "/dashboard"],
    ["Dealer Portal", "/dashboard"],
  ],
} as Record<string, [string, string][]>;

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/40">
      {/* Gold shimmer top line */}
      <div className="divider-gold" />

      <div className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <Link to="/" className="flex items-center gap-3 group w-fit">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg font-display text-xl font-bold"
                  style={{
                    backgroundImage: "var(--gradient-gold)",
                    color: "var(--gold-foreground)",
                  }}
                >
                  K
                </div>
                <div className="leading-tight">
                  <div className="font-display text-lg font-bold tracking-widest text-foreground">
                    KAYAD
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                    Where Kenya Drives
                  </div>
                </div>
              </Link>

              <p className="mt-5 max-w-xs text-sm leading-relaxed text-muted-foreground">
                East Africa's most sophisticated automotive marketplace.
                Live auctions, verified dealers, M-Pesa secured escrow.
                Built for Kenya. Trusted by thousands.
              </p>

              <div className="mt-6 space-y-2.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gold/60" />
                  Nairobi, Kenya
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-gold/60" />
                  hello@kayad.co.ke
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-6 flex flex-wrap gap-2">
                {["KRA Verified", "M-Pesa", "Secure Escrow"].map((t) => (
                  <span
                    key={t}
                    className="label-pill label-pill-gold text-[9px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {Object.entries(LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                  {title}
                </h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link
                        to={to}
                        className="transition hover:text-foreground hover:underline underline-offset-4 decoration-gold/40"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <span>
              © {new Date().getFullYear()} KAYAD Limited. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <Link to="/" className="hover:text-foreground transition">Privacy</Link>
              <Link to="/" className="hover:text-foreground transition">Terms</Link>
              <span className="flex items-center gap-1.5">
                Made for Kenya 🇰🇪
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
