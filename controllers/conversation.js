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

module.exports = { createConversation, getConversations, getConversation };