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
const { createConversation, getConversations, getConversation } = require('./controllers/conversation');


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

  // Check if the user is authenticated and access token exists
  if (req.isAuthenticated() && accessToken) {
    // Get the authenticated user object
    const user = req.user;

    // Process the access token with user ID
    processToken(accessToken, user._id);

    // Store the access token in the session
    req.session.accessToken = accessToken;
  }

  // Call the next middleware
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

const verifyConversationMiddleware = async (req, res, next) => {
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
    console.error('Error in verifyConversationMiddleware:', error);
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

// Route handler for /conversations
app.get("/conversations", verifyTokenMiddleware, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    // Get the user ID associated with the token
    const userId = await getUserIDFromToken(token);

    const contentObjectId = req.query.contentObjectId;

    const conversations = await getConversations(contentObjectId,userId);
    res.json(conversations);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Route handler for getting a specific conversation
app.get("/conversation/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await getConversation(conversationId);
    res.json(conversation);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Route handler for getting just the messages related to a conversation
app.get("/conversation/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await getConversation(conversationId);
    // Extracting messages with role and content
    const messages = conversation.history.map(entry => {
      return {
          role: entry.message.role,
          content: entry.message.content
      };
    });
    res.json(messages);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Route to handle post of metadata for a conversation
app.post("/conversation/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Find the conversation by its ID
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Iterate over each key-value pair in req.body and update the conversation
    for (const key in req.body) {
      if (Object.hasOwnProperty.call(req.body, key)) {
        const value = req.body[key];
        conversation[key] = value;
      }
    }

    // Save the updated conversation
    await conversation.save();

    res.status(200).json({ message: 'Metadata updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to handle post of rating data, could be expended to handle other data, but currently has to match schema
app.post("/conversation/:conversationId/messages/:messageId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
    const { conversationId, messageId } = req.params;
    const { rating } = req.body;

    // Find the conversation by its ID
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Find the index of the message in the conversation's history array
    const messageIndex = conversation.history.findIndex(message => message._id.toString() === messageId);
    if (messageIndex === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update the rating object for the message
    conversation.history[messageIndex].rating = rating;

    // Save the updated conversation
    await conversation.save();

    res.status(200).json({ message: 'Rating updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route handler for generic open AI Completion, no tracking
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

// Route handler for /openai-completion/<conversationId> with tracking
app.post("/openai-completion/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware, async (req, res) => {
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

    res.status(200).send(response.data || response);
  } catch (error) {
    console.error("Error in /openai-completion route:", error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create a new conversation and get an ID.
app.post("/createConversation", verifyTokenMiddleware, async (req, res) => {
  try {
    // Extract the token from the request
    const token = req.headers['authorization'].split(' ')[1];

    // Call getUserIDFromToken(token) to get userId
    const userId = await getUserIDFromToken(token);

    // Extract contentObject, course, and skillsFramework from the request body
    const { contentObject, course, _skillsFramework } = req.body;

    // Call createConversation(userId, contentObject, course, skillsFramework) to create a new conversation
    const id = await createConversation(userId, contentObject, course, _skillsFramework);

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