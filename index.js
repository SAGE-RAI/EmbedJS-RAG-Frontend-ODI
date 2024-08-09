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
      res.locals.pageTitle = "ODI AI Assistant";
      res.render('pages/auth');
    }
  });

  app.get('/about', (req, res) => {
      res.locals.pageTitle = "Privacy and Terms";
      res.render('pages/about');
  });

  app.use('/auth', authRoutes);
  app.use('/admin', adminRoutes);
  app.use('/instances', instancesRoutes);

  app.use('/instances/:instanceId', canAccessInstance, (req, res, next) => {
    setActiveInstance(req, res, next);
  });

  app.use('/instances/:instanceId/', instanceRoutes);
  app.use('/instances/:instanceId/sources', sourceRoutes);
  app.use('/instances/:instanceId/conversations', conversationRoutes);

  app.get('*', (req, res) => {
    res.locals.pageTitle = "404 Not Found";
    res.status(404).render("errors/404");
  });

  app.listen(port, () => console.log(`App listening on port ${port}`));
});