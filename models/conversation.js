// models/conversation.js

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creationDate: {
    type: Date,
    required: true
  },
  courseId: {
    type: String
  },
  contentObjectId: {
    type: String
  },
  _skillsFramework: {
    programmeUri: {
      type: String
    },
    programmeTitle: {
      type: String
    }
  },
  history: [{
    message: {
      role: {
        type: String,
      },
      content: {
        type: String,
      }
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    context: {
      block: {
        id: {
          type: String
        },
        title: {
          type: String
        }
      }
    }
  }]
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;