import express from 'express';
import { verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware } from '../middleware.js'; // Import your middleware functions
import Conversation from '../models/conversation.js'; // Import the conversation model
import { getMessages } from '../controllers/conversation.js'; // Import necessary functions from controllers
import OpenAI from 'openai';
import { Template } from 'ejs';

const router = express.Router();

// Open AI
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

router.post("/:conversationId", verifyTokenMiddleware, verifyConversationMiddleware, async (req, res) => {
  try {
      const conversationId = req.params.conversationId;
      const { message, sender } = req.body;

      // Validate the incoming message from the user
      if (!sender || sender !== 'HUMAN' || !message) {
          return res.status(400).json({ error: 'Invalid message format. Must include sender "HUMAN" and message.' });
      }

      let contextQuery = message; // Default contextQuery is just the new query

      // Fetch the last two messages from the conversation with sender "HUMAN"

      const messages = await getMessages(conversationId);

      // Check if there are no messages in the conversation
      if (messages.length === 0) {
          console.log('No messages found in the conversation. Using default contextQuery.');
      } else {
          // Filter out messages sent by "HUMAN"
          const humanMessages = messages.filter(msg => msg.sender === 'HUMAN');

          // Get the last two messages or fewer if there are not enough
          const contextMessages = humanMessages.slice(-2);

          // Construct contextQuery based on existing messages
          if (contextMessages.length === 1) {
              contextQuery = `${contextMessages[0].message} ${message}`;
          } else if (contextMessages.length === 2) {
              contextQuery = `${contextMessages[0].message} ${contextMessages[1].message} ${message}`;
          }
      }

      // Get context embeddings for the contextQuery
      const chunks = await rag.getContext(contextQuery);
      // Use context embeddings along with the new message to query the RAG model
      const ragResponse = await rag.query(message, conversationId, chunks);


      // Return the response to the user
      res.status(200).json(ragResponse);
  } catch (error) {
      console.error("Error in /openai-completion route:", error);
      res.status(error.status || 500).json({ error: error.message });
  }
});

export default function(ragApplication) {
  rag = ragApplication;
  return router;
};