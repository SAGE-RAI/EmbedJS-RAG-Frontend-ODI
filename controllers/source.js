import { WebLoader, TextLoader, PdfLoader, UrlLoader, JsonLoader } from '@llm-tools/embedjs';
import { getEmbeddingsCacheModel } from '../models/embeddingsCache.js';
import User from '../models/user.js';
import { encode } from 'gpt-tokenizer/model/text-embedding-ada-002';
import axios from 'axios';
  

async function addSource(req, res) {
    const { source, title, type, overrideUrl, sourceText } = req.body;
    try {
        const ragApplication = req.ragApplication;
        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        let loader; 

        if (sourceText) {
            // Direct text provided
            loader = new TextLoader({ text: sourceText });
        } else if (source) {
            // Perform a HEAD request to get headers without fetching the body
            const headResponse = await axios.head(source, {
                headers: {
                    'Accept': "application/json, text/html;q=0.9, application/pdf;q=0.8, text/plain;q=0.7"
                }
            });
            const contentType = headResponse.headers['content-type'];

            // Perform content negotiation based on Content-Type header
            if (contentType.includes('application/pdf')) {
                loader = new PdfLoader({ filePathOrUrl: source });
                console.log("PDF loader used..");
            } 
            if (contentType.includes('application/json')) {
                const response = await axios.get(source);
                const jsonObject = response.data;
                loader = new JsonLoader({ object: jsonObject });
                
            } else if (contentType.includes('text/html')) {
                loader = new WebLoader({ urlOrContent: source });
            } else if (contentType.includes('text/plain')) {
                // Fetch the plain text content since content is plain text
                const response = await axios.get(source);
                // loader = new TextLoader({ text: response.data });
                loader = new UrlLoader({ urlOrContent: response });
            } else {
                throw new Error('Unsupported content type');
            }
        }

        // Retrieve the user's token information from the database
        const userId = req.session.user.id; // Assume user ID is stored in session
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Retrieve chunks from the loader and calculate total tokens required
        let totalTokens = 0;
        for await (const chunk of loader.getChunks()) {
            const tokenCount = encode(chunk.pageContent).length; // Using gpt-tokenizer to count tokens
            totalTokens += tokenCount;

            if (totalTokens > user.tokens) {
                return res.status(400).json({ error: 'Insufficient tokens to load the source' });
            }
        }

        // Only add the loader after confirming enough tokens
        await ragApplication.addLoader(loader);
        const uniqueId = loader.getUniqueId();

        // Deduct the tokens from user's account and update in the database
        user.tokens -= totalTokens;
        await user.save();

        const updateObject = { tokens: totalTokens, source, loadedDate: new Date(), title, type, overrideUrl };

        const updateResult = await EmbeddingsCache.findOneAndUpdate(
            { loaderId: uniqueId },
            { $set: updateObject },
            { upsert: true, new: true }
        );

        if (!updateResult) {
            throw new Error('Failed to update cache database with loader information');
        }

        res.status(201).json({ uniqueId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getSources(req, res, returnRawData = false) {
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        const loaders = await EmbeddingsCache.find({ loaderId: { $ne: "LOADERS_LIST_CACHE_KEY" } });
        if (returnRawData) {
            return loaders;
        } else {
            res.json({ loaders });
        }
    } catch (error) {
        if (!returnRawData) {
            res.status(500).json({ error: 'Failed to retrieve loaders' });
        } else {
            throw error;
        }
    }
}

async function getSource(req, res, returnRawData = false) {
    const uniqueId = req.params.loaderId;
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        const loader = await EmbeddingsCache.findOne({ loaderId: uniqueId });
        if (!loader) {
            return res.status(404).json({ error: 'Loader not found' });
        }
        if (returnRawData) {
            return loader;
        } else {
            res.json({ loader });
        }
    } catch (error) {
        if (!returnRawData) {
            res.status(500).json({ error: 'Failed to retrieve loader' });
        } else {
            throw error;
        }
    }
}

async function updateSource(req, res) {
    const loaderId = req.params.loaderId;
    const { title, type, overrideUrl } = req.body;
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        const updateObject = { title, type, overrideUrl };
        const updateResult = await EmbeddingsCache.findOneAndUpdate(
            { loaderId: loaderId },
            { $set: updateObject },
            { new: true }
        );

        if (!updateResult) {
            return res.status(500).json({ error: 'Failed to update cache database with loader information' });
        }

        res.json({ uniqueId: loaderId });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update loader' });
    }
}

async function deleteSource(req, res) {
    const uniqueId = req.params.loaderId;
    try {
        const ragApplication = req.ragApplication;
        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        const result = await ragApplication.deleteLoader(uniqueId, true);
        if (result) {
            res.sendStatus(204);
        } else {
            res.status(500).json({ error: 'Failed to delete loader' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete loader' });
    }
}

export { addSource, getSources, getSource, updateSource, deleteSource };