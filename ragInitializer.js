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

    try {
        const ragApplication = await new RAGApplicationBuilder()
            // .setModel(new OpenAi({ modelName: 'gpt-4o' }))
            .setModel(new AzureAIInferenceModel(
                { 
                    modelName: process.env.AZURE_AI_MODEL_NAME,
                    endpointUrl: process.env.AZURE_AI_ENDPOINT_URL,
                    apiKey: process.env.AZURE_AI_API_KEY
             }))
            //.setModel(new OpenAi({ modelName: 'phi-3-mini', baseURL: process.env.BASE_URL})) // using custom Open Ai compartible servicesfor LLMs
            // .setModel(new AzureAIInferenceModel({ // Using the Azure AI Interface 
            //     modelName: 'Meta-Llama-3-70B-Instruct-bznuk', // this actually is entirely ignored; will remove soon.
            //     temperature: 0.2, // or whatever temperature you'd like
            //     maxNewTokens: 128, // or however many max tokens you'd like 
            //     endpointUrl: process.env.BASE_URL,
            //     apiKey: process.env.OPENAI_API_KEY }) )
            .setEmbeddingModel(new OpenAiGenericEmbeddings({ // using custom OpenAi compartible services for embeddings
                modelName: 'nomic-embed', 
                baseURL: process.env.BASE_URL,
                dimensions: 768,
            }))
            .setQueryTemplate("You are an AI assistant for helping users answering question given a specific context." +
                "You are given a context and you'll be asked a question based on the context. Your answer should be as precise as possible and answer should be only from the context." + 
                "Your answer should be succinct. context: ") // prompt template here!!
            .setTemperature(0.8)
            .setVectorDb(db)
            .setCache(cachedb)
            .setConversations(conversationsdb)
            .setQueryTemplate(instance.systemPrompt)
            .build();

        console.log('RAG Application is ready with OpenAI Generic Models and MongoDB!');
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