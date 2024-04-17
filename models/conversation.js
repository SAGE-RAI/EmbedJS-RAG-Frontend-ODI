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
    default: Date.now
  },
  course: {
    id: {
      type: String
    },
    title: {
      type: String
    }
  },
  contentObject: {
    id: {
      type: String
    },
    title: {
      type: String
    }
  },
  _skillsFramework: {
    programmeUri: {
      type: String
    },
    programmeTitle: {
      type: String
    }
  },
  plugin: {
    type: String
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
    rating: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: {
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
}, {
  collection: 'Conversations' // Specify the collection name
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;