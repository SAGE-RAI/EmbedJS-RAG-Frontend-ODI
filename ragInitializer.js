// ragInitializer.js

const { RAGApplicationBuilder, SIMPLE_MODELS } = require('@llm-tools/embedjs');
const { MongoDBAtlas } = require('@llm-tools/embedjs/vectorDb/mongoAtlas');
const { MongoCache } = require('@llm-tools/embedjs/cache/mongo');

// Function to initialize the RAG application
async function initializeRAGApplication(MONGODB_URI, DB_NAME, COLLECTION_NAME, CACHE_COLLECTION_NAME) {
    const db = new MongoDBAtlas({
        uri: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: COLLECTION_NAME
    });

    const cachedb = new MongoCache({
        uri: MONGODB_URI,
        dbName: DB_NAME,
        collectionName: CACHE_COLLECTION_NAME
    });

    try {
        const ragApplication = await new RAGApplicationBuilder()
            .setModel(SIMPLE_MODELS.OPENAI_GPT3_TURBO)
            .setVectorDb(db)
            .setCache(cachedb)
            .build();

        console.log('RAG Application is ready with OpenAI GPT-3.5 Turbo and MongoDB!');
        return ragApplication;
    } catch (error) {
        console.error('Failed to setup RAG Application:', error);
        throw error;
    }
}

module.exports = { initializeRAGApplication };