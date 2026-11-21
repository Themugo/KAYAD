import express from "express";
import { protect } from "../middleware/auth.js";
import { validateObjectId } from "../middleware/validate.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { idempotencyCheck } from "../middleware/idempotency.js";
import { csrfProtection } from "../middleware/csrf.js";
import { listPurchaseOperations,getPurchaseOperationsCase,markCollection,markTransfer,openPurchaseDispute } from "../services/marketplaceFulfilment.service.js";

const router=express.Router();
router.get("/operations",protect,asyncHandler(async(req,res)=>res.json({success:true,data:await listPurchaseOperations({actorId:req.user.id,role:req.user.role,status:req.query.status||null,limit:req.query.limit||100})})));
router.get("/:id/operations",protect,validateObjectId,asyncHandler(async(req,res)=>res.json({success:true,data:await getPurchaseOperationsCase(req.params.id,{actorId:req.user.id,role:req.user.role})})));
router.post("/:id/collection",protect,idempotencyCheck,csrfProtection,validateObjectId,asyncHandler(async(req,res)=>res.json({success:true,data:await markCollection({outcomeId:req.params.id,actorId:req.user.id,role:req.user.role,status:req.body?.status||"collected",reference:req.body?.reference||null,notes:req.body?.notes||null,req})})));
router.post("/:id/transfer",protect,idempotencyCheck,csrfProtection,validateObjectId,asyncHandler(async(req,res)=>res.json({success:true,data:await markTransfer({outcomeId:req.params.id,actorId:req.user.id,role:req.user.role,status:req.body?.status||"completed",reference:req.body?.reference||null,notes:req.body?.notes||null,req})})));
router.post("/:id/dispute",protect,idempotencyCheck,csrfProtection,validateObjectId,asyncHandler(async(req,res)=>res.json({success:true,data:await openPurchaseDispute({outcomeId:req.params.id,actorId:req.user.id,role:req.user.role,title:req.body?.title,description:req.body?.description,category:req.body?.category,priority:req.body?.priority,req})})));
export default router;
