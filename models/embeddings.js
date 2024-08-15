import mongoose from 'mongoose';

const embeddingsSchema = new mongoose.Schema({
  u_fld: {
    type: String
  },
  l_fld: {
    type: String
  },
  pageContent: {
    type: String
  },
  source: {
    type: String
  }
}, {
  collection: 'Embeddings' // Specify the collection name
});

function getEmbeddingsModel(dbName) {
  const connection = mongoose.connection.useDb(dbName, { useCache: true });

  if (connection.models.Embeddings) {
    return connection.models.Embeddings;
  } else {
    return connection.model('Embeddings', embeddingsSchema);
  }
}

export { getEmbeddingsModel };