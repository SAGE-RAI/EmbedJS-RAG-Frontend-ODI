// authRoutes.js

const express = require('express');
const passport = require('../passport'); // Require the passport module

const { retrieveOrCreateUser } = require('../controllers/user'); // Import necessary functions from controllers
const { processToken } = require('../controllers/token'); // Import necessary functions from controllers

const router = express.Router();

async function processLogin(req,res) {
    try {
      const profile = req.session.passport ? req.session.passport.user : req.session.user;
      const user = await retrieveOrCreateUser(profile);
      processToken(profile.currentToken, user._id);
      delete(profile.currentToken);

      // Update last login data
      user.lastLoginFormatted = user.lastLogin.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
      user.lastLogin = new Date();

      // Save the user
      await user.save();
    } catch (error) {
      console.log(error);
    }
}

// Authentication route for Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Authentication route for Django
router.get('/django',
  passport.authenticate('django')
);

// Callback endpoint for Google authentication
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  async (req, res) => {
    req.session.authMethod = 'google';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req);
    res.redirect('/profile');
  }
);

// Callback endpoint for Django authentication
router.get('/django/callback',
  passport.authenticate('django', { failureRedirect: '/error' }),
  async (req, res) => {
    req.session.authMethod = 'django';
    // Successful authentication, redirect to profile page or wherever needed
    await processLogin(req);
    res.redirect('/profile');
  }
);

module.exports = router;