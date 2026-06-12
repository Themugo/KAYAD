import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/gallery", label: "Gallery" },
  { to: "/auctions", label: "Auctions" },
  { to: "/ghost-check", label: "Ghost Check" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/about", label: "About" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setEmail(data.session?.user.email ?? null)
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setEmail(s?.user.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/50 bg-background/90 backdrop-blur-xl shadow-[0_1px_0_0_oklch(0.80_0.11_82/0.06)]"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      {/* Gold top shimmer line */}
      <div
        className="absolute top-0 inset-x-0 h-[1.5px] pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, oklch(0.80 0.11 82 / 0.55) 40%, oklch(0.84 0.12 83 / 0.9) 50%, oklch(0.80 0.11 82 / 0.55) 60%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg font-display text-xl font-bold transition-shadow duration-300 group-hover:shadow-[var(--shadow-gold)]"
            style={{
              backgroundImage: "var(--gradient-gold)",
              color: "var(--gold-foreground)",
            }}
          >
            K
          </div>
          <div className="leading-[1.15]">
            <div className="font-display text-[1.15rem] font-bold tracking-widest text-foreground">
              KAYAD
            </div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
              Where Kenya Drives
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="relative px-3.5 py-2 text-[13px] font-medium text-foreground/70 transition-colors hover:text-gold rounded-md hover:bg-surface"
              activeProps={{ className: "text-gold bg-surface/60" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
              {n.to === "/auctions" && (
                <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-live animate-pulse" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2.5 lg:flex">
          {email ? (
            <>
              <Link
                to="/dashboard"
                className="max-w-[160px] truncate text-xs text-muted-foreground transition hover:text-gold"
              >
                {email}
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="border-border/60 text-xs"
                onClick={async () => supabase.auth.signOut()}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-foreground/80 hover:text-foreground"
                >
                  Sign In
                </Button>
              </Link>
              <Link to="/auth" search={{ tab: "signup" } as never}>
                <Button
                  size="sm"
                  className="text-xs font-semibold tracking-wide"
                  style={{
                    backgroundImage: "var(--gradient-gold)",
                    color: "var(--gold-foreground)",
                  }}
                >
                  Join Free
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition hover:bg-surface lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border/40 bg-surface/98 backdrop-blur-xl lg:hidden animate-fade-in">
          <div className="flex flex-col px-4 py-3 gap-0.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-foreground/75 transition hover:bg-surface-2 hover:text-gold"
                activeProps={{ className: "bg-surface-2 text-gold" }}
              >
                <span>{n.label}</span>
                {n.to === "/auctions" && (
                  <span className="label-pill label-pill-live">
                    <span className="dot-live" /> Live
                  </span>
                )}
              </Link>
            ))}
            <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
              <Link
                to="/auth"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Sign In
                </Button>
              </Link>
              <Link
                to="/auth"
                search={{ tab: "signup" } as never}
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                <Button
                  size="sm"
                  className="w-full text-xs"
                  style={{
                    backgroundImage: "var(--gradient-gold)",
                    color: "var(--gold-foreground)",
                  }}
                >
                  Join Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
