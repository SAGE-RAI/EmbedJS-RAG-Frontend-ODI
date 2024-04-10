const express = require('express');
const router = express.Router();
const { verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware } = require('../middleware'); // Import your middleware functions
const Conversation = require('../models/conversation'); // Import the Token model

// Open AI
const OpenAI = require("openai");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Route handler for generic open AI Completion, no tracking
router.post("/", verifyTokenMiddleware, async (req, res) => {
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
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware, async (req, res) => {
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

module.exports = router;