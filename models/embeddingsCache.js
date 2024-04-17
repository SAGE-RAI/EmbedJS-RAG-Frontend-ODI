// models/embeddingsCache.js

const mongoose = require('mongoose');

const embeddingsCacheSchema = new mongoose.Schema({
  loaderId: {
    type: String,
    required: true
  },
  chunkCount: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  loadedDate: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'EmbeddingsCache' // Specify the collection name
});

const EmbeddingsCache = mongoose.model('EmbeddingsCache', embeddingsCacheSchema);

module.exports = EmbeddingsCache;