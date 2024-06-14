// Import necessary functions from controllers
import { verifyToken, getUserIDFromToken } from './controllers/token.js';
import Conversation from './models/conversation.js'; // Import the Token model

// Define the middleware function for token verification
const verifyTokenMiddleware = async (req, res, next) => {
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

const verifyConversationMiddleware = async (req, res, next) => {
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

    // Extract the conversation ID from the request params
    const conversationId = req.params.conversationId;

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

// Middleware function to process messages and record conversation history
const processMessagesMiddleware = async (req, res, next) => {
  try {
    const conversationId = req.params.conversationId;

    // Retrieve the conversation object from the database
    let conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // If history is not defined (new conversation), initialize it as an empty array
    if (!conversation.history) {
      conversation.history = [];
    }

    // Extract messages from request body
    const messages = req.body.messages;
    const block = req.body.currentBlock;
    const context = {};
    context.block = block;

    // Filter out messages that are already present in the conversation history
    const newMessages = messages.filter(message => {
      // Check if the message content is already in the conversation history
      return !conversation.history.some(entry => entry.message.content === message.content);
    });

    // If there are new messages, add them to the conversation history
    if (newMessages.length > 0) {
      // Create new history entries for new messages
      const newHistoryEntries = newMessages.map(message => ({
        message: message,
        context: context
      }));

      // Update the conversation object with the new history entries
      conversation.history = conversation.history.concat(newHistoryEntries);
      await conversation.save();
    }

    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Error processing messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export { verifyTokenMiddleware, verifyConversationMiddleware, processMessagesMiddleware };