// Load environment variables securely
require("dotenv").config({ path: "./config.env" });

// MongoDB setup
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

const Conversation = require('./models/conversation'); // Import the Token model

// Database controllers
const { retrieveOrCreateUser } = require('./controllers/user');
const { processToken, getUserIDFromToken } = require('./controllers/token');
const { getConversations } = require('./controllers/conversation');
const { verifyTokenMiddleware } = require('./middleware'); // Import your middleware functions

// Check MongoDB connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB database");
});

// Express setup
const express = require('express');
const session = require('express-session');
const cors = require("cors");
const passport = require('./passport'); // Require the passport module

//Routes import
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversation');
const completionRoutes = require('./routes/completion');

const app = express();
const port = process.env.PORT || 3080;

app.set('view engine', 'ejs');
app.use(cors());

// Routes
app.use(express.static(__dirname + '/public')); // Public directory

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
app.use(async function(req, res, next) {
  const user = req.session.passport ? req.session.passport.user : req.session.user;
  if (user) {
    res.locals.user = await retrieveOrCreateUser(user);
    res.locals.user.isAdmin = false;
    if (req.session.authMethod === 'google') {
      res.locals.user.isAdmin = true;
    }
  } else {
    res.locals.user = user;
  }
  next();
});

// This function checks for a new token after a successful login, it doens't handle the token during login!!!
app.use(function(req, res, next) {
  // Check if accessToken exists in query parameters
  const accessToken = req.query.accessToken;

  if (accessToken) {
    req.session.accessToken = accessToken;
  }

  // Check if the user is authenticated and access token exists
  if (req.isAuthenticated() && req.session.accessToken) {
    // Get the authenticated user object
    const user = res.locals.user;

    // Process the access token with user ID
    processToken(req.session.accessToken, user._id);
  }

  // Call the next middleware
  next();
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

function isAdmin(req) {
  // Check if authMethod session variable is set to 'google'
  return req.session.authMethod === 'google';
}

app.get('/', function(req, res) {
  if (req.session.passport) {
    res.redirect("/profile");
  } else {
    res.locals.pageTitle ="ODI AI Assistant";
    res.render('pages/auth');
  }
});

app.get('/profile', ensureAuthenticated, function(req, res) {
  res.locals.pageTitle ="Profile";
  res.render('pages/profile');
});

app.get('/about', function(req, res) {
  res.locals.pageTitle ="About";
  res.render('pages/about');
});

app.get('/admin', function(req, res) {
  res.redirect('/auth/google');
});

// Logout route
app.post('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// Use authentication routes
app.use('/auth', authRoutes);

// Use authentication routes
app.use('/conversation', conversationRoutes);

// Use authentication routes
app.use('/openai-completion', completionRoutes);

// Route handler for /conversations
app.get("/conversations", verifyTokenMiddleware, async (req, res) => {
  try {
    let userId = res.locals.user._id || null;
    if (!req.isAuthenticated()) {
      // Extract the token from the request header
      const token = req.headers['authorization'].split(' ')[1];
      // Get the user ID associated with the token
      userId = await getUserIDFromToken(token);
    }

    const contentObjectId = req.query.contentObjectId;

    const conversations = await getConversations(contentObjectId,userId);
    res.json(conversations);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Error handling
app.get('/error', (req, res) => res.send("error logging in"));

app.get('*', function(req, res){
  res.locals.pageTitle ="404 Not Found";
  return res.status(404).render("errors/404");
});

// Start server
app.listen(port , () => console.log('App listening on port ' + port));