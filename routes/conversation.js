import express from 'express';
import { verifyTokenMiddleware, verifyConversationMiddleware, setActiveInstance, canAccessInstance, canAdminInstance, ensureAuthenticated } from '../middleware/auth.js'; // Import your middleware functions
import { getConversation, getConversations, createConversation, getMessages, deleteConversation, updateConversation, postMessage, setRating } from '../controllers/conversation.js'; // Import necessary functions from controllers

const router = express.Router({ mergeParams: true });

// Create a new conversation and get an ID
router.post("/create", verifyTokenMiddleware, canAccessInstance, setActiveInstance, createConversation);

// Generic route for rendering the chat page or returning conversations as JSON
router.get("/", verifyTokenMiddleware, canAccessInstance, setActiveInstance, async (req, res) => {
    try {
        if (req.accepts(['json', 'html']) === 'json') {
            return getConversations(req, res);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Chat";
            res.render('pages/chat', { conversation: {} });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route handler for getting a specific conversation
router.get("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, getConversation);
// Route handler for getting a specific conversation

// Route to update a specific conversation
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, updateConversation);

// Route to delete a specific conversation
router.delete("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, deleteConversation);

// Route to get messages for a specific conversation
router.get("/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, getMessages);

// Route to post a message to a specific conversation
router.post("/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, postMessage);

// Route to post a rating to a specific message
router.post("/:conversationId/messages/:messageId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setActiveInstance, setRating);

export default router;