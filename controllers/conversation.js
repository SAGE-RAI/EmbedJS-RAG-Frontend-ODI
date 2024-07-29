import { getConversationModel } from '../models/conversation.js';
import { getUserIDFromToken } from '../controllers/token.js';
import User from '../models/user.js';
import { encode } from 'gpt-tokenizer/model/gpt-4o';

async function createConversation(req, res) {
  try {
      const userId = req.user._id;
      const { contentObject, course, _skillsFramework } = req.body;

      const ragApplication = req.ragApplication;
      if (!ragApplication) {
          throw new Error('RAG Application is not initialized');
      }

      const Conversation = getConversationModel(req.session.activeInstance.id);

      const newConversation = new Conversation({
          userId,
          constructor: { contentObject, course, _skillsFramework },
      });

      newConversation.conversationId = newConversation._id.toString(); // Set conversationId to the string of the _id created

      await newConversation.save();

      res.status(201).json({ id: newConversation._id });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
}

async function getConversations(req, res) {
    try {
        const userId = req.user._id;

        const Conversation = getConversationModel(req.session.activeInstance.id);

        const conversations = await Conversation.find({ userId });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getConversation(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.session.activeInstance.id);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (req.accepts('html')) {
            res.locals.pageTitle = "Chat";
            res.render('pages/chat', { conversation });
        } else {
            res.json(conversation);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateConversation(req, res) {
    const conversationId = req.params.conversationId;
    const updateData = req.body;
    try {
        const Conversation = getConversationModel(req.session.activeInstance.id);

        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedConversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(updatedConversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteConversation(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.session.activeInstance.id);

        const deletedConversation = await Conversation.findByIdAndDelete(conversationId);
        if (!deletedConversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getMessages(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.session.activeInstance.id);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(conversation.entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function postMessage(req, res) {
    try {
        const conversationId = req.params.conversationId;
        const { message, sender } = req.body;
        const ragApplication = req.ragApplication;

        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        if (!sender || sender !== 'HUMAN' || !message) {
            return res.status(400).json({ error: 'Invalid message format. Must include sender "HUMAN" and message.' });
        }

        const Conversation = getConversationModel(req.session.activeInstance.id);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Retrieve the user's token information from the database
        const userId = req.session.user.id; // Assume user ID is stored in session
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let contextQuery = message; // Default contextQuery is just the new query
        const messages = conversation.entries;

        if (messages.length > 0) {
            const humanMessages = messages.filter(msg => msg.content.sender === 'HUMAN');
            const contextMessages = humanMessages.slice(-2);

            if (contextMessages.length === 1) {
                contextQuery = `${contextMessages[0].content.message} ${message}`;
            } else if (contextMessages.length === 2) {
                contextQuery = `${contextMessages[0].content.message} ${contextMessages[1].content.message} ${message}`;
            }
        }

        const chunks = await ragApplication.getContext(contextQuery);
        /// Calculate the number of tokens required for the message and chunks
        const messageTokens = encode(message.message).length;

        let chunkTokens = 0;
        for (const chunk of chunks) {
            chunkTokens += encode(chunk.pageContent).length;
        }

        // Check if the user has enough tokens
        const totalTokensRequired = messageTokens + chunkTokens + 500; // +500 tokens for the response
        //WARNING. This does not take into acount how much of the conversation history is sent on each request!
        if (totalTokensRequired > user.tokens) {
            return res.status(400).json({ error: 'Insufficient tokens to post the message' });
        }

        // Deduct the tokens from user's account and save in the database
        user.tokens -= totalTokensRequired;
        await user.save();

        const ragResponse = await ragApplication.query(message, conversationId, chunks);

        // Subtract the response tokens (multiplied by three) from the user's account
        const responseTokens = ragResponse.content.message.length * 3;
        user.tokens -= responseTokens;
        await user.save();

        res.status(200).json(ragResponse);
    } catch (error) {
        console.error("Error in /:instanceId/completion/:conversationId route:", error);
        res.status(error.status || 500).json({ error: error.message });
    }
}

export { createConversation, getConversations, getConversation, updateConversation, deleteConversation, getMessages, postMessage };