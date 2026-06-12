import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageShell, PageHero } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dealer-application")({
  head: () => ({ meta: [{ title: "Dealer Verification — KAYAD" }, { name: "description", content: "Apply to become a verified KAYAD dealer." }] }),
  component: DealerApplication,
});

const schema = z.object({
  business_name: z.string().trim().min(2).max(120),
  business_type: z.string().min(1),
  license_number: z.string().trim().min(3).max(40),
  kra_pin: z.string().trim().max(40).optional().or(z.literal("")),
  physical_address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(60),
  contact_phone: z.string().trim().min(7).max(20),
  contact_email: z.string().trim().email().max(255),
  years_in_business: z.coerce.number().int().min(0).max(100),
});

function DealerApplication() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ status: string; business_name: string } | null>(null);
  const [form, setForm] = useState({
    business_name: "", business_type: "Dealership", license_number: "", kra_pin: "",
    physical_address: "", city: "Nairobi", contact_phone: "", contact_email: "", years_in_business: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please sign in first"); navigate({ to: "/auth", search: { tab: "signup" } }); return; }
      setUserId(session.user.id);
      setForm((f) => ({ ...f, contact_email: session.user.email ?? "" }));
      const { data } = await supabase.from("dealer_applications").select("status, business_name").eq("user_id", session.user.id).maybeSingle();
      if (data) setExisting(data as { status: string; business_name: string });
    })();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Check your inputs"); return; }
    setLoading(true);
    const { error } = await supabase.from("dealer_applications").insert({ user_id: userId, ...parsed.data });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted! We'll review within 1–2 business days.");
    navigate({ to: "/dashboard" });
  }

  if (existing) {
    return (
      <PageShell>
        <PageHero eyebrow="Dealer Status" title="Application Submitted" subtitle="Your dealer application is on file." />
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Card className="border-gold/30 bg-surface">
            <CardContent className="p-6">
              <p className="text-foreground"><span className="font-semibold">{existing.business_name}</span></p>
              <p className="mt-2 text-sm text-muted-foreground">Status: <span className="font-semibold capitalize text-gold">{existing.status}</span></p>
              <Link to="/dashboard"><Button className="mt-6 text-[oklch(0.15_0.005_60)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>Go to Dashboard</Button></Link>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero eyebrow="Become a Verified Dealer" title="Dealer Verification" subtitle="Submit your business details and licensing. KAYAD reviews every dealer manually within 1–2 business days." />
      <div className="mx-auto max-w-2xl px-4 py-12 lg:px-8">
        <Card className="border-border/60 bg-surface">
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <Field label="Business name" v={form.business_name} on={(v) => setForm({ ...form, business_name: v })} required />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Business type</Label>
                  <select className="mt-1 w-full rounded-md border border-input bg-input px-3 py-2 text-sm"
                    value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
                    <option>Dealership</option><option>Broker</option><option>Showroom</option><option>Import Agency</option>
                  </select>
                </div>
                <Field label="Years in business" v={String(form.years_in_business)} on={(v) => setForm({ ...form, years_in_business: Number(v) || 0 })} type="number" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="License number" v={form.license_number} on={(v) => setForm({ ...form, license_number: v })} required />
                <Field label="KRA PIN (optional)" v={form.kra_pin} on={(v) => setForm({ ...form, kra_pin: v })} />
              </div>
              <Field label="Physical address" v={form.physical_address} on={(v) => setForm({ ...form, physical_address: v })} required />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="City" v={form.city} on={(v) => setForm({ ...form, city: v })} required />
                <Field label="Contact phone" v={form.contact_phone} on={(v) => setForm({ ...form, contact_phone: v })} required placeholder="+254..." />
              </div>
              <Field label="Contact email" v={form.contact_email} on={(v) => setForm({ ...form, contact_email: v })} type="email" required />

              <div className="rounded-md border border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                After submission, our verification team will contact you to upload supporting documents (business license, ID, KRA certificate).
              </div>

              <Button type="submit" disabled={loading} className="w-full hover:opacity-90 text-[oklch(0.15_0.005_60)]" style={{ backgroundImage: "linear-gradient(135deg, oklch(0.85 0.11 85), oklch(0.72 0.13 70))" }}>
                {loading ? "Submitting..." : "Submit for Verification"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function Field({ label, v, on, type = "text", required, placeholder }: { label: string; v: string; on: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} required={required} placeholder={placeholder} />
    </div>
  );
}
