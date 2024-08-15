import { WebLoader, TextLoader, PdfLoader } from '@llm-tools/embedjs';
import { getEmbeddingsCacheModel } from '../models/embeddingsCache.js';
import User from '../models/user.js';
import { newTransaction } from '../controllers/transaction.js';
import { encode } from 'gpt-tokenizer/model/text-embedding-ada-002';

async function addSource(req, res) {
    const { source, title, overrideUrl, sourceText } = req.body;
    try {
        const ragApplication = req.ragApplication;
        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        let loader;
        if (sourceText) {
            loader = new TextLoader({ text: sourceText });
        } else if (source.endsWith('.pdf')) {
            loader = new PdfLoader({ filePathOrUrl: source });
        } else {
            loader = new WebLoader({ urlOrContent: source });
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

        newTransaction(userId, uniqueId, "sources", "Load source", totalTokens * -1);

        const updateObject = { tokens: totalTokens, source, loadedDate: new Date(), title, overrideUrl };

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
    const { title, overrideUrl } = req.body;
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        const updateObject = { title, overrideUrl };
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