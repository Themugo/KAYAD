import { createModel } from "./_base.js";

const Lead = createModel("Lead");

// services/leadService.js calls 2 static methods that don't exist
// anywhere, same class of gap as Bid/Car/User this session - but Lead
// is already a confirmed-real table (added earlier this session, used
// by chatController.js/escrowController.js), so this needed checking
// immediately rather than being left for a "might be orphaned" call
// like ConversionFunnel.

// controllers/leadController.js's real call site builds a filters
// object where some keys can be genuinely undefined (stage/source/
// vehicle, only set if present in the query string) while others are
// always a real boolean (archived: req.query.archived === "true" is
// never undefined, always true or false). Only strip keys that are
// actually undefined - an explicit `archived: false` must still be
// applied as a real filter, not dropped as if it were unset.
Lead.getDealerLeads = async (dealerId, filters = {}) => {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined)
  );
  return Lead.find({ dealer: dealerId, ...cleanFilters }).sort({ lastActivityAt: -1 });
};

// A standard CRM "pipeline view": leads for a dealer grouped by stage,
// with a count per stage. Implemented via a plain find + in-memory
// grouping rather than relying on the shim's aggregate()/$group
// pipeline support, since that path hasn't been directly verified this
// session and a simple, predictable grouping is just as correct here.
Lead.getLeadPipeline = async (dealerId) => {
  const leads = await Lead.find({ dealer: dealerId });
  const byStage = {};
  for (const lead of leads) {
    const stage = lead.stage || "new";
    if (!byStage[stage]) byStage[stage] = { stage, count: 0, leads: [] };
    byStage[stage].count += 1;
    byStage[stage].leads.push(lead);
  }
  return Object.values(byStage);
};

export default Lead;
