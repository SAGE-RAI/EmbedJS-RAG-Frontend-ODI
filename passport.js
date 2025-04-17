import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { OAuth2Strategy as GoogleStrategy } from 'passport-google-oauth';
import fetch from 'node-fetch';
import { retrieveOrCreateUser } from './controllers/user.js'; // Ensure this path is correct
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Passport setup for Google authentication
passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true
}, (req, accessToken, refreshToken, profile, done) => {
  profile.email = profile.emails[0].value;
  profile.name = profile.displayName;
  profile.currentToken = req.session.accessToken;
  profile.authMethod = 'google';
  return done(null, profile);
}));

// Passport setup for Local authentication
passport.use('local', new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
      const filePath = path.resolve(__dirname, 'users.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const users = JSON.parse(fileContent);

      const user = users.find(user => user.email === email);

      if (!user) {
        return done(null, false, { message: 'Incorrect email.' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user); // success
    } catch (error) {
      console.log(error);
      return done(error);
    }
  }
));

// Passport setup for Django authentication
passport.use('django', new OAuth2Strategy({
  authorizationURL: 'https://theodi.org/auth/authorize/',
  tokenURL: 'https://theodi.org/auth/token/',
  clientID: process.env.DJANGO_CLIENT_ID,
  clientSecret: process.env.DJANGO_CLIENT_SECRET,
  callbackURL: process.env.DJANGO_CALLBACK_URL,
  grant_type: 'authorization_code', // Specify grant type
  pkce: true, // Enable PKCE
  state: true,
  scope: "read",
  passReqToCallback: true
}, (req, accessToken, refreshToken, profile, done) => {
  fetch('https://theodi.org/api/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return response.json();
  })
  .then(userProfile => {
    // Merge the fetched user profile with the profile object
    Object.keys(userProfile).forEach(key => {
      profile[key] = userProfile[key];
    });
    profile.name = `${userProfile.first_name} ${userProfile.last_name}`;
    profile.currentToken = req.session.accessToken;
    return done(null, profile);
  })
  .catch(error => {
    console.error('Error fetching user profile:', error);
    return done(error);
  });
}));

// Serialize and deserialize user
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser(async (obj, cb) => {
  try {
    const user = await retrieveOrCreateUser(obj);
    cb(null, user);
  } catch (error) {
    cb(error);
  }
});

export default passport;