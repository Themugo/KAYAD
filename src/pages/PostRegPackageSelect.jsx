import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { adminAPI, authAPI } from "../api/api";

const DEFAULT_PKG = [
  { id: "starter", name: "Starter", priceMonthly: 0, listingMax: 3, isFree: true, description: "Free to start — 3 listings", badge: "Start Free" },
  { id: "growth", name: "Growth", priceMonthly: 6500, listingMax: 30, isFree: false, description: "Grow your online presence", badge: "Popular" },
  { id: "elite", name: "Elite", priceMonthly: 14000, listingMax: 100, isFree: false, description: "For established dealers", badge: "" },
  { id: "enterprise", name: "Enterprise", priceMonthly: 0, listingMax: 0, isFree: false, description: "Custom enterprise plan", badge: "" },
];

export default function PostRegPackageSelect() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [packages, setPackages] = useState(DEFAULT_PKG);
  const [selected, setSelected] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.getConfig().then(({ config: c }) => {
      if (c?.packages) {
        const dealerPkgs = c.packages.filter((p) => p.isActive && (p.forRole === "dealer" || p.forRole === "both"));
        if (dealerPkgs.length > 0) setPackages(dealerPkgs);
      }
    }).catch(() => {});
  }, []);

  const handleContinue = async () => {
    if (!selected) {
      toast("Select a plan to continue", "error");
      return;
    }
    setSaving(true);
    try {
      const pkg = packages.find((p) => p.id === selected);
      const { user: updated } = await authAPI.updateProfile({
        dealerPackage: selected,
      });
      if (updated) setUser(updated);
      toast(`Plan selected: ${pkg?.name}`, "success");
      navigate("/dealer/cars/new", { replace: true });
    } catch {
      toast("Failed to save selection", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSelected("starter");
    toast("Started with Starter plan — upgrade anytime", "info");
    navigate("/dealer/cars/new", { replace: true });
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 800, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ marginBottom: 6 }}>Choose Your Plan</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Pick a listing plan to start selling. Upgrade anytime.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${packages.length}, 1fr)`, gap: 14, marginBottom: 28 }}>
          {packages.map((pkg) => {
            const sel = selected === pkg.id;
            const color = pkg.id.includes("elite") ? "var(--gold)"
              : pkg.id.includes("enterprise") ? "#a855f7"
                : pkg.id.includes("growth") ? "#3b82f6"
                  : "rgba(255,255,255,0.5)";
            return (
              <div key={pkg.id} onClick={() => setSelected(pkg.id)}
                style={{
                  background: "#0C0C0C", border: `2px solid ${sel ? color : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16, padding: "22px 20px", cursor: "pointer", transition: "all 0.2s",
                  position: "relative", boxShadow: sel ? `0 8px 32px ${color}20` : "none",
                }}
              >
                {pkg.badge && (
                  <div style={{
                    position: "absolute", top: -8, right: 12,
                    background: color, color: "#000", fontSize: 9, fontWeight: 800,
                    padding: "3px 10px", borderRadius: 9999, letterSpacing: "0.05em",
                  }}>{pkg.badge}</div>
                )}
                <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>{pkg.name}</h3>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                  {pkg.priceMonthly === 0 ? <span style={{ color }}>Free</span>
                    : <span>KES {pkg.priceMonthly.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400, color: "var(--text-muted)" }}>/mo</span></span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>{pkg.description}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  {pkg.listingMax === 0 ? "Unlimited listings" : `Up to ${pkg.listingMax} listings`}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={handleSkip}>Skip — use Starter</button>
          <button className="btn btn-gold btn-lg" onClick={handleContinue} disabled={saving || !selected}>
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
