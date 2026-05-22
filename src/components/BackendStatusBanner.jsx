import { useState, useEffect, useCallback } from "react";
import axios from "axios";

export default function BackendStatusBanner() {
  const [status, setStatus] = useState("checking");
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    try {
      const { data } = await axios.get("/health", { timeout: 5000 });
      setStatus(data?.status === "ok" ? "ok" : "degraded");
    } catch {
      setStatus("down");
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  if (status === "ok" || dismissed) return null;

  const isDegraded = status === "degraded";

  return (
    <div
      style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "inline-flex", alignItems: "center", gap: 8,
        background: isDegraded
          ? "rgba(180,130,30,0.92)"
          : "rgba(200,40,40,0.92)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${isDegraded ? "rgba(255,200,50,0.3)" : "rgba(255,80,80,0.3)"}`,
        borderRadius: 9999,
        padding: "7px 12px 7px 14px",
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        fontFamily: "var(--font-body, sans-serif)",
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: isDegraded ? "#ffcc00" : "#ff4444",
          boxShadow: `0 0 8px ${isDegraded ? "rgba(255,200,0,0.7)" : "rgba(255,50,50,0.7)"}`,
        }}
      />
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>
        {isDegraded ? "Degraded" : "Backend Down"}
      </span>
      <button
        type="button"
        onClick={() => { check(); setDismissed(true); }}
        style={{
          background: "rgba(255,255,255,0.15)", border: "none", cursor: "pointer",
          color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 9999,
        }}
      >
        Retry
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1,
          padding: "0 0 0 4px", marginLeft: 2,
        }}
      >
        ×
      </button>
    </div>
  );
}
