import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import usePageMeta from "../hooks/usePageMeta";

export default function RegisterPage() {
  usePageMeta("Join Free", "Create your Kayad account in seconds.");
  const { register, isAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [wantToSell, setWantToSell] = useState(params.get("sell") === "1");
  const [sellerType, setSellerType] = useState(params.get("role") === "individual_seller" ? "individual_seller" : "dealer");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (isAuth) navigate("/dashboard", { replace: true });
  }, [isAuth, navigate]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast("Password must be at least 8 characters", "error");
      return;
    }
    setLoading(true);
    try {
      const body = {
        name: form.name,
        email: form.email.toLowerCase().trim(),
        password: form.password,
        phone: form.phone.trim(),
        role: wantToSell ? sellerType : "user",
      };
      const refCode = params.get("ref") || "";
      if (refCode) body.referralCode = refCode;

      await register(body);
      toast("Account created! Welcome to Kayad.", "success");
      navigate("/verify-phone", { replace: true });
    } catch (err) {
      toast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
          <h2 style={{ marginBottom: 6 }}>Join Kayad</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Create your account in under a minute</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" type="text" placeholder="John Doe" value={form.name} onChange={(e) => set("name", e.target.value)} required autoComplete="name" />
            </div>

            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} required autoComplete="email" />
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: "relative" }}>
                <input className="input" type={showPwd ? "text" : "password"} placeholder="At least 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} required autoComplete="new-password" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>
                  {showPwd ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Phone (M-Pesa)</label>
              <input className="input" type="tel" placeholder="0712 345 678" value={form.phone} onChange={(e) => set("phone", e.target.value)} required autoComplete="tel" />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", margin: "4px 0" }}>
              <input type="checkbox" checked={wantToSell} onChange={(e) => setWantToSell(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>I also want to sell cars</span>
            </label>

            {wantToSell && (
              <div style={{ marginTop: 12, padding: 12, background: "rgba(212,196,168,0.08)", borderRadius: 8, border: "1px solid rgba(212,196,168,0.15)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Seller Type</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="sellerType" value="dealer" checked={sellerType === "dealer"} onChange={(e) => setSellerType(e.target.value)} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>Registered Dealer</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Business with multiple vehicles, verified dealer benefits</div>
                    </div>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="radio" name="sellerType" value="individual_seller" checked={sellerType === "individual_seller"} onChange={(e) => setSellerType(e.target.value)} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>Private Seller</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Individual selling personal vehicle, escrow protection included</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Creating account...</> : "Create Account"}
            </button>
          </form>

          <div className="gold-line" style={{ margin: "16px 0" }} />

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--gold)", fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
