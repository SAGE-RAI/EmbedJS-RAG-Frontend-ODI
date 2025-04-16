import { getConversationModel } from '../models/conversation.js';
import { getEmbeddingsModel } from '../models/embeddings.js';
import { newTransaction } from '../controllers/transaction.js';
import User from '../models/user.js';
import Instance from '../models/instance.js';
import { encode } from 'gpt-tokenizer/model/gpt-4o';
//import { allDbs } from './ragInitializer.js'; // to use allDbs

async function createConversation(req, res) {
    try {
        const userId = req.user._id;
        const { contentObject, course, _skillsFramework } = req.body;

        const Conversation = getConversationModel(req.params.instanceId);

        const newConversation = new Conversation({
            userId,
            constructor: { contentObject, course, _skillsFramework },
        });

        newConversation.conversationId = newConversation._id.toString(); // Set conversationId to the string of the _id created

        await newConversation.save();

        res.status(201).json({ id: newConversation._id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getConversations(req, res) {
    try {
        const userId = req.user._id;

        const Conversation = getConversationModel(req.params.instanceId);

        const conversations = await Conversation.find({
            userId,
            entries: { $exists: true, $not: { $size: 0 } }
        });
        res.json(conversations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getConversation(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.params.instanceId);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        if (req.accepts('html')) {
            res.locals.pageTitle = "Chat";
            res.render('pages/chat', { conversation });
        } else {
            res.json(conversation);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateConversation(req, res) {
    const conversationId = req.params.conversationId;
    const updateData = req.body;
    try {
        const Conversation = getConversationModel(req.params.instanceId);

        const updatedConversation = await Conversation.findByIdAndUpdate(
            conversationId,
            { $set: updateData },
            { new: true }
        );

        if (!updatedConversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(updatedConversation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteConversation(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.params.instanceId);

        const deletedConversation = await Conversation.findByIdAndDelete(conversationId);
        if (!deletedConversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getMessages(req, res) {
    const conversationId = req.params.conversationId;
    try {
        const Conversation = getConversationModel(req.params.instanceId);

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json(conversation.entries);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

/** Scenario 2: investigating different strategies for chunking **/
// Function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

// Normalize embeddings to unit length (L2-normalization)
function normalize(vec) {
    const magnitude = Math.sqrt(vec.reduce((sum, val) => sum + val ** 2, 0));
    return vec.map(val => val / magnitude);
}

// Calculates the Euclidean distance between two vectors using the formula:
function euclideanDistance(vecA, vecB) {
    const cosSim = cosineSimilarity(vecA, vecB);  // Calculate cosine similarity
    return Math.sqrt(2 * (1 - cosSim));
}

async function postMessage(req, res) {
    try {
        const conversationId = req.params.conversationId;
        const { message, sender, strategy } = req.body;
        const ragApplication = req.ragApplication;
        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        if (!sender || sender !== 'HUMAN' || !message) {
            return res.status(400).json({ error: 'Invalid message format. Must include sender "HUMAN" and message.' });
        }

        const Conversation = getConversationModel(req.params.instanceId);
        const Embeddings = getEmbeddingsModel(req.params.instanceId);

        let conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Retrieve the user's token information from the database
        const userId = req.session.user.id; // Assume user ID is stored in session
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let contextQuery = message; // Default contextQuery is just the new query
        const messages = conversation.entries;

        let chunks = [];

        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].chunks && messages[i].chunks.length > 0) {
                const chunkIds = messages[i].chunks;

                try {
                    // Fetch pageContent for each chunk ID
                    const embeddings = await Embeddings.find({ u_fld: { $in: chunkIds } }).exec();
                    // Append pageContent to chunks array
                    chunks = embeddings.map(embedding => ({
                        pageContent: embedding.pageContent,
                        metadata: {
                            source: embedding.source,
                            uniqueLoaderId: embedding.l_fld,
                            id: embedding.u_fld
                        }
                    }));
                } catch (error) {
                    console.error("Error retrieving chunks from database:", error);
                    // Handle error appropriately (e.g., return an error response)
                }
                break;
            }
        }
        if (messages.length > 0) {
            const ragQuery = 'This is the users query: "' + message + '". From the conversation history and supporting metadata, assess if you can answer the query. Your response must be in undeclared JSON format. Do not include any thing else in your response, only the JSON. The JSON has two properties: additionalContextRequired (boolean) and resolvedContextQuery (string). If additional context is required to answer the users query, set additionalContextRequired to true and provide a single query derived from the users new query in resolvedContextQuery that includes resolved entities and context suitable for performing RAG (Retrieval-Augmented Generation) context retrieval. If no additional context is needed, set additionalContextRequired to false and leave resolvedContextQuery empty, DO NOT ANSWER THE USERS QUERY!'
            let response = await ragApplication.silentConversationQuery(ragQuery, null, conversationId, chunks);
            try {
                response = JSON.parse(response);
            } catch (err) {
                console.error("Could not parse RAG response as JSON");
            }
            if (response.additionalContextRequired) {
                contextQuery = message + ' ' + response.resolvedContextQuery;
                chunks = await ragApplication.getContext(contextQuery);
            }
        } else {
            chunks = await ragApplication.getContext(contextQuery);
        }

        // Implement source combination strategies - tech paper scenario 2
        let selectedChunks = [];
        let k = 10; // Default number of chunks to retrieve
        let minRelevanceThreshold = 0.3; // Default relevance score threshold
        //let sources = [];

        switch (strategy) {
            case 'top_k_chunks':
                // Top k chunks across all sources
                selectedChunks = chunks.slice(0, k); // top 5 chunks
                console.log("Selected chunks:", selectedChunks);
                break;
            case 'top_k_n_chunks':
                // Top k/n chunks from each of n sources individually
                const sourcesChunks = [...new Set(chunks.map(chunk => chunk.metadata.source))];
                console.log("Sources:", sourcesChunks);
                console.log("********************************************");
                const kPerSource = Math.floor(10 / sourcesChunks.length); // top 10 chunks divided by number of sources
                console.log("kPerSource:", kPerSource);
                console.log("********************************************");
                selectedChunks = sourcesChunks.flatMap(source =>
                    chunks.filter(chunk => chunk.metadata.source === source).slice(0, kPerSource)
                ).slice(0, k);
                console.log("Selected chunks:", selectedChunks);
                break;
            case 'top_k_chunks_per_source':
                // Top k chunks from each of n sources individually
                const sourcesPerSource = [...new Set(chunks.map(chunk => chunk.metadata.source))];
                console.log("Sources:", sourcesPerSource);
                console.log("********************************************");
                const kPerSource2 = k; // Example: top 5 chunks per source
                selectedChunks = sourcesPerSource.flatMap(source =>
                    chunks.filter(chunk => chunk.metadata.source === source).slice(0, kPerSource2)
                ).slice(0, k);
                console.log('kPerSource2:', kPerSource2);
                console.log("********************************************");
                console.log("Selected chunks:", selectedChunks);
                break;
            case 'weighted_relevance': 
                console.log('contextQuery:', contextQuery);
                console.log('message:', message);
            
                // Step 1: Precompute embeddings for all chunks
                const chunkEmbeddings = await Promise.all(
                    chunks.map(async chunk => ({
                        ...chunk,
                        embedding: await ragApplication.getTextEmbedding(chunk.pageContent)
                    }))
                );
            
                // Step 2: Group chunks by source and precompute source embeddings
                const sources = [...new Set(chunkEmbeddings.map(chunk => chunk.metadata.source))];
                const sourceChunks = {};
                const sourceEmbeddings = {};
            
                await Promise.all(
                    sources.map(async source => {
                        const chunksForSource = chunkEmbeddings.filter(chunk => chunk.metadata.source === source);
                        sourceChunks[source] = chunksForSource;
            
                        // Generate embedding for the full text of the source
                        const sourceText = chunksForSource.map(chunk => chunk.pageContent).join(' ');
                        sourceEmbeddings[source] = await ragApplication.getTextEmbedding(sourceText);
                    })
                );
            
                console.log("sourceChunks:", sourceChunks);
                console.log("********************************************");
            
                console.log("sourceEmbeddings Done:");
            
                // Step 3: Calculate source weights based on semantic distance
                const queryEmbedding = await ragApplication.getTextEmbedding(message);
                console.log("Query Embeddings Done");
                const sourceWeights = {};
            
                const normalizedQueryEmbedding = normalize(queryEmbedding); // normalise the query embeddings
                for (const source of sources) {
                    const normalizedSourceEmbedding = normalize(sourceEmbeddings[source]); // normalise the sourceEmbeddings 
                    const similarity = euclideanDistance(normalizedQueryEmbedding, normalizedSourceEmbedding); // find the similarity or euclidean distance
                    console.log("Similarity for", source, ":", similarity);
                    sourceWeights[source] = (similarity + 1) / 2; // Normalize to [0, 1]
                }
            
                console.log("********************************************");
                console.log("Source weights:", sourceWeights);
            
                // Normalize weights so they sum to 1
                const totalWeight = Object.values(sourceWeights).reduce((sum, weight) => sum + weight, 0);
                console.log("********************************************");
                console.log("Total weight:", totalWeight);
                for (const source of sources) {
                    sourceWeights[source] /= totalWeight;
                }
            
                // Step 4: Determine the total number of chunks to retrieve (k)
                const kn = chunks.length; // or set a specific value for k
                console.log("total number of chunks to retrieve: ", kn);
            
                // Step 5: Select chunks proportionally based on source weights
                //const selectedChunks = [];
                for (const source of sources) {
                    const chunksForSource = sourceChunks[source];
            
                    // Calculate the number of chunks to select from this source
                    const numChunksToSelect = Math.round(kn * sourceWeights[source]);
                    console.log("********************************************");
                    console.log("num ChunksToSelect for", source, ":", numChunksToSelect);
            
                    // Sort chunks within the source by relevance to the query
                    const sortedChunks = chunksForSource.sort((a, b) =>
                        euclideanDistance(b.embedding, queryEmbedding) - euclideanDistance(a.embedding, queryEmbedding)
                    );
            
                    console.log("********************************************");
                    console.log("sorted Chunks for", source, ":", sortedChunks);
            
                    // Select the top `numChunksToSelect` chunks from this source
                    selectedChunks.push(...sortedChunks.slice(0, numChunksToSelect));
                }
            
                // set the total number of chunks to retrieve
                selectedChunks = selectedChunks.slice(0, k);
                console.log("********************************************");
                console.log("Selected chunks:", selectedChunks);
                break;
            case 'topic_classification':
                // Topic classification and entity extraction
                console.log('contextQuery:', contextQuery);
                console.log('message:', message);
                console.log("********************************************");

                // Step 1: Extract topics and entities from the user's query using an advanced model/API
                const queryExtractionPrompt = `Analyze the following query and extract its primary topics and entities. Assign a weight to each topic/entity based on its importance. Respond with a JSON object: { "topics": { "topic": weight }, "entities": { "entity": weight } }. Do not include any explanations or steps. Query: "${message}"`;
                let queryTopicsAndEntities = { topics: {}, entities: {} };
                let queryExtractionResponse = await ragApplication.silentConversationQuery(queryExtractionPrompt, null, conversationId, chunks);

                try {
                    queryTopicsAndEntities = JSON.parse(queryExtractionResponse);
                    if (!queryTopicsAndEntities.topics || !queryTopicsAndEntities.entities) {
                        throw new Error('Expected a JSON object with topics and entities.');
                    }
                    console.log("********************************************");
                    console.log("Extracted query topics and entities:", queryTopicsAndEntities);
                } catch (error) {
                    console.error("Failed to extract query topics and entities:", error, "Response:", queryExtractionResponse);
                    queryTopicsAndEntities = { topics: {}, entities: {} }; // Fallback
                }

                // Step 2: Extract topics and entities from each chunk (with caching)
                const chunkTopics = await Promise.all(
                    chunks.map(async chunk => {
                        if (chunk.metadata.topics && chunk.metadata.entities) {
                            return { ...chunk, topics: chunk.metadata.topics, entities: chunk.metadata.entities };
                        }

                        let topics = {};
                        let entities = {};
                        const chunkExtractionPrompt = `Analyze the following text and extract its primary topics and entities. Assign a weight to each topic/entity based on its importance. Respond with a JSON object: { "topics": { "topic": weight }, "entities": { "entity": weight } }. Do not include any explanations or steps. Text: "${chunk.pageContent}"`;
                        let extractionResponse = await ragApplication.silentConversationQuery(chunkExtractionPrompt, null, conversationId, [chunk]);
                        let parsedResponse = {};

                        try {
                            parsedResponse = JSON.parse(extractionResponse);
                            //console.log("Parsed Response:", parsedResponse);
                            topics = parsedResponse.topics;
                            entities = parsedResponse.entities;
                            if (!topics || !entities) {
                                throw new Error(`Expected a JSON object with "topics" and "entities" for chunk with ID ${chunk.metadata.id}.`);
                            }
                            console.log(`Topic-Extraction from Chunks with Id ${chunk.metadata.id}:`, extractionResponse);

                            return { ...chunk, topics, entities };

                        } catch (error) {
                            try {
                                // console.error("Fixing the JSON Object..", error, "Response:", extractionResponse);
                                parsedResponse = JSON.parse(extractionResponse + "}"); // This is a hack to get the error message from the response
                                topics = parsedResponse.topics;
                                entities = parsedResponse.entities;
                                if (!topics || !entities) {
                                    throw new Error(`Expected a JSON object with "topics" and "entities" for chunk with ID ${chunk.metadata.id}.`);
                                }
                                // console.log(`Fixed: Topic-Extraction from Chunks with Id ${chunk.metadata.id}:`, extractionResponse);
                                return { ...chunk, topics: topics, entities: entities }; // Fallback
                            } catch (error) {
                                console.error("Failed to extract topics for chunk:", error, "Response:", extractionResponse);
                                return { ...chunk, topics: {}, entities: {} }; // Fallback
                            }
                        } finally {
                            // Cache the extracted topics and entities in chunk metadata
                            chunk.metadata.topics = topics;
                            chunk.metadata.entities = entities;
                        }
                    })
                );

                // Step 3: Calculate relevance scores based on weighted topic and entity intersections
                const scoredChunks = chunkTopics.map(chunk => {
                    let relevanceScore = 0;

                    for (const [topic, weight] of Object.entries(chunk.topics)) {
                        if (queryTopicsAndEntities.topics[topic]) {
                            relevanceScore += weight * queryTopicsAndEntities.topics[topic];
                        }
                    }

                    for (const [entity, weight] of Object.entries(chunk.entities)) {
                        if (queryTopicsAndEntities.entities[entity]) {
                            relevanceScore += weight * queryTopicsAndEntities.entities[entity];
                        }
                    }

                    return { ...chunk, relevanceScore };
                });

                console.log("Scored chunks:", scoredChunks);

                // Step 4: Sort chunks by relevance score (descending order)
                const sortedChunks = scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
                console.log("Sorted chunks:", sortedChunks);

                // Step 5: Dynamically select the top k chunks to be selected based on relevance threshold
                // const minRelevanceThreshold = 0.3;
                const topChunks = sortedChunks.filter(chunk => chunk.relevanceScore >= minRelevanceThreshold);
                k = Math.min(topChunks.length, 10);
                selectedChunks = topChunks.slice(0, k).map(chunk => ({
                    ...chunk
                    // relevanceScore: undefined // Remove relevanceScore from final output if not needed
                })).slice(0, k); // Set the number of chunks to retrieve

                console.log("Selected chunks:", selectedChunks);
                break;
            case 'llm_summarization':
                // LLM content summarization
                console.log('contextQuery:', contextQuery);
                console.log('message:', message);

                // Step 1: Group chunks by source
                const sources_ = [...new Set(chunks.map(chunk => chunk.metadata.source))];
                const sourceChunks_ = {};
                sources_.forEach(source => {
                    sourceChunks_[source] = chunks.filter(chunk => chunk.metadata.source === source);
                });

                // console.log("Sources:", sources_);
                console.log("Grouped chunks by source:", sourceChunks_);

                // Step 2: Summarize chunks per source
                const summarizedChunks = [];
                for (const source of sources_) {
                    const chunksForSource = sourceChunks_[source];

                    // Step 2a: Summarize with relevance to the query
                    // const relevanceSummaryPrompt = `Summarize the following text concisely, focusing on the key points and main ideas relevant to the query: "${message}". Ensure the summary is clear, accurate, and free of opinions or additional information not present in the original text. Here is the text to summarize:\n\n${chunksForSource.map(chunk => chunk.pageContent).join(' ')}. Respond with just the summary without any decorators.`;
                    const relevanceSummaryPrompt = `Generate a well-structured and informative summary of the following text, ensuring it is **concise yet sufficiently detailed** to capture key points and main ideas relevant to the query: "${message}".  
                    - The summary should be **clear, accurate, and contextually relevant**.  
                    - Avoid opinions, interpretations, or information not present in the original text.  
                    - Maintain a **balanced length**—long enough to cover essential details but concise enough to stay focused.  
                    Text to summarize: ${chunksForSource.map(chunk => chunk.pageContent).join(' ')}  
                    Respond with **only** the summary, without any extra text or formatting.`;

                    const relevanceSummary = await ragApplication.silentConversationQuery(relevanceSummaryPrompt, null, conversationId, chunksForSource);

                    console.log("Relevance summary for source:", source, relevanceSummary);

                    // Step 2b: Summarize in general (without focusing on the query)
                    // const generalSummaryPrompt = `Summarize the following text concisely, focusing on the main ideas, key points, and essential details while ensuring clarity and coherence. Do not include personal opinions or any information not present in the original text. Here is the text to summarize:\n\n${chunksForSource.map(chunk => chunk.pageContent).join(' ')}. Respond with just the summary without any decorators.`;
                    const generalSummaryPrompt = `Generate a clear, well-structured summary of the following text.  
                    - Ensure the summary captures the **main ideas, key points, and essential details**.  
                    - Maintain **clarity, coherence, and a balanced length**—detailed enough to convey important information but concise and to the point.  
                    - **Exclude** personal opinions or any information not present in the original text.  
                    Text to summarize: ${chunksForSource.map(chunk => chunk.pageContent).join(' ')}  
                    Respond with **only** the summary, without any extra text or formatting.`;

                    const generalSummary = await ragApplication.silentConversationQuery(generalSummaryPrompt, null, conversationId, chunksForSource);

                    console.log("General summary for source:", source, generalSummary);

                    // Step 2c: Add summarized chunks to the result
                    summarizedChunks.push({
                        metadata: { source },
                        pageContent: relevanceSummary, // Use relevance summary by default
                        generalSummary // Optional: Store general summary for reference; we can switch between general and relevance
                    });
                }

                console.log("Summarized chunks:", summarizedChunks);

                // Step 3: Select the top k summarized chunks
                //  Set the number of chunks to retrieve
                selectedChunks = summarizedChunks.slice(0, k);

                console.log("Selected summarized chunks:", selectedChunks);
                break;
            default:
                selectedChunks = chunks; // Default strategy chunks
                break;
        }

        /// Calculate the number of tokens required for the message and chunks
        const messageTokens = encode(message).length;

        let chunkTokens = 0;
        for (const chunk of selectedChunks) {
            chunkTokens += encode(chunk.pageContent).length;
        }

        // Check if the user has enough tokens
        const totalTokensRequired = messageTokens + chunkTokens + 500; // +500 tokens for the response
        //WARNING. This does not take into acount how much of the conversation history is sent on each request!
        if (totalTokensRequired > user.tokens) {
            return res.status(400).json({ error: 'Insufficient tokens to post the message' });
        }

        // Query the RAG application with the message and selected chunks
        const ragResponse = await ragApplication.query(message, conversationId, selectedChunks);

        // ** AI to suggest to talk to tutor **
        // Check if AI response suggests user needs to contact tutor
        const aiMessage = ragResponse.content.message; //gets the response 
        const clarificationQuery = `Does the following response suggest that the AI cannot answer the user's query? Response: "${aiMessage}" Please respond with a JSON object. The JSON should contain a boolean field "aicannotHelp", which should be true if the AI cannot help and false if it can. Example: {"aicannotHelp": true}`;
        let clarificationResponse = await ragApplication.silentConversationQuery(clarificationQuery, null, conversationId, selectedChunks);
        let parsedResponse = {}; // Initialize the parsedResponse variable

        try {
            // Parse the JSON response
            parsedResponse = JSON.parse(clarificationResponse);
        } catch (error) {
            console.error("Failed to parse JSON response from LLM:", error);
        }

        if (parsedResponse.aicannotHelp) {
            try {
                // Fetch instance details
                const instance = await Instance.findById(req.params.instanceId);
                const courseTutorEmail = 'tutor@example.com'; // * I have to replace this with an actualy email!*
                const subject = `Help Request: Conversation History from ${user.name} on Assistant: ${instance ? instance.name : 'Unknown'}`;

                // get the conversation history
                const conversationHistory = [];
                // Iterate through all conversation entries and pair them as Message and Response
                conversation.entries.forEach((entry, index) => {
                    const messageType = entry.content.sender === 'HUMAN' ? 'Message' : 'Response';
                    conversationHistory.push(`${messageType} ${Math.ceil((index + 1) / 2)} (${entry.content.sender}): ${entry.content.message}`);
                });

                const mailtoLink = `mailto:${encodeURIComponent(courseTutorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
                    `Dear Tutor,\n\nThe user ${user.name} has requested assistance with the following query, as the AI assistant was unable to help:\n\n` +
                    `User Query: ${message}\n\nConversation History:\n\n${conversationHistory.join('\n\n')}\n\nKind regards,\nYour ODI AI Assistant`
                )}`;

                // push it to ragResponse
                ragResponse.prompt = "I'm sorry if my response wasn't helpful. Would you like to reach out to your tutor for further support? You can do so by clicking the link below."
                ragResponse.mailtoLink = mailtoLink;

            } catch (error) {
                console.error("Error preparing email details:", error);
                return res.status(500).json({ error: "Failed to prepare email details." });
            }
        }

        try {
            // Define a function to handle the transactions sequentially
            const handleTransactions = async () => {
                // Fetch the updated conversation with entries
                const conversation = await Conversation.findById(conversationId);
                const previousId = await getPreviousEntryId(conversation.entries, ragResponse._id);

                // Calculate tokens
                const queryTokens = messageTokens + chunkTokens;
                const responseTokens = ragResponse.content.message.length * 3;

                // Subtract tokens for the new query
                await newTransaction(userId, previousId, "conversations", "New Query", queryTokens * -1);

                // Subtract tokens for the query response
                await newTransaction(userId, ragResponse._id, "conversations", "Query Response", responseTokens * -1);
            };

            // Call the function to handle transactions
            handleTransactions()
                .then(() => {
                })
                .catch(error => {
                    console.error('Error during transaction processing:', error);
                });

        } catch (error) {
            console.error('Transactions error: ' + error);
        }

        res.status(200).json(ragResponse);
    } catch (error) {
        console.error("Error in /:instanceId/completion/:conversationId route:", error);
        res.status(error.status || 500).json({ error: error.message });
    }
}

// *** User to suggest to contact to tutor via email ***
async function emailTutor(req, res) {
    try {
        const conversationId = req.params.conversationId;
        const instanceId = req.params.instanceId;
        const userId = req.session.user.id; // Assume user ID is stored in session
        // Retrieve the user's token information from the database

        // Fetch the conversation
        const Conversation = getConversationModel(instanceId);
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch instance details
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Prepare email details
        const courseTutorEmail = 'tutor@example.com'; // * I have to replace this with an actualy email!*
        const subject = `Help Request: Conversation History from ${user.name} on Assistant: ${instance.name || 'Unknown'}`;

        // Get the conversation history
        const conversationHistory = [];
        // Iterate through all conversation entries and pair them as Message and Response
        conversation.entries.forEach((entry, index) => {
            const messageType = entry.content.sender === 'HUMAN' ? 'Message' : 'Response';
            conversationHistory.push(`${messageType} ${Math.ceil((index + 1) / 2)} (${entry.content.sender}): ${entry.content.message}`);
        });

        const mailtoLink = `mailto:${encodeURIComponent(courseTutorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
            `Dear Tutor,\n\nThe user ${user.name} has requested assistance with the following conversation history:\n\n` +
            `${conversationHistory.join('\n\n')}\n\nKind regards,\nYour ODI AI Assistant`
        )}`;

        // Return the email link
        res.status(200).json({
            mailtoLink
        });
    } catch (error) {
        console.error("Error in emailTutor:", error);
        res.status(500).json({ error: error.message });
    }
}

async function getPreviousEntryId(entries, entryId) {
    try {

        const currentIndex = entries.findIndex(entry => entry._id === entryId);

        if (currentIndex === -1) {
            throw new Error('Entry not found');
        }

        // Get the previous entry ID
        const previousEntry = entries[currentIndex - 1];
        return previousEntry ? previousEntry._id : null;
    } catch (error) {
        console.error('Error retrieving previous entry ID:', error);
        return null;
    }
}

async function setRating(req, res) {
    try {
        const { conversationId, messageId } = req.params; // Extract conversationId and messageId from request params
        const { rating, comment } = req.body; // Extract rating and comment from request body

        // Validate input
        if (!rating || typeof rating !== 'number') {
            return res.status(400).json({ error: 'Invalid rating. Rating must be a number.' });
        }

        // Find the conversation by conversationId
        const Conversation = getConversationModel(req.params.instanceId);
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        // Find the entry with the given messageId in the conversation
        const entry = conversation.entries.find(e => e._id.toString() === messageId);

        if (!entry) {
            return res.status(404).json({ error: 'Message not found' });
        }

        let newRating = false;
        if (!entry.rating.rating) {
            newRating = true;
        }

        // Update the rating and comment of the entry
        entry.rating = { rating, comment };

        // Save the updated conversation
        await conversation.save();

        if (newRating) {
            try {
                // Define a function to handle the transactions sequentially
                const handleTransactions = async () => {
                    const instanceId = req.params.instanceId;
                    const instance = await Instance.findById(req.params.instanceId);
                    // Fetch the updated conversation with entries
                    const ratingReward = instance.ratingReward ? parseInt(instance.ratingReward, 10) : 0;
                    const userId = req.session.user.id;
                    // Subtract tokens for the new query
                    if (rating > 0) {
                        newTransaction(userId, messageId, "ratings", "Rating reward", ratingReward);
                    }
                };

                // Call the function to handle transactions
                handleTransactions()
                    .then(() => {
                    })
                    .catch(error => {
                        console.error('Error during transaction processing:', error);
                    });

            } catch (error) {
                console.error('Transactions error: ' + error);
            }
        }

        return res.status(200).json({ success: true, message: 'Rating updated successfully' });
    } catch (error) {
        console.error('Error setting rating:', error);
        return res.status(error.status || 500).json({ error: error.message });
    }
}

async function getRatingsReport(req, res) {
    try {
        const instanceId = req.params.instanceId;
        // Query all conversations
        const Conversation = getConversationModel(instanceId);
        const conversations = await Conversation.find({});

        const ratingsReport = conversations.reduce((report, conversation) => {
            // Filter entries that have a valid rating
            const ratedEntries = conversation.entries.filter(entry => {
                return entry.rating && typeof entry.rating.rating === 'number';
            });

            ratedEntries.forEach(entry => {
                const { rating, comment } = entry.rating;
                const AIResponse = entry.content.message;

                // Find the previous HUMAN message in the conversation
                const humanMessages = conversation.entries.filter(
                    e => e.content.sender === 'HUMAN'
                );
                const previousHumanMessage = humanMessages.reverse().find(
                    message => message._id !== entry._id
                );

                if (previousHumanMessage) {
                    report.push({
                        dateOfRating: entry.timestamp, // Assuming there's a timestamp field
                        rating,
                        ratingMessage: comment,
                        HuamnMessage: previousHumanMessage.content.message,
                        AIResponse,
                    });
                }
            });

            return report;
        }, []);

        // Send the report as JSON
        res.status(200).json({ ratings: ratingsReport });
    } catch (error) {
        console.error('Error retrieving ratings report:', error);
        res.status(500).json({ error: 'Failed to retrieve ratings report' });
    }
}

export { createConversation, getConversations, getConversation, updateConversation, deleteConversation, getMessages, postMessage, setRating, getRatingsReport, emailTutor };