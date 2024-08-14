// ragInitializer.js
import { RAGApplicationBuilder, OpenAi, AzureAIInferenceModel } from '@llm-tools/embedjs';
import { MongoDb } from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from '@llm-tools/embedjs/conversations/mongo';
import { OpenAiGenericEmbeddings } from '@llm-tools/embedjs';
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

    // Function to merge instance and environment config
    function getConfigFromInstanceOrEnv(instanceModel, envConfig) {
        const provider = instanceModel.provider;

        // Handle provider set to "default"
        if (provider === 'Default' || !provider) {
            return {
                provider: envConfig.MODEL_PROVIDER,
                name: envConfig.MODEL_NAME,
                baseUrl: envConfig.MODEL_BASE_URL,
                apiKey: envConfig.MODEL_API_KEY
            };
        }

        // Construct the environment variable key for the API key
        const apiKeyEnvVar = provider.toUpperCase().replace(/ /g, '_') + '_API_KEY';

        return {
            provider: provider,
            name: instanceModel.name || envConfig.MODEL_NAME,
            baseUrl: instanceModel.baseUrl || envConfig.MODEL_BASE_URL,
            apiKey: instanceModel.apiKey || process.env[apiKeyEnvVar] || envConfig.MODEL_API_KEY
        };
    }

    try {
        const instanceModel = instance.model || {};
        const envConfig = {
            MODEL_PROVIDER: process.env.MODEL_PROVIDER,
            MODEL_NAME: process.env.MODEL_NAME,
            MODEL_BASE_URL: process.env.MODEL_BASE_URL,
            MODEL_API_KEY: process.env.MODEL_API_KEY,
            EMBED_MODEL_NAME: process.env.EMBED_MODEL_NAME,
            EMBED_API_KEY: process.env.EMBED_API_KEY,
            EMBED_BASE_URL: process.env.EMBED_BASE_URL
        };

        const config = getConfigFromInstanceOrEnv(instanceModel, envConfig);

        let model;
        let embeddingModel;

        // Select the model based on the provider
        switch (config.provider) {
            case 'OpenAI':
                const openAiOptions = {
                    modelName: config.name,
                    apiKey: config.apiKey
                };

                if (config.baseUrl) {
                    openAiOptions.baseUrl = config.baseUrl;
                }

                model = new OpenAi(openAiOptions);
                break;
            case 'Azure':
                model = new AzureAIInferenceModel({
                    endpointUrl: config.baseUrl,
                    apiKey: config.apiKey
                });
                break;
            case 'Mistal':
                // Add your implementation for Mistal here
                throw new Error('Mistal provider not yet implemented.');
            case 'Hugging Face':
                // Add your implementation for Hugging Face here
                throw new Error('Hugging Face provider not yet implemented.');
            case 'Anthropic':
                // Add your implementation for Anthropic here
                throw new Error('Anthropic provider not yet implemented.');
            case 'Ollama':
                // Add your implementation for Anthropic here
                throw new Error('Ollama provider not yet implemented.');
            default:
                throw new Error('No valid provider found in configuration.');
        }

        // Use OpenAI Generic Embeddings if available in the environment config
        if (envConfig.EMBED_MODEL_NAME) {
            embeddingModel = new OpenAiGenericEmbeddings({
                modelName: envConfig.EMBED_MODEL_NAME,
                apiKey: envConfig.EMBED_API_KEY,
                baseUrl: envConfig.EMBED_BASE_URL || 'https://api.openai.com/v1/embeddings',
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

        console.log('RAG Application is ready with provider ' + config.provider + ' and MongoDB!');
        if (config.provider != "A")
        console.log('RAG Application is ready with provider ' + config.provider + ' and MongoDB!');
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