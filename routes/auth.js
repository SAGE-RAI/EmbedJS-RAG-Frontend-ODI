import express from 'express';
import passport from '../passport.js'; // Require the passport module
import { retrieveOrCreateUser } from '../controllers/user.js'; // Import necessary functions from controllers
import { processToken } from '../controllers/token.js';
import { ensureAuthenticated, clearInstanceCache } from '../middleware/auth.js';
import { getTransactions } from '../controllers/transaction.js';

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

// Authentication route for Django with optional path redirection
router.get('/django', (req, res, next) => {
    // Capture the requested path and store it in session
    if (req.query.path) {
        req.session.redirectTo = req.query.path;
    }
    passport.authenticate('django')(req, res, next);
});

// Callback endpoint for Google authentication
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/error' }), async (req, res) => {
    req.session.authMethod = 'google';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req, res);
    res.redirect('/instances/');
});

// Callback endpoint for Django authentication
router.get('/django/callback', (req, res, next) => {
    // Temporarily store the redirectTo value
    const redirectTo = req.session.redirectTo;

    // Call passport authentication
    passport.authenticate('django', async (err, user, info) => {
        if (err || !user) {
            return res.redirect('/error');
        }

        // Log the user in manually
        req.logIn(user, async (loginErr) => {
            if (loginErr) {
                return next(loginErr);
            }

            // Process login (save user to session, update last login, etc.)
            await processLogin(req, res);

            // Restore the redirectTo value after passport has processed the session
            req.session.redirectTo = redirectTo;

            // Redirect to the originally requested path or a default location
            res.redirect(redirectTo || '/instances/');
        });
    })(req, res, next);
});

router.get('/profile', ensureAuthenticated, (req, res) => {
    res.locals.pageTitle = "Profile";
    res.render('pages/profile');
});

router.get('/transactions', ensureAuthenticated, getTransactions);

router.post('/logout', (req, res) => {
    req.logout(err => {
      if (err) return next(err);
      res.redirect('/');
    });
  });


export default router;