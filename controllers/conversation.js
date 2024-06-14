import mongoose from 'mongoose';
import Conversation from '../models/conversation.js'; // Import the Conversation model

async function createConversation(userId, contentObject, course, skillsFramework) {
    const conversationData = {
        userId: userId
    };

    const constructor = {};
    if (contentObject !== undefined && contentObject !== null) {
        constructor.contentObject = contentObject;
    }

    if (course !== undefined && course !== null) {
        constructor.course = course;
    }

    if (skillsFramework !== undefined && skillsFramework !== null) {
        constructor._skillsFramework = skillsFramework;
    }
    conversationData.constructor = constructor; // Correct the typo: `construnctor` to `constructor`

    const conversation = new Conversation(conversationData);

    await conversation.save();

    // Convert ObjectId to string and set it as conversationId
    const conversationId = conversation._id.toString();

    // Update the conversation with the string version of ObjectId
    await Conversation.findByIdAndUpdate(conversation._id, { $set: { conversationId: conversationId } });

    return conversationId;
}

async function getConversations(contentObjectId, userId) {
    try {
        let query = { 'userId': new mongoose.Types.ObjectId(userId) };
        if (contentObjectId) {
            query['constructor.contentObject.id'] = contentObjectId;
        }
        const conversations = await Conversation.find(query);

        // Filter out conversations with empty or undefined history
        const filteredConversations = conversations.filter(conversation => {
            return conversation.entries && conversation.entries.length > 0;
        });

        return filteredConversations;
    } catch (error) {
        throw new Error('Error fetching conversations: ' + error.message);
    }
}

// Function to fetch conversations by contentObject ID
async function getConversation(conversationId) {
    try {
        const conversation = await Conversation.findOne({
            '_id': new mongoose.Types.ObjectId(conversationId)
        });
        return conversation;
    } catch (error) {
        throw new Error('Error fetching conversation: ' + error.message);
    }
}

// Function to fetch messages from conversation history by conversation ID
async function getMessages(conversationId) {
    try {
        const conversation = await Conversation.findOne({
            '_id': new mongoose.Types.ObjectId(conversationId)
        });
        if (!conversation) {
            throw new Error('Conversation not found.');
        }
        return conversation.entries.map(entry => entry.content);
    } catch (error) {
        throw new Error('Error fetching messages: ' + error.message);
    }
}

async function deleteOldConversations() {
    console.log('finding old conversations');
    try {
      // Calculate the cutoff time (24 hours ago)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find conversations that meet the criteria
      const conversationsToDelete = await Conversation.find({
        creationDate: { $lt: cutoffTime }, // Conversations created over 24 hours ago
        'entries.0': { $exists: false } // Conversations with an empty history
      });

      // Iterate over each conversation document and delete it
      // Iterate over each conversation and delete it
      for (const conversation of conversationsToDelete) {
        await Conversation.deleteOne({ _id: conversation._id });
      }

      console.log(`Deleted ${conversationsToDelete.length} old conversations.`);
    } catch (error) {
      console.error('Error deleting old conversations:', error);
    }
}

async function setRating(conversationId, entryId, rating, message) {
    try {
        // Find the conversation by conversationId
        const conversation = await Conversation.findOne({ _id: conversationId });

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Find the entry with the given entryId in the conversation
        const entry = conversation.entries.find(e => e._id === entryId);

        if (!entry) {
            throw new Error('Entry not found');
        }

        // Update the rating and message of the entry
        entry.rating = { rating, comment: message };

        // Save the updated conversation
        await conversation.save();

        return { success: true, message: 'Rating updated successfully' };
    } catch (error) {
        console.error('Error setting rating:', error);
        return { success: false, error: error.message };
    }
}

//Delete old conversations
deleteOldConversations();
const interval = setInterval(deleteOldConversations, 3600000);

export { createConversation, getConversations, getConversation, getMessages, setRating, deleteOldConversations };