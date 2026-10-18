import { findAll, findById, create, update } from '../db/index.js';
import AuditLog from '../models/AuditLog.js';
import { isRoleAllowed } from '../config/roles.js';
import { getIO } from '../utils/io.js';

const tables = { policies:'governance_policies', changes:'change_requests', approvals:'approval_rules', features:'feature_lifecycles', risks:'risk_assessments', standards:'enterprise_standards', countries:'country_rules', partners:'partner_requirements', releases:'releases', decisions:'decision_registers' };
// Canonical role check (owner/webhoist honoured, same as the route-level allowRoles guards).
const ensure = (req, roles=['admin','superadmin','executive','manager']) => isRoleAllowed(req.user, roles);
const ok = (res,data) => res.json({success:true,data});
const list = async (table, filters={}) => findAll(table,{filters,orderBy:'createdAt',ascending:false,limit:200});
// Audit persistence is part of the governance write contract. Do not swallow
// failures: callers must not report a fully successful governance operation
// when its audit record could not be persisted. (The underlying write and audit
// are not yet a single database transaction; see the staging gate/runbook.)
const audit = async (req, action, target, targetModel, details={}) => {
  await AuditLog.create({action,actor:req.user?.id,target,targetModel,details,createdAt:new Date().toISOString()});
  getIO()?.to('admins').emit('controlPlaneUpdated',{type:'governance',action,target,at:new Date().toISOString()});
};
const RESERVED_MUTATION_FIELDS = new Set([
  'id','_id','createdBy','created_by','createdAt','created_at',
  'updatedBy','updated_by','updatedAt','updated_at','actorId','actor_id',
  'approvedBy','approved_by','approvedAt','approved_at','reviewedBy','reviewed_by',
  'reviewedAt','reviewed_at','submittedBy','submitted_by','submittedAt','submitted_at',
  'checksum','previousChecksum','previous_checksum',
]);
const validateMutationPayload = (body, { allowStatus = false, allowStage = false } = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'A JSON object is required.' };
  const blocked = Object.keys(body).filter((key) =>
    RESERVED_MUTATION_FIELDS.has(key) || (!allowStatus && key === 'status') || (!allowStage && key === 'stage'));
  if (blocked.length) return { error: `Protected fields cannot be supplied: ${blocked.join(', ')}` };
  return { value: body };
};
const invalidPayload = (res, error) => res.status(400).json({success:false,error});
const deny = (res) => res.status(403).json({success:false,error:'Insufficient governance permissions'});

export async function getGovernanceDashboard(req,res){
 const [policies,changes,risks,releases,decisions]=await Promise.all([list(tables.policies),list(tables.changes),list(tables.risks),list(tables.releases),list(tables.decisions)]);
 return ok(res,{governance_migration_tables:true,counts:{policies:policies.length,changes:changes.length,openRisks:risks.filter(x=>!['closed','resolved'].includes(x.status)).length,releases:releases.length,decisions:decisions.length},recent:{policies:policies.slice(0,5),changes:changes.slice(0,10),risks:risks.slice(0,10),releases:releases.slice(0,5),decisions:decisions.slice(0,10)}});
}
const simpleList = key => async(req,res)=>ok(res,await list(tables[key]));
const simpleGet = key => async(req,res)=>{const row=await findById(tables[key],req.params.id); if(!row)return res.status(404).json({success:false,error:'Record not found'}); return ok(res,row)};
const simpleCreate = (key,roles) => async(req,res)=>{if(!ensure(req,roles))return deny(res); const parsed=validateMutationPayload(req.body); if(parsed.error)return invalidPayload(res,parsed.error); const row=await create(tables[key],{...parsed.value,createdBy:req.user.id,updatedBy:req.user.id}); await audit(req,`governance_${key}_created`,row.id,key); return ok(res,row)};
const simpleUpdate = (key,roles) => async(req,res)=>{if(!ensure(req,roles))return deny(res); const parsed=validateMutationPayload(req.body); if(parsed.error)return invalidPayload(res,parsed.error); const row=await update(tables[key],req.params.id,{...parsed.value,updatedBy:req.user.id,updatedAt:new Date().toISOString()}); await audit(req,`governance_${key}_updated`,row.id,key); return ok(res,row)};
export async function getPolicies(req,res){return simpleList('policies')(req,res)}
export async function getPolicy(req,res){return simpleGet('policies')(req,res)}
export async function createPolicy(req,res){return simpleCreate('policies',['admin','superadmin'])(req,res)}
export async function updatePolicy(req,res){return simpleUpdate('policies',['admin','superadmin'])(req,res)}
export async function getChangeRequests(req,res){return simpleList('changes')(req,res)}
export async function getChangeRequest(req,res){return simpleGet('changes')(req,res)}
export async function createChangeRequest(req,res){return simpleCreate('changes',['admin','superadmin','manager'])(req,res)}
export async function submitForApproval(req,res){if(!ensure(req,['admin','superadmin','manager']))return deny(res);return transition(req,res,'changes','submitted',{submittedBy:req.user.id,submittedAt:new Date().toISOString()})}
export async function approveChangeRequest(req,res){if(!ensure(req,['admin','superadmin','executive']))return deny(res); const current=await findById(tables.changes,req.params.id); if(!current)return res.status(404).json({success:false,error:'Change request not found'}); if(current.status!=='submitted')return res.status(409).json({success:false,error:'Only submitted changes can be approved.'}); return transition(req,res,'changes','approved',{reviewedBy:req.user.id,reviewedAt:new Date().toISOString(),reviewComments:req.body?.comments||null})}
export async function rejectChangeRequest(req,res){if(!ensure(req,['admin','superadmin','executive']))return deny(res); if(!String(req.body?.reason||'').trim())return res.status(400).json({success:false,error:'A rejection reason is required.'}); const current=await findById(tables.changes,req.params.id); if(!current)return res.status(404).json({success:false,error:'Change request not found'}); if(current.status!=='submitted')return res.status(409).json({success:false,error:'Only submitted changes can be rejected.'}); return transition(req,res,'changes','rejected',{reviewedBy:req.user.id,reviewedAt:new Date().toISOString(),reviewComments:req.body?.comments||null,rejectionReason:req.body?.reason||null})}
async function transition(req,res,key,status,patch){const row=await update(tables[key],req.params.id,{status,...patch,updatedBy:req.user.id,updatedAt:new Date().toISOString()});await audit(req,`governance_${key}_${status}`,row.id,key);return ok(res,row)}
export async function getApprovalRules(req,res){return simpleList('approvals')(req,res)}
export async function createApprovalRule(req,res){return simpleCreate('approvals',['admin','superadmin'])(req,res)}
export async function updateApprovalRule(req,res){return simpleUpdate('approvals',['admin','superadmin'])(req,res)}
export async function getFeatureLifecycles(req,res){return simpleList('features')(req,res)}
export async function createFeatureLifecycle(req,res){return simpleCreate('features',['admin','superadmin','manager'])(req,res)}
export async function updateFeatureStage(req,res){if(!ensure(req,['admin','superadmin','manager']))return deny(res);return transition(req,res,'features',req.body?.stage,{stageComments:req.body?.comments||null})}
export async function getRisks(req,res){return simpleList('risks')(req,res)}
export async function createRisk(req,res){return simpleCreate('risks',['admin','superadmin','executive'])(req,res)}
export async function updateRiskStatus(req,res){
 if(!ensure(req,['admin','superadmin','executive']))return deny(res);
 const allowed=new Set(['open','active','monitoring','resolved','escalated','mitigated']);
 if(typeof req.body?.status!=='string'||!allowed.has(req.body.status))return invalidPayload(res,'status must be one of: open, active, monitoring, resolved, escalated, mitigated.');
 const row=await update(tables.risks,req.params.id,{status:req.body.status,updatedBy:req.user.id,updatedAt:new Date().toISOString()});
 await audit(req,'governance_risks_status_updated',row.id,'risks',{status:req.body.status}); return ok(res,row);
}
export async function getStandards(req,res){return simpleList('standards')(req,res)}
export async function createStandard(req,res){return simpleCreate('standards',['admin','superadmin'])(req,res)}
export async function getCountryRules(req,res){return simpleList('countries')(req,res)}
export async function createCountryRule(req,res){return simpleCreate('countries',['admin','superadmin'])(req,res)}
export async function getPartnerRequirements(req,res){return simpleList('partners')(req,res)}
export async function createPartnerRequirement(req,res){return simpleCreate('partners',['admin','superadmin'])(req,res)}
export async function getReleases(req,res){return simpleList('releases')(req,res)}
export async function createRelease(req,res){return simpleCreate('releases',['admin','superadmin'])(req,res)}
export async function updateReleaseStatus(req,res){
 if(!ensure(req,['admin','superadmin']))return deny(res);
 const status=req.body?.status;
 if(typeof status!=='string'||!status.trim()||status.length>40)return invalidPayload(res,'A valid release status is required.');
 const row=await update(tables.releases,req.params.id,{status:status.trim(),updatedBy:req.user.id,updatedAt:new Date().toISOString()});
 await audit(req,'governance_releases_status_updated',row.id,'releases',{status:status.trim()}); return ok(res,row);
}
export async function getDecisions(req,res){return simpleList('decisions')(req,res)}
export async function createDecision(req,res){return simpleCreate('decisions',['admin','superadmin','executive'])(req,res)}
export async function getAuditLogs(req,res){const limit=Math.min(Math.max(Number.parseInt(req.query.limit,10)||100,1),200);return res.json({success:true,data:await AuditLog.findAll({limit})})}
export async function getComplianceDashboard(req,res){const [risks,policies]=await Promise.all([list(tables.risks),list(tables.policies)]);return ok(res,{derived_governance_records:true,openRisks:risks.filter(r=>!['closed','resolved'].includes(r.status)).length,activePolicies:policies.filter(p=>p.status==='active').length,generatedAt:new Date().toISOString()})}
export async function getGovernanceHelp(req,res){return ok(res,{message:'Governance assistance is evidence-backed. Review policies, changes, risks and audit history before taking action.'})}
export async function getGovernanceReport(req,res){const [dashboard,risks,changes]=await Promise.all([getGovernanceDashboardData(),list(tables.risks),list(tables.changes)]);return ok(res,{dashboard,risks,changes})}
async function getGovernanceDashboardData(){const [p,c,r]=await Promise.all([list(tables.policies),list(tables.changes),list(tables.risks)]);return {policies:p.length,changes:c.length,openRisks:r.filter(x=>!['closed','resolved'].includes(x.status)).length}}
