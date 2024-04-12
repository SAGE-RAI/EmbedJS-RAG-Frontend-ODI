// admin.js
// admin routes

const express = require('express');
const router = express.Router();

function isAdmin(req, res, next) {
    // Check if authMethod session variable is set to 'google'
    if (req.session.authMethod === 'google') {
        next(); // Proceed to the next middleware or route handler
    } else {
        // If user is not authenticated, send permission denied error
        res.status(403).send('Permission denied');
    }
}

router.get('/', function(req, res) {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google'); // Return the redirect response
    }
    res.locals.pageTitle = "Admin";
    res.render('pages/admin');
});

router.get('/rating/categories', isAdmin, function(req, res) {
    // Proceed to handle the request if user is an admin
});

module.exports = router;