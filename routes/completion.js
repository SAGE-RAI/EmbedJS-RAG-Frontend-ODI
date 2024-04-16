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
// Change this to take in a single message, get the history from the locally stored and then chat with OpenAI
router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
      const conversationId = req.params.conversationId;
      const { role, content } = req.body;

      // Validate the incoming message from the user
      if (!role || role !== 'user' || !content) {
          return res.status(400).json({ error: 'Invalid message format. Must include role "user" and content.' });
      }

      // Get the conversation from the database
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
          return res.status(404).json({ error: 'Conversation not found' });
      }

      // Add the user's message to the conversation history
      const newMessage = {
          message: {
              role: role,
              content: content
          }
      };
      conversation.history.push(newMessage);

      // Call OpenAI to get the response
      const response = await openai.chat.completions.create({
          model: req.body.model || 'gpt-3.5-turbo',
          messages: conversation.history.map(entry => entry.message),
          temperature: req.body.temperature || 0.7,
          max_tokens: req.body.max_tokens || 800,
          top_p: req.body.top_p || 1,
          frequency_penalty: req.body.frequency_penalty || 0,
          presence_penalty: req.body.presence_penalty || 0,
          stop: req.body.stop_tokens || null
      });

      // Add OpenAI response to the conversation history
      const openaiResponse = response.choices[0].message;
      conversation.history.push({ message: openaiResponse });

      // Save the updated conversation to the database
      await conversation.save();

      // Update the OpenAI response to include the newly inserted message's _id
      const insertedMessage = conversation.history[conversation.history.length - 1];

      // Return the response to the user
      res.status(200).json(insertedMessage);
  } catch (error) {
      console.error("Error in /openai-completion route:", error);
      res.status(error.status || 500).json({ error: error.message });
  }
});


module.exports = router;