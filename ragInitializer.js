// ragInitializer.js
import { RAGApplicationBuilder, OpenAi, AzureAIInferenceModel } from 'embedjs' // from '@llm-tools/embedjs';
import { MongoDb } from 'embedjs' // from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from 'embedjs' // from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from 'embedjs' // from '@llm-tools/embedjs/conversations/mongo';
import { OpenAiGenericEmbeddings } from 'embedjs' // from '@llm-tools/embedjs';
// import * as EmbedJS from '@llm-tools/embedjs';
import mongoose from 'mongoose';

// Central configuration for Mongo URI and collection names
const MONGODB_URI = process.env.MONGO_URI;
const COLLECTION_NAME = process.env.EMBEDDINGS_COLLECTION;
const CACHE_COLLECTION_NAME = process.env.EMBEDDINGS_CACHE_COLLECTION;
const CONVERSATIONS_COLLECTION_NAME = process.env.CONVERSATIONS_COLLECTION;

// Function to initialize the RAG application
async function initializeRAGApplication(instance) {
    const instanceId = instance.id;

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
    // console.log(EmbedJS);

await new RAGApplicationBuilder()

    // Get and use models based on config.env settings 
    try {
        let model;
        let embeddingModel; 

        // Use OpenAI model with GENERIC_BASE_URL
        if (process.env.GENERIC_MODEL_NAME) {
            model = new OpenAi({
                modelName: process.env.GENERIC_MODEL_NAME,
                baseURL: process.env.GENERIC_BASE_URL,
                apiKey: process.env.GENERIC_API_KEY
            });
        
        // Use Azure model
        } else if (process.env.AZURE_AI_MODEL_NAME) {
            model = new AzureAIInferenceModel({
                endpointUrl: process.env.AZURE_AI_ENDPOINT_URL,
                apiKey: process.env.AZURE_AI_API_KEY
            });

        // Use default OpenAI models 
        } else if (process.env.OPENAI_MODEL_NAME) {
            model = new OpenAi({
                modelName: process.env.OPENAI_MODEL_NAME,
                apiKey: process.env.OPENAI_API_KEY
            });
        } else {
            throw new Error('No model configuration found in environment variables.');
        }
        
        // Use OpenAI Generic Embeddings
        if (process.env.EMBED_MODEL_NAME) {
            embeddingModel = new OpenAiGenericEmbeddings({
                modelName: process.env.EMBED_MODEL_NAME, 
                apiKey: process.env.EMBED_API_KEY,
                baseURL: process.env.EMBED_BASE_URL,
                dimensions: 768,
            });
        }

        const ragApplicationBuilder = new RAGApplicationBuilder()
            .setModel(model)
            .setTemperature(0.8)
            .setVectorDb(db)
            .setCache(cachedb)
            .setConversations(conversationsdb)
            .setQueryTemplate(instance.systemPrompt);
        
        // Conditionally set the embedding model
        if (embeddingModel) {
            ragApplicationBuilder.setEmbeddingModel(embeddingModel);
        }

        const ragApplication = await ragApplicationBuilder.build();

        console.log('RAG Application is ready with the selected model and MongoDB!');
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