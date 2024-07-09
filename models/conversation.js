import mongoose from 'mongoose';

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
  conversationId: {
    type: String
  },
  title: {
    type: String
  },
  constructor: {
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
    }
  },
  entries: [{
    _id: {
      type: String,
    },
    content: {
      sender: {
        type: String,
      },
      message: {
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
    sources: [],
    constructor: {
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

function getConversationModel(dbName) {
  const connection = mongoose.connection.useDb(dbName, { useCache: true });

  if (connection.models.Conversations) {
    return connection.models.Conversations;
  } else {
    return connection.model('Conversations', conversationSchema);
  }
}

export { getConversationModel };