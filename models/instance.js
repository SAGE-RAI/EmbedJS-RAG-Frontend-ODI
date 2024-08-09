import mongoose from 'mongoose';

// Define the schema for the sharedWith field
const sharedWithSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['contentEditor', 'instanceAdmin', ''],
    default: ''
  }
}, {
  _id: false // Prevent Mongoose from creating _id for subdocuments
});

// Define the schema for each item in the suggestions array
const suggestionSchema = new mongoose.Schema({
  shortText: {
    type: String,
    required: true
  },
  fullPrompt: {
    type: String,
    required: true
  }
});

// Define the schema for the rating responses
const ratingResponsesSchema = new mongoose.Schema({
  '1': [String],
  '2': [String],
  '3': [String],
  '4': [String],
  '5': [String]
}, {
  _id: false // Prevent Mongoose from creating _id for subdocuments
});

// Define the main instance schema
const instanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  public: {
    type: Boolean,
    default: false,
    required: true
  },
  systemPrompt: {
    type: String
  },
  sharedWith: [sharedWithSchema],
  suggestions: [suggestionSchema],
  ratingResponses: ratingResponsesSchema,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'Instances' // Specify the collection name
});

// Create the model
const Instance = mongoose.model('Instance', instanceSchema);

export default Instance;