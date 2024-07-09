// models/ragInstance.js

import mongoose from 'mongoose';

// Create RAG instance schema and model
const ragInstanceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    dbName: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    public: { type: Boolean, default: false },
}, {
    collection: 'RagInstances' // Specify the collection name
});

const RagInstance = mongoose.model('RagInstance', ragInstanceSchema);

export default RagInstance;