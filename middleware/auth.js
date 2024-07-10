import Instance from '../models/instance.js';
import { initializeRAGApplication } from '../ragInitializer.js';
import { getUserIDFromToken, verifyToken } from '../controllers/token.js';
import { getConversationModel } from '../models/conversation.js';

const instanceCache = new Map(); // In-memory cache for RAG applications

export const setInstanceLocals = (req, res, next) => {
    if (req.session.activeInstance) {
        res.locals.activeInstance = req.session.activeInstance;
        res.locals.instanceId = req.session.activeInstance.id;
    }
    next();
};

// Middleware to set and initialize the active RAG instance
export const setActiveInstance = async (req, res, next) => {
    try {
        const instanceId = req.params.instanceId;
        const instance = await Instance.findById(instanceId);

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Check if the RAG application is already in the cache
        let ragApplication = instanceCache.get(instanceId);

        // Check if the RAG application is already initialized and the same as the requested RAG ID
        if (req.session.activeInstance?.id === instanceId && ragApplication) {
            req.session.activeInstance = instance;
            req.ragApplication = ragApplication;
            res.locals.activeInstance = instance;
            res.locals.instanceId = instanceId;
            return next();
        }

        // Initialize the RAG application
        ragApplication = await initializeRAGApplication(instance);
        instanceCache.set(instanceId, ragApplication);

        // Store the initialized RAG application and its ID in the session
        req.session.activeInstance = instance;
        req.ragApplication = ragApplication;
        res.locals.activeInstance = instance;
        res.locals.instanceId = instanceId;

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to check if the user can access the instance
export const canAccessInstance = async (req, res, next) => {
    try {
        const instanceId = req.params.instanceId;
        const userId = req.user._id;
        const userEmail = req.user.email;

        if (!userId || !userEmail) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const instance = await Instance.findById(instanceId);

        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Check if the user has access to this instance
        const userAccess = instance.sharedWith.find(user => user.email === userEmail);
        const hasAccess = instance.createdBy.equals(userId) || userAccess || instance.public;

        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.session.activeInstance = instance;
        req.userAccess = userAccess;
        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to check if the user has source editor access
export const canEditSources = (req, res, next) => {
    const userAccess = req.userAccess;
    if (req.isAdmin || req.session.activeInstance.createdBy.equals(req.user._id) || (userAccess && userAccess.role === 'contentEditor')) {
        next();
    } else {
        res.status(403).send('Permission denied');
    }
};

// Middleware to check if the user has instance admin access
export const canAdminInstance = (req, res, next) => {
    const userAccess = req.userAccess;
    if (req.isAdmin || req.session.activeInstance.createdBy.equals(req.user._id) || (userAccess && userAccess.role === 'instanceAdmin')) {
        next();
    } else {
        res.status(403).send('Permission denied');
    }
};


export const verifyConversationMiddleware = async (req, res, next) => {
    try {
        let userId = "";
        if (!req.isAuthenticated()) {
            // Extract the token from the request header
            const token = req.headers['authorization'].split(' ')[1];
            // Get the user ID associated with the token
            userId = await getUserIDFromToken(token);
        } else {
            userId = req.user._id;
        }

        // Extract the conversation ID from the request params
        const conversationId = req.params.conversationId;

        const Conversation = getConversationModel(req.session.activeInstance.dbName);

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

export const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }
    if (req.session.authMethod === 'google') {
        req.isAdmin = true;
        next();
    } else {
        res.status(403).send('Permission denied');
    }
};

export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

export const checkOwnership = async (req, res, next) => {
    const instance = await Instance.findById(req.params.instanceId);
    if (req.isAdmin || instance.createdBy.equals(req.user._id)) {
        next();
    } else {
        res.status(403).send('Permission denied');
    }
};

// Define the middleware function for token verification
export const verifyTokenMiddleware = async (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
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