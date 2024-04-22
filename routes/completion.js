const express = require('express');
const router = express.Router();
const { verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware } = require('../middleware'); // Import your middleware functions
const Conversation = require('../models/conversation'); // Import the conversation model

// Open AI
const OpenAI = require("openai");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
var rag;

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
// Change this to take in a single message, get the history from the locally stored and then chat with OpenAI
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
      const conversationId = req.params.conversationId;
      const { message, sender } = req.body;

      // Validate the incoming message from the user
      if (!sender || sender !== 'HUMAN' || !message) {
          return res.status(400).json({ error: 'Invalid message format. Must include sender "HUMAN" and message.' });
      }

      // Get the conversation from the database
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
      }

      const response = await rag.query(message,conversationId);

      // Return the response to the user
      res.status(200).json(response);
  } catch (error) {
      console.error("Error in /openai-completion route:", error);
      res.status(error.status || 500).json({ error: error.message });
  }
});


module.exports = function(ragApplication) {
  rag = ragApplication;
  return router;
};