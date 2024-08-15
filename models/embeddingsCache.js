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
  tokens: {
    type: Number
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
  }
}, {
  collection: 'EmbeddingsCache' // Specify the collection name
});

function getEmbeddingsCacheModel(dbName) {
  const connection = mongoose.connection.useDb(dbName, { useCache: true });

  if (connection.models.EmbeddingsCache) {
    return connection.models.EmbeddingsCache;
  } else {
    return connection.model('EmbeddingsCache', embeddingsCacheSchema);
  }
}

export { getEmbeddingsCacheModel };