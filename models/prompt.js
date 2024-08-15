import mongoose from 'mongoose';

// Define the main prompt schema
const promptSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['systemPrompt', 'conversationalRole', 'userQuery', ''],
        default: ''

    },
    description: {
        type: String
    },
    public: {
        type: Boolean,
        default: false,
        required: true
    },
    tags: {
        type: mongoose.Schema.Types.Array,
        default: [],
        required: true
    },
    prompt: {
        type: String
    },
    sharedWith: [sharedWithSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true,
    collection: 'Prompts' // Specify the collection name
});


// Create the model
const Prompt = mongoose.model('Prompt', promptSchema);

export default Prompt;