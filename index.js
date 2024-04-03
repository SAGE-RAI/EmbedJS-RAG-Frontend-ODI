// Load environment variables securely
require("dotenv").config({ path: "./config.env" });

// MongoDB setup
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection;

// Database models
const User = require('./models/user'); // Import the User model
const Token = require('./models/token'); // Import the Token model
const Conversation = require('./models/conversation'); // Import the Token model

// Database controllers
const { retrieveOrCreateUser } = require('./controllers/user');
const { processToken, verifyToken, getUserIDFromToken } = require('./controllers/token');
const { createConversation } = require('./controllers/conversation');


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

// Define the middleware function for token verification
const verifyTokenMiddleware = async (req, res, next) => {
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
    // If token is valid, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Error in token verification middleware:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

const verifyTokenAndConversationMiddleware = async (req, res, next) => {
  try {
    // Extract the token from the request header
    const token = req.headers['authorization'].split(' ')[1];

    // Extract the conversation ID from the request params
    const conversationId = req.params.conversationId;

    // Get the user ID associated with the token
    const userId = await getUserIDFromToken(token);

    // Check if the conversation ID belongs to the user
    const conversation = await Conversation.findOne({ _id: conversationId, userId: userId });

    // If conversation not found or doesn't belong to the user, return 401 Unauthorized
    if (!conversation) {
      return res.status(401).json({ error: 'Unauthorized: Conversation not found or does not belong to the user' });
    }

    // If both token and conversation are verified, proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error in verifyTokenAndConversationMiddleware:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Middleware function to process messages and record conversation history
const processMessagesMiddleware = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId;

    // Retrieve the conversation object from the database
    let conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // If history is not defined (new conversation), initialize it as an empty array
    if (!conversation.history) {
      conversation.history = [];
    }

    // Extract messages from request body
    const messages = req.body.messages;
    const block = req.body.currentBlock;
    console.log(req.body);
    const context = {};
    context.block = block;

    // Filter out messages that are already present in the conversation history
    const newMessages = messages.filter(message => {
      // Check if the message content is already in the conversation history
      return !conversation.history.some(entry => entry.message.content === message.content);
    });

    // If there are new messages, add them to the conversation history
    if (newMessages.length > 0) {
      // Create new history entries for new messages
      const newHistoryEntries = newMessages.map(message => ({
        message: message,
        context: context
      }));

      // Update the conversation object with the new history entries
      conversation.history = conversation.history.concat(newHistoryEntries);
      await conversation.save();
    }

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error processing messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

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

// Route handler for /openai-completion/<conversationId>
app.post("/openai-completion/:conversationId", verifyTokenAndConversationMiddleware, processMessagesMiddleware, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    // Extract block from req.body and remove it
    const { currentBlock, ...body } = req.body;

    // Proceed to chat with OpenAI
    const response = await openai.chat.completions.create({
      ...body,
    });

    // Update the conversation object with the response in the history
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Add the OpenAI response as a new message in the conversation history
    const newMessage = { message: response.choices[0].message };
    conversation.history.push(newMessage);
    await conversation.save();

    // Update the OpenAI response to include the newly inserted message's _id
    const insertedMessage = conversation.history[conversation.history.length - 1];
    response.choices[0].message.id = insertedMessage._id;

    console.log(JSON.stringify(response.choices[0].message));

    res.status(200).send(response.data || response);
  } catch (error) {
    console.error("Error in /openai-completion route:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});



app.post("/openai-completion", verifyTokenMiddleware, async (req, res) => {
  try {
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

app.post("/createConversation", verifyTokenMiddleware, async (req, res) => {
  try {
    // Extract the token from the request
    const token = req.headers['authorization'].split(' ')[1];

    // Call getUserIDFromToken(token) to get userId
    const userId = await getUserIDFromToken(token);

    // Extract contentObjectId, courseId, and skillsFramework from the request body
    const { contentObjectId, courseId, _skillsFramework } = req.body;

    // Call createConversation(userId, contentObjectId, courseId, skillsFramework) to create a new conversation
    const id = await createConversation(userId, contentObjectId, courseId, _skillsFramework);

    // Return the conversationId in the response
    res.status(200).json({ id });
  } catch (error) {
    console.error("Error in /createConversation route:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});


app.get('/profile', ensureAuthenticated, function(req, res) {
  res.locals.pageTitle ="Profile page";
  res.render('pages/profile');
});

// Error handling
app.get('/error', (req, res) => res.send("error logging in"));

app.get('*', function(req, res){
  res.locals.pageTitle ="404 Not Found";
  return res.status(404).render("errors/404");
});

// Start server
app.listen(port , () => console.log('App listening on port ' + port));