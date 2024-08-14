// routes/admin.js

import express from 'express';

const router = express.Router();

router.get('/', isAdmin, function(req, res) {
    res.locals.pageTitle = "Admin";
    res.render('pages/admin');
});

function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }
    if (req.session.authMethod === 'google') {
        req.isAdmin = true;
        next();
    } else {
        res.status(403).send('Permission denied');
    }
}

export default router;