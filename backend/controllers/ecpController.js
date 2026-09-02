// Enterprise Control Plane API boundary.
// The authoritative Supabase migration chain does not currently provide the
// incident/alert/health/telemetry warehouse required by this surface. All
// endpoints therefore fail closed instead of reporting fabricated health,
// security, performance, deployment, capacity or recovery results.

function notConfigured(res, domain = "Enterprise control plane") {
  return res.status(501).json({
    success: false,
    error: `${domain} data is not configured in the authoritative database schema`,
    code: "CONTROL_PLANE_NOT_CONFIGURED",
  });
}

export async function getExecutiveDashboard(req, res) { return notConfigured(res); }
export async function getSystemHealth(req, res) { return notConfigured(res, "System health telemetry"); }
export async function checkServiceHealth(req, res) { return notConfigured(res, "Service health checks"); }
export async function getBusinessHealth(req, res) { return notConfigured(res, "Business health telemetry"); }
export async function getIncidents(req, res) { return notConfigured(res, "Incident management"); }
export async function getIncident(req, res) { return notConfigured(res, "Incident management"); }
export async function createIncident(req, res) { return notConfigured(res, "Incident management"); }
export async function updateIncident(req, res) { return notConfigured(res, "Incident management"); }
export async function resolveIncident(req, res) { return notConfigured(res, "Incident management"); }
export async function getAlerts(req, res) { return notConfigured(res, "Alert management"); }
export async function createAlert(req, res) { return notConfigured(res, "Alert management"); }
export async function acknowledgeAlert(req, res) { return notConfigured(res, "Alert management"); }
export async function getSelfHealingActions(req, res) { return notConfigured(res, "Self-healing"); }
export async function executeSelfHealing(req, res) { return notConfigured(res, "Self-healing"); }
export async function getSelfHealingRules(req, res) { return notConfigured(res, "Self-healing"); }
export async function getRootCauseAnalysis(req, res) { return notConfigured(res, "Root-cause analysis"); }
export async function getPerformanceMetrics(req, res) { return notConfigured(res, "Performance telemetry"); }
export async function getSecurityStatus(req, res) { return notConfigured(res, "Security telemetry"); }
export async function getCapacityPlanning(req, res) { return notConfigured(res, "Capacity telemetry"); }
export async function getComplianceStatus(req, res) { return notConfigured(res, "Control-plane compliance telemetry"); }
export async function getAuditLogs(req, res) { return notConfigured(res, "Control-plane audit telemetry"); }
export async function askOperationsQuestion(req, res) { return notConfigured(res, "Operations copilot"); }
export async function getDeployments(req, res) { return notConfigured(res, "Deployment telemetry"); }
export async function getDisasterRecovery(req, res) { return notConfigured(res, "Disaster-recovery telemetry"); }
