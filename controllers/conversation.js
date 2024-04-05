const mongoose = require('mongoose');
const Conversation = require('../models/conversation'); // Import the Conversation model

async function createConversation(userId, contentObject, course, skillsFramework) {
    const conversation = new Conversation({
        userId: userId,
        creationDate: new Date(Date.now()),
        contentObject: contentObject,
        course: course,
        _skillsFramework: skillsFramework
    });

    await conversation.save();

    console.log(conversation._id);

    return conversation._id;
}

// Function to fetch conversations by contentObject ID
async function getConversations(contentObjectId,userId) {
    try {
        const conversations = await Conversation.find({
            'contentObject.id': contentObjectId,
            'userId': new mongoose.Types.ObjectId(userId)
        });
        return conversations;
    } catch (error) {
        throw new Error('Error fetching conversations: ' + error.message);
    }
}

// Function to fetch conversations by contentObject ID
async function getConversation(conversationId) {
    console.log(conversationId);
    try {
        const conversation = await Conversation.findOne({
            '_id': new mongoose.Types.ObjectId(conversationId)
        });
        return conversation;
    } catch (error) {
        throw new Error('Error fetching conversation: ' + error.message);
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

      // Delete the found conversations
      const deletePromises = conversationsToDelete.map(conversation => conversation.remove());
      await Promise.all(deletePromises);

      console.log(`Deleted ${conversationsToDelete.length} old conversations.`);
    } catch (error) {
      console.error('Error deleting old conversations:', error);
    }
}

module.exports = { createConversation, getConversations, getConversation, deleteOldConversations };