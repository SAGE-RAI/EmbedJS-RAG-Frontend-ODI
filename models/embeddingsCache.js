import mongoose from 'mongoose';

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
  title: {
    type: String
  },
  overrideUrl: {
    type: String
  },
  loadedDate: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['internal', 'external']
  }
}, {
  collection: 'EmbeddingsCache' // Specify the collection name
});

const EmbeddingsCache = mongoose.model('EmbeddingsCache', embeddingsCacheSchema);

export default EmbeddingsCache;