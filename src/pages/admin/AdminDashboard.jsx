import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { adminAPI } from "../../api/api";
import {
  EnterpriseCard, EnterpriseKPI, EnterpriseTable,
  EnterpriseMetricRow, DashboardHeader, EnterpriseTabs, EnterpriseQuickActions,
  EnterpriseTokens
} from "../../components/enterprise/EnterpriseDashboard";

const PLATFORM_QUICK_ACTIONS = [
  { icon: "👥", label: "Manage Dealers", desc: "Open dealer records", to: "/admin/sellers" },
  { icon: "🚗", label: "Moderate Listings", desc: "Review vehicle records", to: "/admin/cars" },
  { icon: "💰", label: "Escrow Overview", desc: "Review escrow records", to: "/admin/escrows" },
  { icon: "🔍", label: "Inspection Queue", desc: "Open inspection records", to: "/admin/inspections" },
  { icon: "🎫", label: "Support Tickets", desc: "Review support queue", to: "/admin/support" },
  { icon: "📊", label: "Analytics", desc: "Open existing reports", to: "/admin/reports" },
];

const TABLE_COLUMNS = [
  { key: "name", label: "Dealer" },
  { key: "email", label: "Email" },
  { key: "status", label: "Account Status" },
];

const formatCount = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString();
};

const formatKes = (value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
  return `KES ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [unavailableMetrics, setUnavailableMetrics] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [dealersLoading, setDealersLoading] = useState(true);
  const [dealersUnavailable, setDealersUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    adminAPI.stats()
      .then((response) => {
        if (!active) return;
        const nextStats = response?.stats;
        if (!nextStats || typeof nextStats !== "object") {
          setStatsError(true);
          return;
        }
        setStats(nextStats);
        setUnavailableMetrics(Array.isArray(response.unavailable) ? response.unavailable : []);
      })
      .catch(() => {
        if (!active) return;
        setStatsError(true);
        toast("Dashboard statistics are currently unavailable", "error");
      })
      .finally(() => {
        if (active) setStatsLoading(false);
      });

    adminAPI.users({ role: "dealer", page: 1, limit: 5 })
      .then((response) => {
        if (!active) return;
        if (!Array.isArray(response?.users)) {
          setDealersUnavailable(true);
          return;
        }
        setDealers(response.users);
      })
      .catch(() => {
        if (active) setDealersUnavailable(true);
      })
      .finally(() => {
        if (active) setDealersLoading(false);
      });

    return () => { active = false; };
  }, [toast]);

  const metric = (key, formatter = formatCount) => {
    if (statsLoading) return "Loading…";
    if (statsError || unavailableMetrics.includes(key) || stats?.[key] === null || stats?.[key] === undefined) {
      return "Unavailable";
    }
    return formatter(stats[key]);
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "dealers", label: "Dealers", count: stats?.totalDealers ?? undefined },
    { id: "listings", label: "Listings", count: stats?.activeListings ?? undefined },
    { id: "finances", label: "Finances" },
  ];

  const dealerRows = dealers.map((dealer) => ({
    name: dealer.name || dealer.businessName || "Unnamed dealer",
    email: dealer.email || "—",
    status: dealer.status || (dealer.isBanned ? "Banned" : "Unknown"),
  }));

  const revenueValue = statsLoading ? "Loading…" : metric("totalRevenue", formatKes);

  return (
    <div style={{ background: EnterpriseTokens.bg, minHeight: "100vh" }}>
      <DashboardHeader
        badge="Platform Owner"
        greeting="Platform Overview"
        subtitle={
          statsLoading
            ? "Loading verified platform statistics…"
            : statsError
              ? "Platform statistics could not be loaded."
              : `${metric("totalUsers")} users · ${metric("totalDealers")} dealers · ${metric("totalCars")} vehicles`
        }
        actions={
          <Link to="/admin/settings" style={{
            padding: "8px 16px",
            borderRadius: 10,
            background: EnterpriseTokens.infoBg,
            border: "1px solid " + EnterpriseTokens.infoBorder,
            color: EnterpriseTokens.info,
            fontSize: 11,
            fontWeight: 700,
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            ⚙ Settings
          </Link>
        }
      />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 28px" }}>
        <EnterpriseTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "overview" && (
          <>
            {statsError && (
              <div role="alert" style={{
                marginBottom: 20, padding: 14, borderRadius: 10,
                border: `1px solid ${EnterpriseTokens.warning}`,
                color: EnterpriseTokens.textPrimary, background: EnterpriseTokens.surface,
              }}>
                Dashboard statistics could not be verified. Values are shown as unavailable rather than replaced with zero.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
              <EnterpriseKPI icon="👥" label="Total Users" value={metric("totalUsers")} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="🏪" label="Dealers" value={metric("totalDealers")} accent={EnterpriseTokens.purple} />
              <EnterpriseKPI icon="🚗" label="Total Vehicles" value={metric("totalCars")} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="✅" label="Active Listings" value={metric("activeListings")} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="🔒" label="Open Escrows" value={metric("openEscrows")} accent={EnterpriseTokens.warning} />
              <EnterpriseKPI icon="🎫" label="Open Tickets" value={metric("supportQueue")} accent={EnterpriseTokens.danger} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <EnterpriseCard header="Recorded Commission Revenue" icon="💰">
                <EnterpriseKPI
                  icon="💎"
                  label="All-time recorded total"
                  value={revenueValue}
                  sub={statsLoading ? "Loading verified statistics" : stats?.totalRevenue == null ? "Revenue data unavailable" : "Based on released escrow commission records"}
                  accent={EnterpriseTokens.info}
                />
              </EnterpriseCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)", gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Verified Platform Counts" icon="📊">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                  <EnterpriseMetricRow icon="🏷️" label="Pending Dealers" value={metric("pendingDealers")} color={EnterpriseTokens.warning} />
                  <EnterpriseMetricRow icon="🚘" label="Pending Vehicles" value={metric("pendingCars")} color={EnterpriseTokens.warning} />
                  <EnterpriseMetricRow icon="🔨" label="Live Auctions" value={metric("activeAuctions")} color={EnterpriseTokens.info} />
                  <EnterpriseMetricRow icon="🛡️" label="Disputed Escrows" value={metric("alerts")} color={EnterpriseTokens.danger} />
                </div>
              </EnterpriseCard>
              <EnterpriseCard header="System Health" icon="💚">
                <p style={{ margin: 0, color: EnterpriseTokens.textMuted, fontSize: 13, lineHeight: 1.6 }}>
                  Live infrastructure health is not inferred from marketplace statistics. Open the existing operations control room to review verified service indicators.
                </p>
                <Link to="/admin/control-room" style={{
                  display: "inline-flex", marginTop: 16, textDecoration: "none",
                  color: EnterpriseTokens.info, fontWeight: 700, fontSize: 13,
                }}>Open Operations Control Room →</Link>
              </EnterpriseCard>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20, marginBottom: 24 }}>
              <EnterpriseCard header="Recent Dealer Records" icon="👥" action={{ label: "View All", to: "/admin/sellers" }}>
                {dealersLoading ? (
                  <p style={{ color: EnterpriseTokens.textMuted }}>Loading dealer records…</p>
                ) : dealersUnavailable ? (
                  <p role="status" style={{ color: EnterpriseTokens.textMuted }}>Dealer records are currently unavailable.</p>
                ) : dealerRows.length === 0 ? (
                  <p style={{ color: EnterpriseTokens.textMuted }}>No dealer records were returned.</p>
                ) : (
                  <EnterpriseTable columns={TABLE_COLUMNS} data={dealerRows} />
                )}
              </EnterpriseCard>

              <EnterpriseCard header="Quick Actions" icon="⚡">
                <EnterpriseQuickActions actions={PLATFORM_QUICK_ACTIONS} cols={2} />
              </EnterpriseCard>
            </div>
          </>
        )}

        {activeTab === "dealers" && (
          <EnterpriseCard header="Dealer Records" icon="👥" action={{ label: "Manage Dealers", to: "/admin/sellers" }}>
            {dealersLoading ? (
              <p style={{ color: EnterpriseTokens.textMuted }}>Loading dealer records…</p>
            ) : dealersUnavailable ? (
              <p role="status" style={{ color: EnterpriseTokens.textMuted }}>Dealer records are currently unavailable.</p>
            ) : dealerRows.length === 0 ? (
              <p style={{ color: EnterpriseTokens.textMuted }}>No dealer records were returned.</p>
            ) : (
              <EnterpriseTable columns={TABLE_COLUMNS} data={dealerRows} />
            )}
          </EnterpriseCard>
        )}

        {activeTab === "listings" && (
          <EnterpriseCard header="Listings Overview" icon="🚗" action={{ label: "Review Listings", to: "/admin/cars" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 20 }}>
              <EnterpriseMetricRow icon="📊" label="Total Vehicles" value={metric("totalCars")} color={EnterpriseTokens.info} />
              <EnterpriseMetricRow icon="✅" label="Active Listings" value={metric("activeListings")} color={EnterpriseTokens.success} />
              <EnterpriseMetricRow icon="⏳" label="Pending Review" value={metric("pendingCars")} color={EnterpriseTokens.warning} />
              <EnterpriseMetricRow icon="🏁" label="Sold Vehicles" value={metric("carsSold")} color={EnterpriseTokens.textMuted} />
            </div>
          </EnterpriseCard>
        )}

        {activeTab === "finances" && (
          <EnterpriseCard header="Financial Overview" icon="💰">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 20 }}>
              <EnterpriseKPI icon="💎" label="Recorded Commission Revenue" value={metric("totalRevenue", formatKes)} accent={EnterpriseTokens.info} />
              <EnterpriseKPI icon="📊" label="Successful Payments (count)" value={metric("totalPayments")} accent={EnterpriseTokens.success} />
              <EnterpriseKPI icon="🔒" label="Total Escrow Records" value={metric("totalEscrows")} accent={EnterpriseTokens.purple} />
            </div>
            <p style={{ marginTop: 18, color: EnterpriseTokens.textMuted, fontSize: 12, lineHeight: 1.6 }}>
              Monthly averages and historical trends are not shown because the current dashboard statistics contract does not provide verified time-series data.
            </p>
          </EnterpriseCard>
        )}
      </div>
    </div>
  );
}
