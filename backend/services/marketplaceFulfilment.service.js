import { findById, findOne, findAll, create, update, updateMany } from "../db/index.js";
import { atomicTransitionPurchaseOutcome } from "../utils/atomicTransactions.js";
import { ownershipService } from "../ownership/services/ownershipService.js";
import { openDispute as openEscrowDispute } from "./dispute.service.js";
import { logActionFromReq } from "../utils/securityLogger.js";
import { emitCommunication, COMMUNICATION_EVENTS } from "./communicationEvents.service.js";
import { logWarn } from "../utils/logger.js";

const nowIso = () => new Date().toISOString();
const err = (message, status=409) => Object.assign(new Error(message), { status });
const getOutcome = async (id) => { const outcome=await findById("purchase_outcomes",id); if(!outcome) throw err("Marketplace purchase outcome not found",404); return outcome; };
const getContext = async (id) => { const outcome=await getOutcome(id); const [car,payment,escrow]=await Promise.all([findById("cars",outcome.car_id), outcome.payment_id?findById("payments",outcome.payment_id):null, outcome.escrow_id?findById("escrows",outcome.escrow_id):null]); return {outcome,car,payment,escrow}; };
const isAdmin = (role) => ["admin","super_admin","superadmin","staff"].includes(String(role||"").toLowerCase());
const assertParty = (outcome, actorId, role) => { if(isAdmin(role)) return; if(String(outcome.buyer_user_id)!==String(actorId) && String(outcome.seller_user_id)!==String(actorId)) throw err("Not authorized for this purchase",403); };
const assertSeller = (outcome, actorId, role) => { if(isAdmin(role)) return; if(String(outcome.seller_user_id)!==String(actorId)) throw err("Only the vehicle seller may perform this fulfilment action",403); };

export async function listPurchaseOperations({ actorId=null, role=null, status=null, limit=100 }={}) {
  const filters={}; if(!isAdmin(role)) filters.buyer_user_id=actorId; if(status) filters.status=status;
  const rows=await findAll("purchase_outcomes",{filters,limit:Math.min(Number(limit)||100,250),sort:{updated_at:-1}});
  return Promise.all(rows.map(async row=>({...row,car:await findById("cars",row.car_id)})));
}
export async function getPurchaseOperationsCase(id,{actorId,role}={}) { const ctx=await getContext(id); assertParty(ctx.outcome,actorId,role); return ctx; }

export async function syncPurchaseOutcomeFromEscrow(escrowId, escrowStatus, meta={}) {
  const outcome=await findOne("purchase_outcomes",{escrow_id:escrowId});
  if(!outcome) return null;
  if(["refunded"].includes(escrowStatus)) {
    if(["refunded"].includes(outcome.status)) return outcome;
    return atomicTransitionPurchaseOutcome({outcomeId:outcome.id,nextStatus:"refunded",collectionStatus:"blocked",transferStatus:"blocked",reason:meta.reason||"Escrow refunded"});
  }
  if(escrowStatus === "disputed") {
    if(outcome.status === "disputed") return outcome;
    return atomicTransitionPurchaseOutcome({outcomeId:outcome.id,nextStatus:"disputed",reason:meta.reason||"Escrow dispute opened"});
  }
  if(escrowStatus === "released") {
    if(outcome.status === "completed") return outcome;
    // STAGE 6 ESCROW/PURCHASE/FULFILMENT CONVERGENCE FIX: escrow release
    // is the point of financial completion for a private-seller sale, but
    // nothing on this path ever updated the underlying `cars` row -- only
    // `purchase_outcomes`. The two OTHER purchase paths that exist in this
    // codebase (a direct, non-escrow purchase in paymentService.js, and an
    // auction-win settlement in auctionSettlement.service.js) both flip
    // `cars.status` to "sold" the moment payment succeeds; this escrow
    // path alone left it at "available" forever. Confirmed consequence:
    // GET /cars's own default marketplace query filters on
    // `status: "available"` (carController.js::getCars), so an
    // escrow-settled, ownership-transferred vehicle kept appearing in
    // public marketplace search/browse results indefinitely, and nothing
    // at payment-initiation time checks for an existing completed
    // purchase_outcomes row for the car -- so a second buyer could
    // initiate and pay for a vehicle someone else already owns. Mirrors
    // the exact field set the other two paths already use, so this
    // reuses the established "sold" convention rather than inventing a
    // new one.
    await update("cars", outcome.car_id, { sold: true, status: "sold", isPaid: true, paymentStatus: "paid" }).catch((e) => logWarn("Failed to mark car sold after escrow release", { error: e.message, carId: outcome.car_id }));
    return atomicTransitionPurchaseOutcome({outcomeId:outcome.id,nextStatus:outcome.collection_status==='collected'?(outcome.transfer_status==='completed'?'completed':'transfer_pending'):'ready_for_collection',collectionStatus:outcome.collection_status==='collected'?'collected':'ready',transferStatus:outcome.transfer_status});
  }
  if(["funded","vehicle_confirmed","delivered"].includes(String(escrowStatus)) && outcome.status === "payment_received") {
    return atomicTransitionPurchaseOutcome({outcomeId:outcome.id,nextStatus:"ready_for_collection",collectionStatus:"ready"});
  }
  return outcome;
}

export async function markCollection({ outcomeId, actorId, role, status="collected", reference=null, notes=null, req=null }) {
  const {outcome,car}=await getContext(outcomeId); assertSeller(outcome,actorId,role);
  if(!["scheduled","collected","failed"].includes(status)) throw err("Invalid collection status",400);
  if(["payment_received"].includes(outcome.status) && status==='collected') {
    await atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"collected",collectionStatus:"collected",transferStatus:"pending",reference,reason:notes});
  } else if(outcome.status === "ready_for_collection" && status==='collected') {
    await atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"collected",collectionStatus:"collected",transferStatus:"pending",reference,reason:notes});
  } else if(status==='failed') {
    await atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"failed",collectionStatus:"failed",transferStatus:"blocked",reference,reason:notes||"Vehicle collection failed"});
  } else {
    return outcome;
  }
  const updated=await getOutcome(outcomeId);
  await logActionFromReq(req,"marketplace_collection_updated",{target:outcome.car_id,targetModel:"Car",details:{outcomeId,actorId,status,reference}}).catch(()=>{});
  if(status==='collected') await emitCommunication({userId:outcome.buyer_user_id,eventType:COMMUNICATION_EVENTS.VEHICLE_COLLECTED,title:"Vehicle collection recorded",message:`${car?.title||"Your vehicle"} has been marked as collected. Ownership transfer is the remaining completion step.`,channels:["in_app","email"],metadata:{purchaseOutcomeId:outcome.id,carId:outcome.car_id}}).catch(()=>{});
  return updated;
}

export async function markTransfer({ outcomeId, actorId, role, status="completed", reference=null, notes=null, req=null }) {
  const {outcome,car}=await getContext(outcomeId); assertSeller(outcome,actorId,role);
  if(outcome.collection_status!=='collected') throw err("Vehicle collection must be completed before ownership transfer",409);
  if(!["initiated","completed","failed"].includes(status)) throw err("Invalid transfer status",400);
  if(status==='failed') return atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"failed",collectionStatus:"collected",transferStatus:"failed",reference,reason:notes||"Ownership transfer failed"});
  if(status==='initiated') return atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"transfer_pending",collectionStatus:"collected",transferStatus:"initiated",reference,reason:notes});

  const existing=await findOne("owner_vehicles",{owner_id:outcome.buyer_user_id,vin:car?.vin,status:"active"});
  const ownerVehicle=existing || await ownershipService.addVehicleToGarage(outcome.buyer_user_id,{vin:car?.vin,make:car?.make||car?.brand,model:car?.model,year:car?.year,registrationNumber:car?.registrationNumber||car?.registration_number,colour:car?.color||car?.colour,ownershipType:"current",purchaseDate:nowIso(),purchasePrice:Number(outcome.amount),purchaseMileage:car?.mileage||car?.current_mileage||0});
  const updated=await atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"completed",collectionStatus:"collected",transferStatus:"completed",reference,reason:notes,ownershipVehicleId:ownerVehicle?.id||null});
  await logActionFromReq(req,"marketplace_transfer_completed",{target:outcome.car_id,targetModel:"Car",details:{outcomeId,actorId,reference,ownerVehicleId:ownerVehicle?.id||null}}).catch(()=>{});
  await emitCommunication({userId:outcome.buyer_user_id,eventType:COMMUNICATION_EVENTS.PAYMENT_SUCCESS,title:"Vehicle purchase completed",message:`${car?.title||"Your vehicle"} has completed payment, collection and ownership transfer.`,channels:["in_app","email"],metadata:{purchaseOutcomeId:outcome.id,carId:outcome.car_id,ownerVehicleId:ownerVehicle?.id||null}}).catch(()=>{});
  return updated;
}

export async function openPurchaseDispute({outcomeId,actorId,role,title,description,category="vehicle_purchase",priority="normal",req=null}) {
  const {outcome}=await getContext(outcomeId); assertParty(outcome,actorId,role);
  if(!outcome.escrow_id) throw err("This purchase does not have an escrow dispute channel; use the governed transaction dispute process",409);
  const dispute=await openEscrowDispute({escrowId:outcome.escrow_id,actorId,role:String(outcome.buyer_user_id)===String(actorId)?"buyer":"seller",title,description,category,priority,reason:description});
  const updated=await atomicTransitionPurchaseOutcome({outcomeId,nextStatus:"disputed",reason:description,reference:dispute?.id||null});
  return {outcome:updated,dispute};
}
