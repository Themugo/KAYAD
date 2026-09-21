import express from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateQuery, searchFacetsQuerySchema } from '../middleware/validate.js';
import { search, autocomplete, facets } from '../controllers/searchController.js';

const router = express.Router();
router.get('/', optionalAuth, asyncHandler(search));
router.get('/facets', optionalAuth, validateQuery(searchFacetsQuerySchema), asyncHandler(facets));
router.get('/autocomplete', optionalAuth, asyncHandler(autocomplete));
export default router;
