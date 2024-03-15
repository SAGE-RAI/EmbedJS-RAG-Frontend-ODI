// Load environment variables securely
require("dotenv").config({ path: "./config.env" });

// MongoDB setup
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

// Database models
const User = require('./models/user'); // Import the User model
const Token = require('./models/token'); // Import the Token model

// Database controllers
const { retrieveOrCreateUser } = require('./controllers/user');
const { processToken, verifyToken } = require('./controllers/token');


// Check MongoDB connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB database");
});

// Express setup
const express = require('express');
const session = require('express-session');
const cors = require("cors");
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

const app = express();
const port = process.env.PORT || 3080;

app.set('view engine', 'ejs');
app.use(cors());

// Open AI
const OpenAI = require("openai");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Middleware for logging
const logger = require('morgan');
app.use(logger('dev'));

// Middleware for parsing incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(session({
  resave: false,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Middleware for user object
app.use(function(req, res, next) {
  res.locals.user = req.session.passport ? req.session.passport.user : req.session.user;
  next();
});

app.use(function(req, res, next) {
  // Check if accessToken exists in query parameters
  const accessToken = req.query.accessToken;

  // Set accessToken in session cookie if it exists
  if (accessToken) {
    req.session.accessToken = accessToken;
  }

  next();
});

// Google AUTH
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true
},
async function(req, accessToken, refreshToken, profile, done) {
  try {
    // Retrieve or create user
    const user = await retrieveOrCreateUser(profile);

    // Authorize the token
    await processToken(req.session.accessToken, user._id);

    // Update last login data
    user.lastLoginFormatted = user.lastLogin.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
    user.lastLogin = new Date();

    // Save the user
    await user.save();

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialize and deserialize user
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

// Redirect the user to Google for authentication
app.get('/auth/google', function(req, res) {
  // Redirect the user to Google for authentication
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/error' }),
  function(req, res) {
    res.redirect('/profile');
  }
);

// Logout route
app.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    unauthorised(res);
  }
}

function unauthorised(res) {
  res.locals.pageTitle ="401 Unauthorised";
  return res.status(401).render("errors/401");
}

// Routes
app.use(express.static(__dirname + '/public')); // Public directory

app.get('/', function(req, res) {
  if (req.session.passport) {
    res.redirect("/profile");
  } else {
    res.locals.pageTitle ="ODI Template (NodeJS + Express + OAuth)";
    res.render('pages/auth');
  }
});

app.post("/openai-completion", async (req, res) => {
  // Check if the authorization header with bearer token exists
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Bearer token missing' });
  }

  // Extract the token from the authorization header
  const token = authHeader.split(' ')[1];
  try {
    // Verify the token's validity
    const isValidToken = await verifyToken(token);
    if (!isValidToken) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Proceed to chat with OpenAI
    const response = await openai.chat.completions.create({
      ...req.body,
    });
    res.status(200).send(response.data || response);
  } catch (error) {
    console.error("Error in /openai-completion route:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/profile', ensureAuthenticated, function(req, res) {
  res.locals.pageTitle ="Profile page";
  res.render('pages/profile');
});

app.get('/page1', ensureAuthenticated, function(req, res) {
  res.locals.pageTitle ="Page 1";
  res.render('pages/page1');
});

app.get('/page2', ensureAuthenticated, function(req, res) {
  res.locals.pageTitle ="Page 2";
  res.render('pages/page2');
});

// Error handling
app.get('/error', (req, res) => res.send("error logging in"));

app.get('*', function(req, res){
  res.locals.pageTitle ="404 Not Found";
  return res.status(404).render("errors/404");
});

// Start server
app.listen(port , () => console.log('App listening on port ' + port));