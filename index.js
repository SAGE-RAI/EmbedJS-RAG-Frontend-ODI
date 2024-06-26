// Load environment variables securely
import './loadEnv.js';
// MongoDB setup
import mongoose from 'mongoose';
import { __dirname } from './utils.js'; // Import the helper

// Read MongoDB URI and database name from environment variables
const mongoURI = process.env.MONGO_URI;
const mongoDB = process.env.MONGO_DB;
const embeddingsCollection = process.env.EMBEDDINGS_COLLECTION;
const embeddingsCacheCollection = process.env.EMBEDDINGS_CACHE_COLLECTION;
const conversationsCollection = process.env.CONVERSATIONS_COLLECTION;

// Connect to MongoDB
mongoose.connect(mongoURI, { dbName: mongoDB });

const db = mongoose.connection;

// Database controllers
import { retrieveOrCreateUser } from './controllers/user.js';
import { processToken, getUserIDFromToken } from './controllers/token.js';
import { getConversations } from './controllers/conversation.js';
import { verifyTokenMiddleware } from './middleware.js'; // Import your middleware functions

// Check MongoDB connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', function() {
  console.log("Connected to MongoDB database");
});

import { initializeRAGApplication } from './ragInitializer.js';

// Express setup
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from './passport.js'; // Require the passport module

//Routes import
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import { router as ragRouter, setRAGApplication } from './routes/rag.js';
import conversationRoutes from './routes/conversation.js';
import completionRoutes from './routes/completion.js';

const app = express();
const port = process.env.PORT || 3080;

app.set('view engine', 'ejs');
app.use(cors());

// Routes
app.use(express.static(__dirname + '/public')); // Public directory

// Middleware for logging
import logger from 'morgan';
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

// This function checks for a new token after a successful login, it doesn't handle the token during login!!!
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

app.get('/', function(req, res) {
  if (req.session.passport) {
    res.redirect("/conversation");
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
app.use('/admin', adminRoutes);

// Use authentication routes
app.use('/conversation', conversationRoutes);

// Route handler for /conversations
app.get("/conversations", verifyTokenMiddleware, async (req, res) => {
  try {
    let userId = "";
    if (!req.isAuthenticated()) {
      // Extract the token from the request header
      const token = req.headers['authorization'].split(' ')[1];
      // Get the user ID associated with the token
      userId = await getUserIDFromToken(token);
    } else {
      userId = res.locals.user._id;
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

initializeRAGApplication(mongoURI, mongoDB, embeddingsCollection, embeddingsCacheCollection, conversationsCollection)
    .then(ragApplication => {
      setRAGApplication(ragApplication);
      // Use rag routes
      app.use('/rag', ragRouter);
      // Use authentication routes
      app.use('/openai-completion', completionRoutes(ragApplication));
      // Define wildcard route after other routes
      app.get('*', function(req, res){
        res.locals.pageTitle ="404 Not Found";
        return res.status(404).render("errors/404");
      });
      // Start server
      app.listen(port , () => console.log('App listening on port ' + port));
    })
    .catch(error => {
      console.error('Failed to initialize RAG Application:', error);
      process.exit(1);
});