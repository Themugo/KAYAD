import asyncHandler from '../../middleware/asyncHandler.js';
import { response } from '../../utils/response.js';
import * as execution from '../services/executionService.js';

export const getExecutionDetails = asyncHandler(async (req, res) =>
  response.success(res, await execution.getExecutionDetails(req.params.bookingId, req)));

export const startInspection = asyncHandler(async (req, res) =>
  response.success(res, await execution.startInspection(req.params.bookingId, req)));

export const saveChecklist = asyncHandler(async (req, res) =>
  response.success(res, await execution.saveChecklist(req.params.bookingId, req, req.body?.items)));

export const uploadEvidence = asyncHandler(async (req, res) =>
  response.created(res, await execution.uploadEvidence(req.params.bookingId, req, req.file)));

export const completeInspection = asyncHandler(async (req, res) =>
  response.success(res, await execution.completeInspection(req.params.bookingId, req, req.body?.notes || null)));

export const deleteEvidence = asyncHandler(async (req, res) =>
  response.success(res, await execution.deleteEvidence(req.params.bookingId, req.params.evidenceId, req))
);
