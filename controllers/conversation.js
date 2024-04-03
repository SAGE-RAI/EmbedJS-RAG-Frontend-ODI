const Conversation = require('../models/conversation'); // Import the Conversation model

async function createConversation(userId, contentObjectId, courseId, skillsFramework) {
    const conversation = new Conversation({
        userId: userId,
        creationDate: new Date(Date.now()),
        contentObjectId: contentObjectId,
        courseId: courseId,
        _skillsFramework: skillsFramework
    });

    await conversation.save();

    console.log(conversation._id);

    return conversation._id;
}

module.exports = { createConversation };