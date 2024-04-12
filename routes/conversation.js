const express = require('express');
const router = express.Router();
const { verifyTokenMiddleware, verifyConversationMiddleware } = require('../middleware'); // Import your middleware functions
const Conversation = require('../models/conversation'); // Import the Token model

// Import necessary functions from controllers
const { getConversation, createConversation, getMessages } = require('../controllers/conversation');
const { getUserIDFromToken } = require('../controllers/token');

// Create a new conversation and get an ID.
router.post("/create", verifyTokenMiddleware, async (req, res) => {
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
        // Extract contentObject, course, and skillsFramework from the request body
        const { contentObject, course, _skillsFramework } = req.body;

        // Call createConversation(userId, contentObject, course, skillsFramework) to create a new conversation
        const id = await createConversation(userId, contentObject, course, _skillsFramework);

        // Return the conversationId in the response
        res.status(200).json({ id });
    } catch (error) {
        console.error("Error in /conversation/create route:", error);
        res.status(error.status || 500).json({ error: error.message });
    }
});

// Generic route
router.get("/", verifyTokenMiddleware, async (req, res) => {
    const conversation = {};
    res.locals.pageTitle = "Chat";
    res.render('pages/chat', { conversation });
});

// Route handler for getting a specific conversation
router.get("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
    try {
        const conversationId = req.params.conversationId;
        const conversation = await getConversation(conversationId);

        // Check if the request accepts JSON
        if (req.accepts('html')) {
            // Serve page with conversation data
            res.locals.pageTitle = "Chat";
            res.render('pages/chat', { conversation });
        } else {
            // Serve JSON response
            res.json(conversation);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Route to handle post of metadata for a conversation
// Need to update this handle message posting, get the conversation, append the message, trim it so we don't send too many tokens and return the response.
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
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

// Route handler for getting just the messages related to a conversation
router.get("/:conversationId/messages", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
try {
    const conversationId = req.params.conversationId;
    const messages = await getMessages(conversationId);
    res.json(messages);
} catch (error) {
    res.status(500).json({ error: error.message });
}
});

// Route to handle post of rating data, could be expended to handle other data, but currently has to match schema
router.post("/:conversationId/messages/:messageId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
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

module.exports = router;
