import { useState } from "react";
import { Link } from "react-router-dom";
import {
  EnterpriseCard, EnterpriseKPI, EnterpriseTimeline,
  EnterpriseChart, EnterpriseQuickActions, EnterpriseTable, EnterpriseBadge,
  EnterpriseMetricRow, DashboardHeader, EnterpriseTabs, EnterpriseProgress,
  EnterpriseNotifications, EnterpriseTokens
} from "../components/enterprise/EnterpriseDashboard";

const MOCK_STATS = {
  openTickets: 23,
  resolvedToday: 8,
  avgResponseTime: 12,
  satisfaction: 94,
};

const TICKETS_TREND = [
  { label: "Mon", value: 12 },
  { label: "Tue", value: 18 },
  { label: "Wed", value: 15 },
  { label: "Thu", value: 22 },
  { label: "Fri", value: 19 },
  { label: "Sat", value: 8 },
  { label: "Sun", value: 6 },
];

const OPEN_TICKETS = [
  { id: "#1029", subject: "Escrow payment not received", user: "James M.", priority: "High", status: "Open", time: "5m ago" },
  { id: "#1028", subject: "Vehicle listing issue", user: "Sarah O.", priority: "Medium", status: "Open", time: "1h ago" },
  { id: "#1027", subject: "Dealer verification request", user: "David K.", priority: "Medium", status: "Open", time: "2h ago" },
  { id: "#1026", subject: "Inspection report query", user: "John W.", priority: "Low", status: "Open", time: "3h ago" },
];

const ACTIONS = [
  { icon: "🎫", label: "New Ticket", desc: "Create support ticket", to: "/support/new" },
  { icon: "📋", label: "All Tickets", desc: "View all tickets", to: "/support/tickets" },
  { icon: "📊", label: "Reports", desc: "View analytics", to: "/support/reports" },
  { icon: "⚙️", label: "Settings", desc: "Configure", to: "/support/settings" },
];

export default function SupportDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const stats = MOCK_STATS;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "tickets", label: "Tickets", icon: "🎫", count: stats.openTickets },
  ];

  return (
    <div style={{ background: EnterpriseTokens.bg, minHeight: "100vh" }}>
      <DashboardHeader
        badge="Support Agent"
        greeting="Support Dashboard"
        subtitle={stats.openTickets + " open tickets"}
        actions={
          <Link to="/support/new" style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: EnterpriseTokens.goldBg,
            border: "1px solid " + EnterpriseTokens.goldBorder,
            color: EnterpriseTokens.gold,
            fontSize: 11,
            fontWeight: 700,
            textDecoration: "none",
          }}>
            + New Ticket
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px" }}>
        <EnterpriseTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI icon="🎫" label="Open Tickets" value={stats.openTickets} accent={EnterpriseTokens.warning} />
              <EnterpriseKPI icon="✅" label="Resolved Today" value={stats.resolvedToday} trend={15} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="⏱️" label="Avg Response" value={stats.avgResponseTime + "m"} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="⭐" label="Satisfaction" value={stats.satisfaction + "%"} accent={EnterpriseTokens.gold} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Ticket Volume Trend" icon="📈">
                <EnterpriseChart data={TICKETS_TREND} height={160} showLabels color={EnterpriseTokens.warning} />
              </EnterpriseCard>

              <EnterpriseCard header="Open Tickets" icon="🎫">
                <div>
                  {OPEN_TICKETS.slice(0, 3).map((t, i) => (
                    <div key={i} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom: i < 2 ? "1px solid " + EnterpriseTokens.border : "none",
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#fff" }}>{t.subject}</div>
                        <div style={{ fontSize: 11, color: EnterpriseTokens.textMuted }}>{t.id} - {t.time}</div>
                      </div>
                      <EnterpriseBadge label={t.priority} color={t.priority === "High" ? EnterpriseTokens.danger : EnterpriseTokens.warning} />
                    </div>
                  ))}
                </div>
              </EnterpriseCard>
            </div>

            <EnterpriseCard header="Quick Actions" icon="⚡">
              <EnterpriseQuickActions actions={ACTIONS} cols={4} />
            </EnterpriseCard>
          </>
        )}

        {activeTab === "tickets" && (
          <EnterpriseCard header="All Tickets" icon="🎫">
            <div>
              {OPEN_TICKETS.map((t, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: 16,
                  padding: 16,
                  background: EnterpriseTokens.surface,
                  borderRadius: 12,
                  marginBottom: 12,
                  border: "1px solid " + EnterpriseTokens.border,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>{t.subject}</div>
                    <div style={{ fontSize: 12, color: EnterpriseTokens.textMuted }}>{t.user} - {t.time}</div>
                  </div>
                  <EnterpriseBadge label={t.priority} color={t.priority === "High" ? EnterpriseTokens.danger : EnterpriseTokens.warning} />
                </div>
              ))}
            </div>
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
