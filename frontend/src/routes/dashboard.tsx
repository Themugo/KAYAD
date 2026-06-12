import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — KAYAD" }] }),
  component: Dashboard,
});

type Profile = { full_name: string | null; phone: string | null; account_type: "buyer" | "seller" | "dealer" };
type DealerApp = { status: "pending" | "approved" | "rejected"; business_name: string };

function Dashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dealer, setDealer] = useState<DealerApp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/auth" }); return; }
      setEmail(session.user.email ?? null);
      const { data: p } = await supabase.from("profiles").select("full_name, phone, account_type").eq("id", session.user.id).maybeSingle();
      setProfile(p as Profile | null);
      const { data: d } = await supabase.from("dealer_applications").select("status, business_name").eq("user_id", session.user.id).maybeSingle();
      setDealer(d as DealerApp | null);
      setLoading(false);
    })();
  }, [navigate]);

  async function logout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  if (loading) return <PageShell><div className="mx-auto max-w-4xl p-12 text-muted-foreground">Loading...</div></PageShell>;

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-12 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-wider text-gold">Welcome back</p>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">{profile?.full_name || email}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Account type: <span className="font-semibold capitalize text-foreground">{profile?.account_type}</span></p>
          </div>
          <Button variant="outline" onClick={logout}>Sign Out</Button>
        </div>

        {profile?.account_type === "dealer" && (
          <Card className="mb-6 border-gold/40 bg-surface">
            <CardHeader><CardTitle>Dealer Verification</CardTitle></CardHeader>
            <CardContent>
              {dealer ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{dealer.business_name}</p>
                    <p className="text-sm text-muted-foreground">Status: <StatusBadge status={dealer.status} /></p>
                  </div>
                  {dealer.status === "pending" && <p className="text-sm text-muted-foreground">Under review (usually 1–2 business days)</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Complete your dealer verification to start listing inventory.</p>
                  <Link to="/dealer-application"><Button className="text-[oklch(0.15_0.005_60)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>Apply now</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <QuickCard to="/gallery" title="Browse Gallery" body="See all available cars" />
          <QuickCard to="/auctions" title="Live Auctions" body="Bid in real-time" />
          <QuickCard to="/ghost-check" title="Ghost Check" body="Vehicle history reports" />
        </div>
      </div>
    </PageShell>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const cls = status === "approved" ? "text-green-400" : status === "rejected" ? "text-destructive" : "text-gold";
  return <span className={`font-semibold capitalize ${cls}`}>{status}</span>;
}

function QuickCard({ to, title, body }: { to: string; title: string; body: string }) {
  return (
    <Link to={to}>
      <Card className="h-full border-border/60 bg-surface transition hover:border-gold/60">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
