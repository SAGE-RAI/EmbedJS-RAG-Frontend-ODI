import RagInstance from '../models/ragInstance.js';
import { initializeRAGApplication } from '../ragInitializer.js';
import { getUserIDFromToken, verifyToken } from '../controllers/token.js';
import { getConversationModel } from '../models/conversation.js';

const ragCache = new Map(); // In-memory cache for RAG applications

export const setRagLocals = (req, res, next) => {
    if (req.session.activeRagInstance) {
        res.locals.activeRagInstance = req.session.activeRagInstance;
        res.locals.ragId = req.session.activeRagInstance.id;
    }
    next();
}

// Middleware to set and initialize the active RAG instance
export const setActiveRag = async (req, res, next) => {
    try {
        const ragId = req.params.ragId;

        const ragInstance = await RagInstance.findById(ragId);

        if (!ragInstance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }

        // Check if the RAG application is already in the cache
        let ragApplication = ragCache.get(ragId);

        // Check if the RAG application is already initialized and the same as the requested RAG ID
        if (req.session.activeRagInstance?.id === ragId && ragApplication) {
            req.session.activeRagInstance = ragInstance;
            req.ragApplication = ragApplication;
            res.locals.activeRagInstance = ragInstance;
            res.locals.ragId = ragId;
            return next();
        }

        // Initialize the RAG application
        ragApplication = await initializeRAGApplication(ragInstance);
        ragCache.set(ragId, ragApplication);

        // Store the initialized RAG application and its ID in the session
        req.session.activeRagInstance = ragInstance;
        req.ragApplication = ragApplication;
        res.locals.activeRagInstance = ragInstance;
        res.locals.ragId = ragId;

        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to check if the user can access the RAG instance
export const canAccessRag = async (req, res, next) => {
    try {
        const ragId = req.params.ragId;
        const userId = req.user._id;

        if (!userId) {
            console.log("no user id");
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const ragInstance = await RagInstance.findById(ragId);

        if (!ragInstance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }

        // Check if the user has access to this RAG instance
        const hasAccess = ragInstance.createdBy.equals(userId) || ragInstance.sharedWith.includes(userId) || ragInstance.public;

        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        req.session.activeRagInstance = ragInstance;
        next();
    } catch (error) {
        next(error);
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

        const Conversation = getConversationModel(req.session.activeRagInstance.dbName);

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
    const ragInstance = await RagInstance.findById(req.params.ragId);
    if (req.isAdmin || ragInstance.createdBy.equals(req.user._id)) {
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