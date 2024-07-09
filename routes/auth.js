import express from 'express';
import passport from '../passport.js'; // Require the passport module
import { retrieveOrCreateUser } from '../controllers/user.js'; // Import necessary functions from controllers
import { processToken } from '../controllers/token.js';

const router = express.Router();

async function processLogin(req, res) {
    try {
        const profile = req.session.passport ? req.session.passport.user : req.session.user;
        const user = await retrieveOrCreateUser(profile);
        processToken(profile.currentToken, user._id);
        delete profile.currentToken;

        // Update last login data
        user.lastLoginFormatted = user.lastLogin.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
        user.lastLogin = new Date();

        // Save the user
        await user.save();

        const plainUser = user.toObject();
        plainUser.id = user._id.toString();

        req.session.user = plainUser;

    } catch (error) {
        console.log(error);
    }
}

// Authentication route for Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Authentication route for Django
router.get('/django', passport.authenticate('django'));

// Callback endpoint for Google authentication
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/error' }), async (req, res) => {
    req.session.authMethod = 'google';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req, res);
    res.redirect('/instances/');
});

// Callback endpoint for Django authentication
router.get('/django/callback', passport.authenticate('django', { failureRedirect: '/error' }), async (req, res) => {
    req.session.authMethod = 'django';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req, res);
    res.redirect('/instances/');
});

export default router;