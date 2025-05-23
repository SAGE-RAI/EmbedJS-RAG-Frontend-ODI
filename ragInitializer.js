// ragInitializer.js
import { RAGApplicationBuilder, OpenAi, AzureAIInferenceModel, AdaEmbeddings, OpenAi3LargeEmbeddings, OpenAi3SmallEmbeddings, Anthropic, Mistral, Ollama, HuggingFace, CohereEmbeddings } from '@llm-tools/embedjs';
import { MongoDb } from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from '@llm-tools/embedjs/conversations/mongo';
import { OpenAiGenericEmbeddings } from '@llm-tools/embedjs';
import mongoose, { modelNames } from 'mongoose';

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
    try {
        await cachedb.init();
        await conversationsdb.init();
    } catch (mongoError) {
        console.error("MongoDB initialization error:", mongoError);
        throw mongoError;
    }

    // Function to merge instance and environment config
    function getConfigFromInstanceOrEnv(instanceModel, instanceEmbedModel, envConfig) {
        let provider = instanceModel.provider;
        let embedProvider = instanceEmbedModel.provider;
        // Set default provider values if not specified
        provider = (provider === 'Default' || !provider) ? envConfig.MODEL_PROVIDER : provider;
        embedProvider = (embedProvider === 'Default' || !embedProvider) ? envConfig.EMBED_PROVIDER : embedProvider;

        // Construct the environment variable key for the API key
        const apiKeyEnvVar = provider.toUpperCase().replace(/ /g, '_') + '_API_KEY';

        return {
            model: {
                provider: provider,
                name: instanceModel.name || envConfig.MODEL_NAME,
                baseUrl: instanceModel.baseUrl || envConfig.MODEL_BASE_URL,
                apiKey: instanceModel.apiKey || process.env[apiKeyEnvVar] || envConfig.MODEL_API_KEY
            },
            embed: {
                provider: embedProvider,
                name: instanceEmbedModel.name || envConfig.EMBED_MODEL_NAME,
                baseUrl: instanceEmbedModel.baseUrl || envConfig.EMBED_BASE_URL,
                apiKey: instanceEmbedModel.apiKey || process.env[apiKeyEnvVar] || envConfig.EMBED_API_KEY,
                dimensions: instanceEmbedModel.dimensions || envConfig.EMBED_DIMENSIONS,
            }
        };
    }

    try {
        const instanceModel = instance.model || {};
        const instanceEmbedModel = instance.embedModel || {};
        const envConfig = {
            MODEL_PROVIDER: process.env.MODEL_PROVIDER,
            MODEL_NAME: process.env.MODEL_NAME,
            MODEL_BASE_URL: process.env.MODEL_BASE_URL,
            MODEL_API_KEY: process.env.MODEL_API_KEY,
            EMBED_PROVIDER: process.env.EMBED_PROVIDER,
            EMBED_MODEL_NAME: process.env.EMBED_MODEL_NAME,
            EMBED_API_KEY: process.env.EMBED_API_KEY,
            EMBED_BASE_URL: process.env.EMBED_BASE_URL,
            EMBED_DIMENSIONS: process.env.EMBED_DIMENSIONS
        };

        const config = getConfigFromInstanceOrEnv(instanceModel, instanceEmbedModel, envConfig);

        let model;
        let embeddingModel;

        // Select the model based on the provider
        switch (config.model.provider) {
            case 'OpenAI':
                model = new OpenAi({
                    modelName: config.model.name,
                    apiKey: config.model.apiKey,
                    baseURL: config.model.baseUrl || undefined
                });
                break;
            case 'Azure':
                model = new AzureAIInferenceModel({
                    modelName: config.model.name || undefined,
                    endpointUrl: config.model.baseUrl,
                    apiKey: config.model.apiKey
                });
                break;
            case 'Mistral':
                model = new Mistral ({
                    modelName: config.model.name,
                    apiKey: config.model.apiKey,
                    endpoint: config.model.baseUrl
                });
                break;
            case 'Hugging Face':
                model = new HuggingFace ({
                    modelName: config.model.modelName,
                    apiKey: config.model.apiKey,
                    endpointUrl: config.model.baseUrl
                });
                break;
            case 'Anthropic':
                model = new Anthropic({  
                    modelName: config.model.modelName,   
                    baseURL: config.model.baseUrl,
                    apiKey: config.model.apiKey
                });
                break;
            case 'Ollama':
                model = new Ollama ({ 
                    modelName: config.model.modelName,
                    baseUrl: config.model.baseUrl
                });
                break;
            default:
                throw new Error('No valid provider found in configuration.');
        }

        // Select the embedding model based on the provider
        switch (config.embed.provider) {
            case 'OpenAI':
                const openAiEmbedOptions = {
                    apiKey: config.embed.apiKey,
                    baseURL: config.embed.baseUrl || 'https://api.openai.com/v1/embeddings',
                    ...(config.embed.dimensions && { dimensions: config.embed.dimensions })
                };

                switch (config.embed.name) {
                    case 'text-embedding-ada-002':
                        embeddingModel = new AdaEmbeddings({ apiKey: config.embed.apiKey });
                        break;
                    case 'text-embedding-3-large':
                        // Modify openAiEmbedOptions for text-embedding-3-large to use dynamicDimension instead of dimensions
                        embeddingModel = new OpenAi3LargeEmbeddings({
                            ...openAiEmbedOptions, // retain existing options
                            dynamicDimension: config.embed.dimensions // add dynamicDimension instead of dimensions
                        });
                        break;
                    case 'text-embedding-3-small':
                        embeddingModel = new OpenAi3SmallEmbeddings({ apiKey: config.embed.apiKey });
                        break;
                    default:
                        embeddingModel = new OpenAiGenericEmbeddings({
                            modelName: config.embed.name,
                            ...openAiEmbedOptions
                        });
                        break;
                }
                break;

            case 'Cohere':
                embeddingModel = new CohereEmbeddings({
                    modelName: config.embed.name, 
                    apiKey: config.embed.apiKey});
                break;

            case 'Gecko':
                embeddingModel = new GeckoEmbedding();
                break;

            default:
                throw new Error('No valid embedding provider found in configuration.');
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

        console.log('RAG Application is ready with provider ' + config.model.provider + ' and MongoDB!');
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