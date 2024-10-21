import { getConversationModel } from '../models/conversation.js';
import { getEmbeddingsModel } from '../models/embeddings.js';
import { newTransaction } from '../controllers/transaction.js';
import User from '../models/user.js';
import Instance from '../models/instance.js';
import { encode } from 'gpt-tokenizer/model/gpt-4o';

async function createConversation(req, res) {
  try {
      const userId = req.user._id;
      const { contentObject, course, _skillsFramework } = req.body;

      const Conversation = getConversationModel(req.params.instanceId);

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

        const Conversation = getConversationModel(req.params.instanceId);

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
        const Conversation = getConversationModel(req.params.instanceId);

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
        const Conversation = getConversationModel(req.params.instanceId);

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
        const Conversation = getConversationModel(req.params.instanceId);

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
        const Conversation = getConversationModel(req.params.instanceId);

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

        const Conversation = getConversationModel(req.params.instanceId);
        const Embeddings = getEmbeddingsModel(req.params.instanceId);

        let conversation = await Conversation.findById(conversationId);
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
            let response = await ragApplication.silentConversationQuery(ragQuery, null, conversationId, chunks);
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

        const ragResponse = await ragApplication.query(message, conversationId, chunks);

        // ** AI to suggest to talk to tutor **
        // Check if AI response suggests user needs to contact tutor
        const aiMessage = ragResponse.content.message; //gets the response 
        const clarificationQuery = `Does the following response suggest that the AI cannot answer the user's query? Response: "${aiMessage}" Please respond with a JSON object. The JSON should contain a boolean field "aicannotHelp", which should be true if the AI cannot help and false if it can. Example: {"aicannotHelp": true}`;
        let clarificationResponse = await ragApplication.silentConversationQuery(clarificationQuery, null, conversationId, chunks);
        let parsedResponse = {}; // Initialize the parsedResponse variable

        try {
            // Parse the JSON response
            parsedResponse = JSON.parse(clarificationResponse);
        } catch (error) {
            console.error("Failed to parse JSON response from LLM:", error);
        }

        if (parsedResponse.aicannotHelp) {
            try {
                // Fetch instance details
                const instance = await Instance.findById(req.params.instanceId);
                const courseTutorEmail = 'tutor@example.com'; // * I have to replace this with an actualy email!*
                const subject = `Help Request: Conversation History from ${user.name} on Assistant: ${instance ? instance.name : 'Unknown'}`;

                // get the conversation history
                const conversationHistory = [];
                // Iterate through all conversation entries and pair them as Message and Response
                conversation.entries.forEach((entry, index) => {
                    const messageType = entry.content.sender === 'HUMAN' ? 'Message' : 'Response';
                    conversationHistory.push(`${messageType} ${Math.ceil((index + 1) / 2)} (${entry.content.sender}): ${entry.content.message}`);
                });

                const mailtoLink = `mailto:${encodeURIComponent(courseTutorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
                    `Dear Tutor,\n\nThe user ${user.name} has requested assistance with the following query, as the AI assistant was unable to help:\n\n` +
                    `User Query: ${message}\n\nConversation History:\n\n${conversationHistory.join('\n\n')}\n\nKind regards,\nYour ODI AI Assistant`
                )}`;

                // push it to ragResponse
                ragResponse.prompt = "I'm sorry if my response wasn't helpful. Would you like to reach out to your tutor for further support? You can do so by clicking the link below."
                ragResponse.mailtoLink = mailtoLink;
 
            } catch (error) {
                console.error("Error preparing email details:", error);
                return res.status(500).json({ error: "Failed to prepare email details." });
            }
        }

        try {
            // Define a function to handle the transactions sequentially
            const handleTransactions = async () => {
                // Fetch the updated conversation with entries
                const conversation = await Conversation.findById(conversationId);
                const previousId = await getPreviousEntryId(conversation.entries, ragResponse._id);

                // Calculate tokens
                const queryTokens = messageTokens + chunkTokens;
                const responseTokens = ragResponse.content.message.length * 3;

                // Subtract tokens for the new query
                await newTransaction(userId, previousId, "conversations", "New Query", queryTokens * -1);

                // Subtract tokens for the query response
                await newTransaction(userId, ragResponse._id, "conversations", "Query Response", responseTokens * -1);
            };

            // Call the function to handle transactions
            handleTransactions()
                .then(() => {
                })
                .catch(error => {
                    console.error('Error during transaction processing:', error);
                });

        } catch (error) {
            console.error('Transactions error: ' + error);
        }

        res.status(200).json(ragResponse);
    } catch (error) {
        console.error("Error in /:instanceId/completion/:conversationId route:", error);
        res.status(error.status || 500).json({ error: error.message });
    }
}

// *** User to suggest to contact to tutor via email ***
async function emailTutor(req, res) {
    try {
        const conversationId = req.params.conversationId;
        const instanceId = req.params.instanceId;
        const userId = req.session.user.id; // Assume user ID is stored in session
        // Retrieve the user's token information from the database
        
        // Fetch the conversation
        const Conversation = getConversationModel(instanceId);
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch instance details
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Prepare email details
        const courseTutorEmail = 'tutor@example.com'; // * I have to replace this with an actualy email!*
        const subject = `Help Request: Conversation History from ${user.name} on Assistant: ${instance.name || 'Unknown'}`;

        // Get the conversation history
        const conversationHistory = [];
        // Iterate through all conversation entries and pair them as Message and Response
        conversation.entries.forEach((entry, index) => {
            const messageType = entry.content.sender === 'HUMAN' ? 'Message' : 'Response';
            conversationHistory.push(`${messageType} ${Math.ceil((index + 1) / 2)} (${entry.content.sender}): ${entry.content.message}`);
        });

        const mailtoLink = `mailto:${encodeURIComponent(courseTutorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
            `Dear Tutor,\n\nThe user ${user.name} has requested assistance with the following conversation history:\n\n` +
            `${conversationHistory.join('\n\n')}\n\nKind regards,\nYour ODI AI Assistant`
        )}`;

        // Return the email link
        res.status(200).json({
            mailtoLink
        });
    } catch (error) {
        console.error("Error in emailTutor:", error);
        res.status(500).json({ error: error.message });
    }
}

async function getPreviousEntryId(entries,entryId) {
    try {

      const currentIndex = entries.findIndex(entry => entry._id === entryId);

      if (currentIndex === -1) {
        throw new Error('Entry not found');
      }

      // Get the previous entry ID
      const previousEntry = entries[currentIndex - 1];
      return previousEntry ? previousEntry._id : null;
    } catch (error) {
      console.error('Error retrieving previous entry ID:', error);
      return null;
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
        const Conversation = getConversationModel(req.params.instanceId);
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Find the entry with the given messageId in the conversation
        const entry = conversation.entries.find(e => e._id.toString() === messageId);

        if (!entry) {
            return res.status(404).json({ error: 'Message not found' });
        }

        let newRating = false;
        if (!entry.rating.rating) {
            newRating = true;
        }

        // Update the rating and comment of the entry
        entry.rating = { rating, comment };

        // Save the updated conversation
        await conversation.save();

        if (newRating) {
            try {
                // Define a function to handle the transactions sequentially
                const handleTransactions = async () => {
                    const instanceId = req.params.instanceId;
                    const instance = await Instance.findById(req.params.instanceId);
                    // Fetch the updated conversation with entries
                    const ratingReward = instance.ratingReward ? parseInt(instance.ratingReward, 10) : 0;
                    const userId = req.session.user.id;
                    // Subtract tokens for the new query
                    if (rating > 0) {
                        newTransaction(userId, messageId, "ratings", "Rating reward", ratingReward);
                    }
                };

                // Call the function to handle transactions
                handleTransactions()
                    .then(() => {
                    })
                    .catch(error => {
                        console.error('Error during transaction processing:', error);
                    });

            } catch (error) {
                console.error('Transactions error: ' + error);
            }
        }

        return res.status(200).json({ success: true, message: 'Rating updated successfully' });
    } catch (error) {
        console.error('Error setting rating:', error);
        return res.status(error.status || 500).json({ error: error.message });
    }
}

async function getRatingsReport(req, res) {
    try {
        const instanceId = req.params.instanceId;
        // Query all conversations
        const Conversation = getConversationModel(instanceId);
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

export { createConversation, getConversations, getConversation, updateConversation, deleteConversation, getMessages, postMessage, setRating, getRatingsReport, emailTutor };