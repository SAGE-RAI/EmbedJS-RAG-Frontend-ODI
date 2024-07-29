import { RAGApplicationBuilder, OpenAi } from '@llm-tools/embedjs';
import { MongoDb } from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from '@llm-tools/embedjs/conversations/mongo';
import mongoose from 'mongoose';

// Central configuration for Mongo URI and collection names
const MONGODB_URI = process.env.MONGO_URI;
const COLLECTION_NAME = process.env.EMBEDDINGS_COLLECTION;
const CACHE_COLLECTION_NAME = process.env.EMBEDDINGS_CACHE_COLLECTION;
const CONVERSATIONS_COLLECTION_NAME = process.env.CONVERSATIONS_COLLECTION;

// Function to initialize the RAG application
async function initializeRAGApplication(instanceId) {

    const db = new MongoDb({
        connectionString: MONGODB_URI,
        dbName: instanceId,
        collectionName: COLLECTION_NAME
    });

    const cachedb = new MongoCache({
        uri: MONGODB_URI,
        dbName: instanceId,
        collectionName: CACHE_COLLECTION_NAME
    });

    const conversationsdb = new MongoConversations({
        uri: MONGODB_URI,
        dbName: instanceId,
        collectionName: CONVERSATIONS_COLLECTION_NAME
    });

    // Initialize the connection to MongoDB Atlas
    await cachedb.init();
    await conversationsdb.init();

    try {
        const ragApplication = await new RAGApplicationBuilder()
            .setModel(new OpenAi({ modelName: 'gpt-4o-mini' }))
            .setVectorDb(db)
            .setCache(cachedb)
            .setConversations(conversationsdb)
            .build();

        console.log('RAG Application is ready with OpenAI gpt-4o-mini Turbo and MongoDB!');
        return ragApplication;
    } catch (error) {
        console.error('Failed to setup RAG Application:', error);
        throw error;
    }
}

function connectToRagDatabase(dbName) {
    const connection = mongoose.createConnection(MONGODB_URI, {
        dbName: dbName,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    return connection;
}

export { initializeRAGApplication, connectToRagDatabase };