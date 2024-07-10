import express from 'express';
import { getInstance, updateInstance, deleteInstance } from '../controllers/instance.js';
import { isAdmin, ensureAuthenticated, checkOwnership, canAccessInstance } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', ensureAuthenticated, canAccessInstance, getInstance);
router.put('/', isAdmin, checkOwnership, updateInstance);
router.delete('/', isAdmin, checkOwnership, deleteInstance);

export default router;