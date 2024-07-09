import express from 'express';
import { getRag, updateRag, deleteRag } from '../controllers/ragInstance.js';
import { isAdmin, ensureAuthenticated, checkOwnership, canAccessRag } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', ensureAuthenticated, canAccessRag, getRag);
router.put('/', isAdmin, checkOwnership, updateRag);
router.delete('/', isAdmin, checkOwnership, deleteRag);

export default router;