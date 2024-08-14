import { getConversationModel } from '../models/conversation.js';
import { getEmbeddingsModel } from '../models/embeddings.js';
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

        const conversations = await Conversation.find({
            userId,
            entries: { $exists: true, $not: { $size: 0 } }
        });
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
        const Embeddings = getEmbeddingsModel(req.session.activeInstance.id);

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

        let chunks = [];

        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].chunks && messages[i].chunks.length > 0) {
                const chunkIds = messages[i].chunks;

                try {
                    // Fetch pageContent for each chunk ID
                    const embeddings = await Embeddings.find({ u_fld: { $in: chunkIds } }).exec();
                    // Append pageContent to chunks array
                    chunks = embeddings.map(embedding => ({
                        pageContent: embedding.pageContent,
                        metadata: {
                            source: embedding.source,
                            uniqueLoaderId: embedding.l_fld,
                            id: embedding.u_fld
                        }
                    }));
                } catch (error) {
                    console.error("Error retrieving chunks from database:", error);
                    // Handle error appropriately (e.g., return an error response)
                }
                break;
            }
        }
        if (messages.length > 0) {
            const ragQuery = 'This is the users query: "' + message + '". From the conversation history and supporting metadata, assess if you can answer the query. Your response must be in undeclared JSON format. Do not include any thing else in your response, only the JSON. The JSON has two properties: additionalContextRequired (boolean) and resolvedContextQuery (string). If additional context is required to answer the users query, set additionalContextRequired to true and provide a single query derived from the users new query in resolvedContextQuery that includes resolved entities and context suitable for performing RAG (Retrieval-Augmented Generation) context retrieval. If no additional context is needed, set additionalContextRequired to false and leave resolvedContextQuery empty, DO NOT ANSWER THE USERS QUERY!'
            let response = await ragApplication.query(ragQuery, conversationId, chunks, true);
            try {
                response = JSON.parse(response);
            } catch(err) {
                console.error("Could not parse RAG response as JSON");
            }
            if (response.additionalContextRequired) {
                contextQuery = message + ' ' + response.resolvedContextQuery;
                chunks = await ragApplication.getContext(contextQuery);
            }
        } else {
            chunks = await ragApplication.getContext(contextQuery);
        }

        /// Calculate the number of tokens required for the message and chunks
        const messageTokens = encode(message).length;

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
        user.tokens -= messageTokens + chunkTokens;
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

async function setRating(req, res) {
    try {
        const { conversationId, messageId } = req.params; // Extract conversationId and messageId from request params
        const { rating, comment } = req.body; // Extract rating and comment from request body

        // Validate input
        if (!rating || typeof rating !== 'number') {
            return res.status(400).json({ error: 'Invalid rating. Rating must be a number.' });
        }

        // Find the conversation by conversationId
        const Conversation = getConversationModel(req.session.activeInstance.id);
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Find the entry with the given messageId in the conversation
        const entry = conversation.entries.find(e => e._id.toString() === messageId);

        if (!entry) {
            return res.status(404).json({ error: 'Message not found' });
        }

        // Update the rating and comment of the entry
        entry.rating = { rating, comment };

        // Save the updated conversation
        await conversation.save();

        return res.status(200).json({ success: true, message: 'Rating updated successfully' });
    } catch (error) {
        console.error('Error setting rating:', error);
        return res.status(error.status || 500).json({ error: error.message });
    }
}

async function getRatingsReport(req, res) {
    try {
        // Query all conversations
        const Conversation = getConversationModel(req.session.activeInstance.id);
        const conversations = await Conversation.find({});

        const ratingsReport = conversations.reduce((report, conversation) => {
            // Filter entries that have a valid rating
            const ratedEntries = conversation.entries.filter(entry => {
                return entry.rating && typeof entry.rating.rating === 'number';
            });

            ratedEntries.forEach(entry => {
                const { rating, comment } = entry.rating;
                const AIResponse = entry.content.message;

                // Find the previous HUMAN message in the conversation
                const humanMessages = conversation.entries.filter(
                    e => e.content.sender === 'HUMAN'
                );
                const previousHumanMessage = humanMessages.reverse().find(
                    message => message._id !== entry._id
                );

                if (previousHumanMessage) {
                    report.push({
                        dateOfRating: entry.timestamp, // Assuming there's a timestamp field
                        rating,
                        ratingMessage: comment,
                        HuamnMessage: previousHumanMessage.content.message,
                        AIResponse,
                    });
                }
            });

            return report;
        }, []);

        // Send the report as JSON
        res.status(200).json({ ratings: ratingsReport });
    } catch (error) {
        console.error('Error retrieving ratings report:', error);
        res.status(500).json({ error: 'Failed to retrieve ratings report' });
    }
}

export { createConversation, getConversations, getConversation, updateConversation, deleteConversation, getMessages, postMessage, setRating, getRatingsReport };