// ragInitializer.js

import { RAGApplicationBuilder, OpenAi } from '@llm-tools/embedjs';
import { MongoDb } from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from '@llm-tools/embedjs/conversations/mongo';

// Function to initialize the RAG application
async function initializeRAGApplication(MONGODB_URI, DB_NAME, COLLECTION_NAME, CACHE_COLLECTION_NAME, CONVERSATIONS_COLLECTION_NAME) {
    const db = new MongoDb({
        connectionString: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: COLLECTION_NAME
    });

    const cachedb = new MongoCache({
        uri: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: CACHE_COLLECTION_NAME
    });

    const conversationsdb = new MongoConversations({
        uri: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: CONVERSATIONS_COLLECTION_NAME
    });

    // Initialize the connection to MongoDB Atlas
    //await db.init();
    await cachedb.init();
    await conversationsdb.init();

    try {
        const ragApplication = await new RAGApplicationBuilder()
            .setModel(new OpenAi({ modelName: 'gpt-4o' }))
            .setVectorDb(db)
            .setCache(cachedb)
            .setConversations(conversationsdb)
            .build();

        console.log('RAG Application is ready with OpenAI GPT-4o Turbo and MongoDB!');
        return ragApplication;
    } catch (error) {
        console.error('Failed to setup RAG Application:', error);
        throw error;
    }
}

export { initializeRAGApplication };