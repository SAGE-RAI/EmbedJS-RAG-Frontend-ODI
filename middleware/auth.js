import Instance from '../models/instance.js';
import { initializeRAGApplication } from '../ragInitializer.js';
import { getUserIDFromToken, verifyToken } from '../controllers/token.js';
import { getConversationModel } from '../models/conversation.js';

const instanceCache = new Map(); // In-memory cache for RAG applications
const CACHE_EXPIRATION_TIME = 60 * 60 * 1000; // 1 hour in milliseconds

export const setInstanceLocals = (req, res, next) => {
    if (req.session.activeInstance) {
        res.locals.activeInstance = req.session.activeInstance;
        res.locals.instanceId = req.session.activeInstance.id;
    }
    next();
};

// Function to remove the active instance from the cache
export const removeActiveInstanceFromCache = (instanceId) => {
    if (instanceCache.has(instanceId)) {
        instanceCache.delete(instanceId);
        console.log(`Instance ${instanceId} removed from cache.`);
    } else {
        console.log(`Instance ${instanceId} not found in cache.`);
    }
};

// Function to clear the entire instance cache
export const clearInstanceCache = () => {
    instanceCache.clear();
    console.log('All instances removed from cache.');
};

// Function to clean up expired instances
export const cleanUpExpiredInstances = () => {
    const now = Date.now();
    for (const [instanceId, { ragApplication, expirationTime }] of instanceCache.entries()) {
        if (now > expirationTime) {
            instanceCache.delete(instanceId);
            console.log(`Instance ${instanceId} expired and removed from cache.`);
        }
    }
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
        let cacheEntry = instanceCache.get(instanceId);

        // Check if the RAG application is already initialized and the same as the requested RAG ID
        if (req.session.activeInstance?.id === instanceId && cacheEntry) {
            req.session.activeInstance = instance;
            req.ragApplication = cacheEntry.ragApplication;
            res.locals.activeInstance = instance;
            res.locals.instanceId = instanceId;
            return next();
        }

        // Initialize the RAG application
        const ragApplication = await initializeRAGApplication(instance);
        const expirationTime = Date.now() + CACHE_EXPIRATION_TIME;

        // Store the initialized RAG application and its expiration time in the cache
        instanceCache.set(instanceId, { ragApplication, expirationTime });

        // Store the initialized RAG application and its ID in the session
        req.session.activeInstance = instance;
        req.session.activeInstance.id = instance._id;
        req.ragApplication = ragApplication;
        res.locals.activeInstance = instance;
        res.locals.instanceId = instanceId;

        next();
    } catch (error) {
        next(error);
    }
};

// Set up a periodic cleanup task
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup interval (e.g., every hour)
setInterval(cleanUpExpiredInstances, CLEANUP_INTERVAL);

// Middleware to check if the user can access the instance
export const canAccessInstance = async (req, res, next) => {
    try {
        const instanceId = req.params.instanceId;

        if (!req.user) {
            const error = new Error("Unathorised");
            error.status = 401;
            throw error;
        }

        const userId = req.user._id;
        const userEmail = req.user.email;

        if (!userId || !userEmail) {
            const error = new Error("Unathorised");
            error.status = 401;
            throw error;
        }

        const instance = await Instance.findById(instanceId);

        if (!instance) {
            const error = new Error("Instance not found");
            error.status = 404;
            throw error;
        }

        // Check if the user has access to this instance
        const userAccess = instance.sharedWith.find(user => user.email === userEmail);
        const hasAccess = instance.createdBy.equals(userId) || userAccess || instance.public;

        if (!hasAccess) {
            const error = new Error("Permission denied");
            error.status = 403;
            throw error;
        }

        req.session.activeInstance = instance;
        req.session.activeInstance.id = instance._id;
        req.userAccess = userAccess;
        next();
    } catch (error) {
        next(error);
    }
};

// Middleware to check if the user has source editor access
export const canEditSources= async (req, res, next) => {
    const instanceId = req.params.instanceId;
    const userId = req.user._id;
    const userEmail = req.user.email;

    if (!userId || !userEmail) {
        const error = new Error("Unathorised");
        error.status = 401;
        throw error;
    }

    const instance = await Instance.findById(instanceId);

    const isOwner = instance.createdBy.equals(userId);
    const userAccess = req.userAccess;
    if (isOwner || (userAccess && userAccess.role === 'contentEditor')) {
        next();
    } else {
        const error = new Error("Permission denied");
        error.status = 403;
        throw error;
    }
};

// Middleware to check if the user has instance admin access
export const canAdminInstance = async (req, res, next) => {
    const instanceId = req.params.instanceId;
    const userId = req.user._id;
    const userEmail = req.user.email;

    if (!userId || !userEmail) {
        const error = new Error("Unathorised");
        error.status = 401;
        return next(error)
    }

    const adminEmails = process.env.ADMIN ? process.env.ADMIN.split(',') : [];

    if (adminEmails.includes(req.user.email)) {
        return next();
    }

    const instance = await Instance.findById(instanceId);

    const isOwner = instance.createdBy.equals(userId);

    const userAccess = req.userAccess;
    if (isOwner || (userAccess && userAccess.role === 'instanceAdmin')) {
        return next();
    } else {
        const error = new Error("Permission denied");
        error.status = 403;
        return next(error);
    }
};

export const verifyConversationMiddleware = async (req, res, next) => {
    try {
        let userId = "";
        if (!req.isAuthenticated()) {
            const error = new Error("Unathorised");
            error.status = 401;
            throw error;
        } else {
            userId = req.user._id;
        }

        // Extract the conversation ID from the request params
        const conversationId = req.params.conversationId;

        const Conversation = getConversationModel(req.session.activeInstance._id);

        // Check if the conversation ID belongs to the user
        const conversation = await Conversation.findOne({ _id: conversationId, userId: userId });

        // If conversation not found or doesn't belong to the user, return 401 Unauthorized
        if (!conversation) {
            const error = new Error("Unauthorized: Conversation not found or does not belong to the user");
            error.status = 401;
            throw error;
        }

        // If both token and conversation are verified, proceed to the next middleware or route handler
        next();
    } catch (error) {
        console.log(error);
        next(error);
    }
};

export const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        // Get the full requested path
        const requestedPath = encodeURIComponent(req.originalUrl);

        // Redirect to the authentication page with the requested path as a query parameter
        return res.redirect(`/auth/django?path=${requestedPath}`);
    }
};

export const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/google');
    }

    // Get list of admin emails from environment variable
    const adminEmails = process.env.ADMIN ? process.env.ADMIN.split(',') : [];

    if (adminEmails.includes(req.user.email)) {
        req.isAdmin = true;
        next();
    } else {
        const error = new Error("Permission denied");
        error.status = 403;
        throw error;
    }
};

export const checkOwnership = async (req, res, next) => {
    const instance = await Instance.findById(req.params.instanceId);
    if (req.isAdmin || instance.createdBy.equals(req.user._id)) {
        return next();
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