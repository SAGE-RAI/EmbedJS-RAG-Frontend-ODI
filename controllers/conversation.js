const mongoose = require('mongoose');
const Conversation = require('../models/conversation'); // Import the Conversation model

async function createConversation(userId, contentObject, course, skillsFramework) {
    const conversationData = {
        userId: userId
    };

    if (contentObject !== undefined && contentObject !== null) {
        conversationData.contentObject = contentObject;
    }

    if (course !== undefined && course !== null) {
        conversationData.course = course;
    }

    if (skillsFramework !== undefined && skillsFramework !== null) {
        conversationData._skillsFramework = skillsFramework;
    }

    const conversation = new Conversation(conversationData);

    await conversation.save();

    return conversation._id;
}

async function getConversations(contentObjectId, userId) {
    try {
        let query = { 'userId': new mongoose.Types.ObjectId(userId) };
        if (contentObjectId) {
            query['contentObject.id'] = contentObjectId;
        }
        const conversations = await Conversation.find(query);

        // Filter out conversations with empty or undefined history
        const filteredConversations = conversations.filter(conversation => {
            return conversation.history && conversation.history.length > 0;
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
        return conversation.history.map(entry => entry.message);
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
        'history.0': { $exists: false } // Conversations with an empty history
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

//Delete old conversations
deleteOldConversations();
const interval = setInterval(deleteOldConversations, 3600000);

module.exports = { createConversation, getConversations, getConversation, getMessages, deleteOldConversations };