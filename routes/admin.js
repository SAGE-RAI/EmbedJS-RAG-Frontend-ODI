// admin.js
// admin routes

const express = require('express');
const router = express.Router();

function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google'); // Return the redirect response
    }
    // Check if authMethod session variable is set to 'google'
    if (req.session.authMethod === 'google') {
        next(); // Proceed to the next middleware or route handler
    } else {
        // If user is not authenticated, send permission denied error
        res.status(403).send('Permission denied');
    }
}

router.get('/', isAdmin, function(req, res) {
    res.locals.pageTitle = "Admin";
    res.render('pages/admin');
});

router.get('/rating/categories', isAdmin, function(req, res) {
    // Proceed to handle the request if user is an admin
});

router.get('/sources/add', isAdmin, function(req, res) {
    res.locals.pageTitle = "Add new source";
    res.render('pages/sources/add');
});

router.get('/sources/import', isAdmin, function(req, res) {
    res.locals.pageTitle = "Bulk import";
    res.render('pages/sources/import');
});

// Admin route to render the add source page with loaderId
router.get('/sources/:loaderId', isAdmin, function(req, res) {
    const loaderId = req.params.loaderId;
    res.locals.pageTitle = "Add/Edit Source";
    res.render('pages/sources/add', { loaderId: loaderId });
});

router.get('/sources', isAdmin, function(req, res) {
    res.locals.pageTitle = "Sources";
    res.render('pages/sources/view');
});

module.exports = router;