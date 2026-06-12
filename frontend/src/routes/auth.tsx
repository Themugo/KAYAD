import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const authSearchSchema = z.object({ tab: z.enum(["signin", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({ meta: [{ title: "Sign In or Join — KAYAD" }, { name: "description", content: "Sign in or create your KAYAD account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [active, setActive] = useState<"signin" | "signup">(tab ?? "signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md text-[oklch(0.15_0.005_60)] font-display text-3xl font-bold shadow-[var(--shadow-gold)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>K</div>
          <h1 className="font-display text-3xl font-bold text-foreground">Welcome to <em className="italic text-gold">KAYAD</em></h1>
          <p className="mt-2 text-sm text-muted-foreground">Where Kenya drives.</p>
        </div>

        <Card className="w-full bg-surface border-border/60">
          <CardContent className="p-6">
            <Tabs value={active} onValueChange={(v) => setActive(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-6"><SignInForm /></TabsContent>
              <TabsContent value="signup" className="mt-6"><SignUpForm /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground">
          Want dealer verification? <Link to="/dealer-application" className="text-gold hover:underline">Apply as a verified dealer</Link>
        </p>
      </div>
    </PageShell>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="si-pw">Password</Label>
        <Input id="si-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-full hover:opacity-90 text-[oklch(0.15_0.005_60)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).max(128),
  accountType: z.enum(["buyer", "seller", "dealer"]),
});

function SignUpForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", accountType: "buyer" as "buyer" | "seller" | "dealer" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your inputs"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: form.fullName, phone: form.phone, account_type: form.accountType },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Welcome to KAYAD.");
    if (form.accountType === "dealer") navigate({ to: "/dealer-application" });
    else navigate({ to: "/dashboard" });
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <Label>I am a...</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(["buyer", "seller", "dealer"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setForm({ ...form, accountType: t })}
              className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                form.accountType === t ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-gold/50"}`}>
              {t}
            </button>
          ))}
        </div>
        {form.accountType === "dealer" && (
          <p className="mt-2 text-xs text-muted-foreground">After sign-up you'll complete the dealer verification form (license number, business documents).</p>
        )}
      </div>
      <div>
        <Label htmlFor="su-name">Full name</Label>
        <Input id="su-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="su-email">Email</Label>
          <Input id="su-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="su-phone">Phone</Label>
          <Input id="su-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254..." />
        </div>
      </div>
      <div>
        <Label htmlFor="su-pw">Password</Label>
        <Input id="su-pw" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" />
      </div>
      <Button type="submit" disabled={loading} className="w-full hover:opacity-90 text-[oklch(0.15_0.005_60)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>
        {loading ? "Creating..." : "Create Account"}
      </Button>
    </form>
  );
}
