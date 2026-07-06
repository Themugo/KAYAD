import { useState, useEffect, useCallback } from "react";
import { adminAPI } from "../../api/api";

const CATEGORIES = [
  { key: "self_bidding", label: "Self-Bidding", color: "text-red-600", bg: "bg-red-50", icon: "👤" },
  { key: "related_account", label: "Related Accounts", color: "text-orange-600", bg: "bg-orange-50", icon: "🔗" },
  { key: "bid_inflation", label: "Bid Inflation", color: "text-yellow-600", bg: "bg-yellow-50", icon: "📈" },
  { key: "bid_velocity", label: "Bid Velocity", color: "text-purple-600", bg: "bg-purple-50", icon: "⚡" },
  { key: "last_second_manipulation", label: "Last-Second", color: "text-blue-600", bg: "bg-blue-50", icon: "⏰" },
];

const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["detected", "under_review", "confirmed", "dismissed", "action_taken"];
const ACTIONS = ["none", "warning", "bid_removed", "auction_cancelled", "user_suspended", "user_banned", "referral_frozen"];

const sevColor = (s) =>
  ({ critical: "text-red-600 bg-red-100", high: "text-orange-600 bg-orange-100", medium: "text-yellow-600 bg-yellow-100", low: "text-green-600 bg-green-100" })[s] || "text-gray-600 bg-gray-100";

const statusBadge = (s) =>
  ({ detected: "badge badge-warning", under_review: "badge badge-info", confirmed: "badge badge-error", dismissed: "badge", action_taken: "badge badge-success" })[s] || "badge";

export default function AuctionIntegrityPage() {
  const [dashboard, setDashboard] = useState(null);
  const [flags, setFlags] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flagLoading, setFlagLoading] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [tab, setTab] = useState("flags");

  const [filters, setFilters] = useState({ category: "", severity: "", status: "", page: 1 });
  const [profileFilters, setProfileFilters] = useState({ role: "", tier: "", page: 1 });

  const [scanModal, setScanModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await adminAPI.integrityDashboard();
      setDashboard(data);
    } catch {
      console.error("Failed to load integrity dashboard");
    }
  }, []);

  const loadFlags = useCallback(async (p = 1) => {
    setFlagLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (filters.category) params.category = filters.category;
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      const data = await adminAPI.integrityFlags(params);
      setFlags(data.flags);
      setPagination(data.pagination);
    } catch {
      console.error("Failed to load flags");
    } finally {
      setFlagLoading(false);
    }
  }, [filters]);

  const loadProfiles = useCallback(async (p = 1) => {
    try {
      const params = { page: p, limit: 20 };
      if (profileFilters.role) params.role = profileFilters.role;
      if (profileFilters.tier) params.riskTier = profileFilters.tier;
      const data = await adminAPI.integrityRiskProfiles(params);
      setProfiles(data.profiles);
    } catch {
      console.error("Failed to load risk profiles");
    }
  }, [profileFilters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === "flags") loadFlags();
    if (tab === "profiles") loadProfiles();
  }, [tab, loadFlags, loadProfiles]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleProfileFilterChange = (key, value) => {
    setProfileFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleSelectFlag = async (flag) => {
    try {
      const data = await adminAPI.integrityFlag(flag._id);
      setSelectedFlag(data);
    } catch {
      console.error("Failed to load flag detail");
    }
  };

  const handleUpdateStatus = async (flagId, status, actionTaken) => {
    try {
      const body = { status };
      if (actionTaken) body.actionTaken = actionTaken;
      await adminAPI.integrityUpdateFlag(flagId, body);
      setSelectedFlag(null);
      loadFlags(filters.page);
      loadDashboard();
    } catch {
      console.error("Failed to update flag");
    }
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const result = await adminAPI.integrityScan({ scanWindowHours: 24 });
      setScanResult(result);
      loadDashboard();
      loadFlags();
    } catch {
      console.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const formatKES = (n) => {
    if (n == null) return "—";
    return `KES ${Number(n).toLocaleString("en-KE")}`;
  };

  if (!dashboard) {
    return (
      <div className="page-container">
        <div className="loading-center"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Auction Integrity Engine</h1>
          <p className="text-gray-500 text-sm">Detect self-bidding, related accounts, bid inflation, velocity abuse, and last-second manipulation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setScanModal(true)}>Run Integrity Scan</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value text-3xl font-bold">{dashboard.totalFlags}</div>
          <div className="stat-label text-gray-500">Total Flags</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-3xl font-bold text-orange-600">{dashboard.openFlags}</div>
          <div className="stat-label text-gray-500">Open (Detected / Review)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-3xl font-bold text-blue-600">{dashboard.todayCount}</div>
          <div className="stat-label text-gray-500">Flagged Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-3xl font-bold text-purple-600">{dashboard.topRiskProfiles?.length || 0}</div>
          <div className="stat-label text-gray-500">High-Risk Users</div>
        </div>
      </div>

      {/* Category + Severity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="card">
          <h3 className="font-semibold mb-3">By Category</h3>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => {
              const found = dashboard.categoryBreakdown?.find((c) => c._id === cat.key);
              const count = found?.count || 0;
              const maxCount = Math.max(...(dashboard.categoryBreakdown?.map((c) => c.count) || [1]), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={cat.key} className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm w-32">{cat.label}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${cat.color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-mono w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-3">By Severity</h3>
          <div className="space-y-2">
            {SEVERITIES.map((sev) => {
              const found = dashboard.severityBreakdown?.find((s) => s._id === sev);
              const count = found?.count || 0;
              const maxCount = Math.max(...(dashboard.severityBreakdown?.map((s) => s.count) || [1]), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={sev} className="flex items-center gap-2">
                  <span className={`text-sm font-medium w-20 ${sevColor(sev).split(" ")[0]}`}>{sev}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sevColor(sev).split(" ")[1]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-mono w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-4">
        <button className={`tab tab-bordered ${tab === "flags" ? "tab-active" : ""}`} onClick={() => setTab("flags")}>Integrity Flags</button>
        <button className={`tab tab-bordered ${tab === "profiles" ? "tab-active" : ""}`} onClick={() => setTab("profiles")}>Risk Profiles</button>
        <button className={`tab tab-bordered ${tab === "trends" ? "tab-active" : ""}`} onClick={() => setTab("trends")}>7-Day Trend</button>
      </div>

      {/* ─── FLAGS TAB ─── */}
      {tab === "flags" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select className="select select-bordered select-sm" value={filters.category} onChange={(e) => handleFilterChange("category", e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select className="select select-bordered select-sm" value={filters.severity} onChange={(e) => handleFilterChange("severity", e.target.value)}>
              <option value="">All Severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="select select-bordered select-sm" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Flag ID</th>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>User</th>
                  <th>Summary</th>
                  <th>Detected</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {flagLoading ? (
                  <tr><td colSpan={9} className="text-center py-8"><div className="spinner" /></td></tr>
                ) : flags.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No integrity flags found</td></tr>
                ) : (
                  flags.map((f) => (
                    <tr key={f._id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleSelectFlag(f)}>
                      <td className="font-mono text-xs">{f.flagId?.slice(0, 20)}</td>
                      <td>
                        <span className={`text-xs font-medium ${CATEGORIES.find((c) => c.key === f.category)?.color || ""}`}>
                          {CATEGORIES.find((c) => c.key === f.category)?.label || f.category}
                        </span>
                      </td>
                      <td><span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevColor(f.severity)}`}>{f.severity}</span></td>
                      <td className="font-mono">{f.riskScore}</td>
                      <td><span className={statusBadge(f.status)}>{f.status.replace("_", " ")}</span></td>
                      <td className="text-sm">{f.targetUser?.name || f.targetUser?.email || "—"}</td>
                      <td className="text-xs text-gray-500 max-w-xs truncate">{f.summary}</td>
                      <td className="text-xs text-gray-400">{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td>
                        {f.status === "detected" && (
                          <button className="btn btn-xs btn-ghost text-blue-600" onClick={(e) => { e.stopPropagation(); handleSelectFlag(f); }}>Review</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button className="btn btn-sm" disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}>Prev</button>
              <span className="flex items-center text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
              <button className="btn btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}>Next</button>
            </div>
          )}

          {/* Detail Modal */}
          {selectedFlag && (
            <div className="modal modal-open">
              <div className="modal-box max-w-3xl">
                <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => setSelectedFlag(null)}>✕</button>
                <h3 className="font-bold text-lg mb-4">Integrity Flag Detail</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-400">Flag ID</label>
                    <p className="font-mono text-sm">{selectedFlag.flag?.flagId}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Category</label>
                    <p className="font-medium">{CATEGORIES.find((c) => c.key === selectedFlag.flag?.category)?.label}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Severity</label>
                    <p><span className={`text-sm font-semibold px-2 py-0.5 rounded ${sevColor(selectedFlag.flag?.severity)}`}>{selectedFlag.flag?.severity}</span></p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Risk Score</label>
                    <p className="font-bold text-lg">{selectedFlag.flag?.riskScore}/100</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Status</label>
                    <p><span className={statusBadge(selectedFlag.flag?.status)}>{selectedFlag.flag?.status?.replace("_", " ")}</span></p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400">Target User</label>
                    <p>{selectedFlag.flag?.targetUser?.name || selectedFlag.flag?.targetUser?.email || "—"}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-400">Summary</label>
                  <p className="text-sm">{selectedFlag.flag?.summary}</p>
                </div>

                {/* Evidence */}
                {selectedFlag.flag?.evidence && Object.keys(selectedFlag.flag.evidence).length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400">Evidence</label>
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto mt-1">{JSON.stringify(selectedFlag.flag.evidence, null, 2)}</pre>
                  </div>
                )}

                {/* Risk Factors */}
                {selectedFlag.flag?.riskFactors?.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400">Risk Factors</label>
                    <div className="space-y-1 mt-1">
                      {selectedFlag.flag.riskFactors.map((rf, i) => (
                        <div key={i} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                          <span className="font-medium">{rf.factor}</span>
                          <span className="text-gray-500">{rf.detail}</span>
                          <span className="font-mono text-xs">{rf.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Profile */}
                {selectedFlag.riskProfile && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400">User Risk Profile</label>
                    <div className="grid grid-cols-4 gap-2 mt-1 text-sm">
                      <div>Score: <strong>{selectedFlag.riskProfile.riskScore}</strong></div>
                      <div>Tier: <span className={`font-semibold ${sevColor(selectedFlag.riskProfile.riskTier).split(" ")[0]}`}>{selectedFlag.riskProfile.riskTier}</span></div>
                      <div>Total Bids: {selectedFlag.riskProfile.totalBids}</div>
                      <div>Total Auctions: {selectedFlag.riskProfile.totalAuctions}</div>
                    </div>
                  </div>
                )}

                {/* Detection Rules */}
                {selectedFlag.flag?.detectionRules?.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs text-gray-400">Detection Rules Triggered</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedFlag.flag.detectionRules.map((r, i) => (
                        <span key={i} className="badge badge-outline badge-sm">{r}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="border-t pt-4 mt-2">
                  <label className="text-xs text-gray-400 mb-2 block">Admin Action</label>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn btn-xs btn-warning" onClick={() => handleUpdateStatus(selectedFlag.flag._id, "under_review")}>Mark Under Review</button>
                    <button className="btn btn-xs btn-error" onClick={() => handleUpdateStatus(selectedFlag.flag._id, "confirmed")}>Confirm</button>
                    <button className="btn btn-xs" onClick={() => handleUpdateStatus(selectedFlag.flag._id, "dismissed")}>Dismiss</button>
                    <select className="select select-bordered select-xs" defaultValue="" onChange={(e) => {
                      if (e.target.value) handleUpdateStatus(selectedFlag.flag._id, "action_taken", e.target.value);
                    }}>
                      <option value="" disabled>Take Action...</option>
                      {ACTIONS.filter((a) => a !== "none").map((a) => <option key={a} value={a}>{a.replace("_", " ")}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── PROFILES TAB ─── */}
      {tab === "profiles" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <select className="select select-bordered select-sm" value={profileFilters.role} onChange={(e) => handleProfileFilterChange("role", e.target.value)}>
              <option value="">All Roles</option>
              <option value="bidder">Bidder</option>
              <option value="seller">Seller</option>
            </select>
            <select className="select select-bordered select-sm" value={profileFilters.tier} onChange={(e) => handleProfileFilterChange("tier", e.target.value)}>
              <option value="">All Tiers</option>
              {SEVERITIES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Risk Score</th>
                  <th>Tier</th>
                  <th>Total Bids</th>
                  <th>Self-Bid</th>
                  <th>Related</th>
                  <th>Inflation</th>
                  <th>Velocity</th>
                  <th>Last-Sec</th>
                </tr>
              </thead>
              <tbody>
                {profiles.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">No risk profiles found</td></tr>
                ) : (
                  profiles.map((p) => (
                    <tr key={p._id}>
                      <td className="text-sm">{p.user?.name || p.user?.email || "—"}</td>
                      <td><span className="badge badge-sm">{p.role}</span></td>
                      <td className="font-bold text-lg">{p.riskScore}</td>
                      <td><span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevColor(p.riskTier)}`}>{p.riskTier}</span></td>
                      <td>{p.totalBids}</td>
                      <td className={p.selfBidCount > 0 ? "text-red-600 font-medium" : ""}>{p.selfBidCount}</td>
                      <td className={p.relatedAccountCount > 0 ? "text-orange-600 font-medium" : ""}>{p.relatedAccountCount}</td>
                      <td className={p.inflationPatternCount > 0 ? "text-yellow-600 font-medium" : ""}>{p.inflationPatternCount}</td>
                      <td className={p.velocityAbuseCount > 0 ? "text-purple-600 font-medium" : ""}>{p.velocityAbuseCount}</td>
                      <td className={p.lastSecondCount > 0 ? "text-blue-600 font-medium" : ""}>{p.lastSecondCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── TRENDS TAB ─── */}
      {tab === "trends" && (
        <div className="card">
          <h3 className="font-semibold mb-3">7-Day Flag Trend</h3>
          {dashboard.weeklyTrend?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.weeklyTrend.map((day) => {
                const maxCount = Math.max(...dashboard.weeklyTrend.map((d) => d.count), 1);
                return (
                  <div key={day._id} className="flex items-center gap-3">
                    <span className="text-sm w-24">{new Date(day._id).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all" style={{ width: `${(day.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{day.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data for the past 7 days</p>
          )}
        </div>
      )}

      {/* ─── SCAN MODAL ─── */}
      {scanModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <button className="btn btn-sm btn-circle absolute right-2 top-2" onClick={() => { setScanModal(false); setScanResult(null); }}>✕</button>
            <h3 className="font-bold text-lg mb-4">Run Integrity Scan</h3>

            {!scanResult ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">This will scan all auction activity from the past 24 hours for integrity violations. Results are saved as integrity flags for review.</p>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Self-bidding detection</li>
                  <li>• Related-account bidding</li>
                  <li>• Bid inflation patterns</li>
                  <li>• Bid velocity abuse</li>
                  <li>• Last-second manipulation</li>
                </ul>
                <button className="btn btn-primary w-full" disabled={scanning} onClick={handleScan}>
                  {scanning ? <><span className="spinner spinner-sm mr-2" /> Scanning...</> : "Start Scan"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="alert alert-success">Scan complete — {scanResult.detected} flags generated</div>
                {scanResult.categories && (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(scanResult.categories).map(([cat, count]) => (
                      <div key={cat} className="bg-gray-50 p-2 rounded text-sm flex justify-between">
                        <span>{CATEGORIES.find((c) => c.key === cat)?.label || cat}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-sm w-full" onClick={() => { setScanModal(false); setScanResult(null); }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .stat-card {
          @apply bg-white rounded-lg p-4 shadow-sm border;
        }
        .card {
          @apply bg-white rounded-lg p-4 shadow-sm border;
        }
      `}</style>
    </div>
  );
}
