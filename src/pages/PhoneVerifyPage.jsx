import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authAPI } from "../api/api";
import usePageMeta from "../hooks/usePageMeta";

export default function PhoneVerifyPage() {
  usePageMeta("Verify Phone", "Verify your phone number to get started.");
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef([]);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!sentRef.current) {
      handleSendOTP();
      sentRef.current = true;
    }
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendOTP = async () => {
    setSending(true);
    try {
      await authAPI.sendOTP();
      setCooldown(30);
    } catch {
      toast("Failed to send code. Try again.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleInput = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 3) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
      toast("Enter the full 4-digit code", "error");
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyPhone(code);
      toast("Phone verified!", "success");
      if (user?.role === "dealer") {
        navigate("/dealer/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      toast(err.response?.data?.message || "Verification failed", "error");
      setOtp(["", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user?.role === "dealer") {
      navigate("/dealer/onboarding", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  return (
    <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <h2 style={{ marginBottom: 6 }}>Verify Your Phone</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            We sent a code to <strong>{user?.phone || "your phone"}</strong>
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 24 }}>
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 52,
                  height: 58,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: 700,
                  borderRadius: 10,
                  border: `2px solid ${d ? "var(--gold)" : "rgba(255,255,255,0.1)"}`,
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            ))}
          </div>

          <button className="btn btn-gold btn-full btn-lg" onClick={handleVerify} disabled={loading || otp.join("").length !== 4}>
            {loading ? "Verifying..." : "Verify Phone"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            {cooldown > 0 ? (
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Resend in {cooldown}s</span>
            ) : (
              <button onClick={handleSendOTP} disabled={sending} style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                {sending ? "Sending..." : "Resend code"}
              </button>
            )}
          </div>

          {user?.role !== "dealer" && (
            <div style={{ textAlign: "center", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <button onClick={handleSkip} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
                Skip — I'll verify later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
