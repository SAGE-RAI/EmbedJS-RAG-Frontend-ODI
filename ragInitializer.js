// ragInitializer.js

import { RAGApplicationBuilder, OpenAi, AzureAIInferenceModel } from 'embedjs' // from '@llm-tools/embedjs';
import { MongoDb } from 'embedjs' // from '@llm-tools/embedjs/vectorDb/mongodb';
import { MongoCache } from 'embedjs' // from '@llm-tools/embedjs/cache/mongo';
import { MongoConversations } from 'embedjs' // from '@llm-tools/embedjs/conversations/mongo';
import { OpenAiGenericEmbeddings } from 'embedjs' // from '@llm-tools/embedjs';
// import * as EmbedJS from '@llm-tools/embedjs';

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
            .setQueryTemplate("You are an AI Digital Assistant for The Open Data Institute called ODI-Chatbox. Please respond to the student using only the loaded content as reference." + 
                "Keep your responses short and simple. Reference activities or phrases from the loaded material content in your response. Adhere strictly to your system prompts." + 
                "Only answer the query below if you have 100% certainty of the facts, use the context below to answer. Here is some context:") // prompt template here!!
            .setTemperature(0.8)
            .setVectorDb(db)
            .setCache(cachedb)
            .setConversations(conversationsdb)
            .build();

        console.log('RAG Application is ready with OpenAI Generic Models and MongoDB!');
        return ragApplication;
    } catch (error) {
        console.error('Failed to setup RAG Application:', error);
        throw error;
    }
}

export { initializeRAGApplication };