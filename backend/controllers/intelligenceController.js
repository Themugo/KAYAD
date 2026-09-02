// Executive Intelligence API boundary.
// No authoritative intelligence/forecasting/benchmark/report warehouse is
// currently present in Supabase migrations. Do not expose invented analytics.

function notConfigured(res) {
  return res.status(501).json({
    success: false,
    error: "Executive intelligence data services are not configured",
    code: "INTELLIGENCE_NOT_CONFIGURED",
  });
}

export async function getExecutiveDashboard(req, res) { return notConfigured(res); }
export async function getMarketplaceIntelligence(req, res) { return notConfigured(res); }
export async function getDealerIntelligence(req, res) { return notConfigured(res); }
export async function getAuctionIntelligence(req, res) { return notConfigured(res); }
export async function getFinanceIntelligence(req, res) { return notConfigured(res); }
export async function getInspectionIntelligence(req, res) { return notConfigured(res); }
export async function getMarketingIntelligence(req, res) { return notConfigured(res); }
export async function getCustomerIntelligence(req, res) { return notConfigured(res); }
export async function getCountryIntelligence(req, res) { return notConfigured(res); }
export async function getRevenueIntelligence(req, res) { return notConfigured(res); }
export async function getForecasts(req, res) { return notConfigured(res); }
export async function getAIInsights(req, res) { return notConfigured(res); }
export async function getBenchmarks(req, res) { return notConfigured(res); }
export async function getReports(req, res) { return notConfigured(res); }
export async function generateReport(req, res) { return notConfigured(res); }
export async function downloadReport(req, res) { return notConfigured(res); }
export async function queryIntelligence(req, res) { return notConfigured(res); }
export async function exportData(req, res) { return notConfigured(res); }
export async function getScheduledReports(req, res) { return notConfigured(res); }
export async function createScheduledReport(req, res) { return notConfigured(res); }
