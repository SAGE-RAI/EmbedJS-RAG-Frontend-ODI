import './loadEnv.js';
import mongoose from 'mongoose';
import path from 'path';
import { __dirname } from './utils.js';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from './passport.js';
import logger from 'morgan';
import { retrieveOrCreateUser } from './controllers/user.js';
import { setActiveInstance, canAccessInstance, setInstanceLocals } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import instancesRoutes from './routes/instances.js';
import instanceRoutes from './routes/instance.js';
import sourceRoutes from './routes/source.js';
import conversationRoutes from './routes/conversation.js';
import { deleteOldTokens } from './controllers/token.js';

// Environment variables
const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 3080;

// Connect to MongoDB
mongoose.connect(mongoURI, { dbName: process.env.MONGO_DB });

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

db.once('open', () => {
  console.log("Connected to MongoDB database");
  //Delete old tokens
  deleteOldTokens();
  const interval = setInterval(deleteOldTokens, 3600000);

  // Express setup
  const app = express();
  app.set('view engine', 'ejs');
  app.use(cors());
  app.use(express.static(__dirname + '/public'));
  app.use('/images', express.static(path.join(__dirname, 'public/images')));
  app.use(logger('dev'));
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

  // Middleware to ensure authentication
  app.use(async function(req, res, next) {
    const user = req.session.passport ? req.session.passport.user : req.session.user;
    if (user) {
      res.locals.user = await retrieveOrCreateUser(user);
    } else {
      res.locals.user = user;
    }
    next();
  });

  app.use((req, res, next) => {
    const accessToken = req.query.accessToken;
    if (accessToken) {
      req.session.accessToken = accessToken;
    }
    if (req.isAuthenticated() && req.session.accessToken) {
      processToken(req.session.accessToken, res.locals.user._id);
    }
    next();
  });

  // Middleware to set locals
  app.use(setInstanceLocals);

  app.get('/', (req, res) => {
    if (req.session.passport) {
      res.redirect("/instances");
    } else {
      res.locals.pageTitle = "ODI Labs AI Assistant";
      res.render('pages/home');
    }
  });

  app.get('/about', (req, res) => {
      res.locals.pageTitle = "Privacy and Terms";
      res.render('pages/about');
  });

  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);

  app.use('/instances', instancesRoutes);
  app.use('/instances/:instanceId', (req, res, next) => {
    res.locals.activeInstance = { id: req.params.instanceId };
    res.locals.instanceId = req.params.instanceId;
    next();
  });

  app.use('/instances/:instanceId/sources', sourceRoutes);
  app.use('/instances/:instanceId/conversations', conversationRoutes);
  app.use('/instances/:instanceId', instanceRoutes);


  app.get('*', function(req, res, next){
    const page = {
      title: "404 Not Found"
    };
    console.log(`Route not found: ${req.originalUrl}`);
    res.locals.page = page;
    const error = new Error("Not Found");
    error.status = 404;
    next(error);
  });


  // Error handling middleware
  app.use((err, req, res, next) => {
    // Default status code for unhandled errors
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    // Check if the error has a specific status code and message
    if (err.status) {
        statusCode = err.status;
        errorMessage = err.message;
    }
    res.locals.pageTitle = "Error";

    // Log the error stack trace
    //console.error(err.stack);

    // Content negotiation based on request Accept header
    const acceptHeader = req.get('Accept');

    if (acceptHeader === 'application/json') {
        // Respond with JSON
        res.status(statusCode).json({ message: errorMessage });
    } else {
        // Respond with HTML (rendering an error page)
        res.status(statusCode).render('errors/error', { statusCode, errorMessage });
    }
  });

  app.listen(port, () => console.log(`App listening on port ${port}`));
});