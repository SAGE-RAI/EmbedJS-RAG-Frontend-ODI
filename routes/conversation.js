import express from 'express';
import { verifyTokenMiddleware, verifyConversationMiddleware, setActiveInstance, canAccessInstance } from '../middleware/auth.js'; // Import your middleware functions
import { getConversation, getConversations, createConversation, getMessages, deleteConversation, updateConversation, postMessage, setRating } from '../controllers/conversation.js'; // Import necessary functions from controllers

const router = express.Router({ mergeParams: true });

// Create a new conversation and get an ID
router.post("/create", verifyTokenMiddleware, canAccessInstance, createConversation);

// Generic route for rendering the chat page or returning conversations as JSON
router.get("/", verifyTokenMiddleware, canAccessInstance, async (req, res) => {
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
router.get("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, getConversation);

// Route to update a specific conversation
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, updateConversation);

// Route to delete a specific conversation
router.delete("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, deleteConversation);

// Route to get messages for a specific conversation
router.get("/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, getMessages);

// Route to post a message to a specific conversation
router.post("/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, postMessage);

// Route to post a message to a specific conversation
router.post("/:conversationId/messages/:messageId", verifyTokenMiddleware, verifyConversationMiddleware, canAccessInstance, setRating);

export default router;