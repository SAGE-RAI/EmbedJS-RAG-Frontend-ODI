// routes/admin.js

import express from 'express';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', isAdmin, function(req, res) {
    res.locals.pageTitle = "Admin";
    res.render('pages/admin');
});

export default router;