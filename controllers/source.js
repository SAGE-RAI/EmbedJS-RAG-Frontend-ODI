import { WebLoader, TextLoader, PdfLoader, JsonLoader } from '@llm-tools/embedjs';
import { getEmbeddingsCacheModel } from '../models/embeddingsCache.js';
import User from '../models/user.js';
import { newTransaction } from '../controllers/transaction.js';
import { encode } from 'gpt-tokenizer/model/text-embedding-ada-002';
import axios from 'axios';
import fetch from 'node-fetch'; // Import node-fetch
import { load } from 'cheerio';

if (!global.siteMapThreads) {
    global.siteMapThreads = {};
}

async function getHeaders(url) {
    try {
        if (!url) {
            throw new Error('URL is required');
        }

        // Fetch headers from the URL
        const headResponse = await fetch(url, { method: 'HEAD' });

        // Extract headers
        const contentType = headResponse.headers.get('Content-Type') || 'unknown';
        const contentDisposition = headResponse.headers.get('Content-Disposition') || '';
        let title = '';

        // Determine the source type
        let sourceType;
        if (contentType.includes('application/json')) {
            sourceType = 'JSON';
        } else if (contentType.includes('application/pdf')) {
            sourceType = 'PDF';
        } else if (contentType.includes('text/plain')) {
            sourceType = 'Text';
        } else if (contentType.includes('text/html')) {
            sourceType = 'HTML';

            // Fetch the actual HTML content
            const htmlResponse = await fetch(url);
            const html = await htmlResponse.text();

            // Parse HTML to extract the <title> tag
            const $ = load(html);
            title = $('title').text();
        } else {
            sourceType = 'Unknown';
        }

        // Extract filename from Content-Disposition header if present
        if (contentDisposition.includes('filename=')) {
            const matches = contentDisposition.match(/filename="(.+?)"/);
            if (matches && matches[1]) {
                title = matches[1];
            }
        }

        return { contentType, sourceType, title };
    } catch (error) {
        throw new Error('Failed to fetch headers: ' + error.message);
    }
}

async function handleSiteMapImport(source, req) {
    if (global.siteMapThreads[source] && global.siteMapThreads[source].running === true) {
        return;
    }

    global.siteMapThreads[source] = { running: true, urls: [], remaining: 0, errors: [] };

    const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);
    const response = await axios.get(source);
    const xmlData = response.data;
    const $ = load(xmlData, { xmlMode: true });

    const urls = $('url');
    global.siteMapThreads[source].urls = urls;
    global.siteMapThreads[source].remaining = urls.length;
    for (let i = 0; i < urls.length; i++) {
        const pageUrl = $(urls[i]).find('loc').text().trim();
        const lastMod = new Date($(urls[i]).find('lastmod').text().trim());

        // Check if page needs to be imported or updated
        const existingSource = await EmbeddingsCache.findOne({ source: pageUrl });
        if (existingSource && existingSource.loadedDate >= lastMod) {
            continue; // Skip if the source is up-to-date
        }
        try {
            // Get headers for the page
            const headers = await getHeaders(pageUrl);
            const pageType = headers.sourceType;
            const pageTitle = headers.title;

            let loader;
            switch (pageType) {
                case 'PDF':
                    loader = new PdfLoader({ filePathOrUrl: pageUrl });
                    break;
                case 'JSON':
                    const jsonResponse = await axios.get(pageUrl);
                    const jsonObject = jsonResponse.data;
                    loader = new JsonLoader({ object: jsonObject, recurse: true });
                    break;
                case 'text/plain':
                    loader = new TextLoader({ text: req.body.sourceText || '' });
                    break;
                case 'text/html':
                default:
                    loader = new WebLoader({ urlOrContent: pageUrl });
                    break;
            }

            // Retrieve chunks from the loader and calculate total tokens required
            let totalTokens = 0;
            for await (const chunk of loader.getChunks()) {
                const tokenCount = encode(chunk.pageContent).length;
                totalTokens += tokenCount;

                const user = await User.findById(req.session.user.id);
                if (totalTokens > user.tokens) {
                    delete global.siteMapThreads[source];
                    throw new Error('Insufficient tokens to load the source');
                }
            }

            await req.ragApplication.addLoader(loader);
            const uniqueId = loader.getUniqueId();
            newTransaction(req.session.user.id, uniqueId, "sources", "Load source", totalTokens * -1);

            const updateObject = { tokens: totalTokens, source: pageUrl, loadedDate: new Date(), type: pageType, title: pageTitle, overrideUrl: req.body.overrideUrl, siteMap: source };
            await EmbeddingsCache.findOneAndUpdate(
                { loaderId: uniqueId },
                { $set: updateObject },
                { upsert: true, new: true }
            );
            global.siteMapThreads[source].remaining -= 1;

        } catch(error) {
            if (global.siteMapThreads[source]) {
                global.siteMapThreads[source].errors.push(error.message);
            }
            continue;
        }  // Delay for 1 second between each page import
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    global.siteMapThreads[source].running = false;
}

async function addSource(req, res) {
    const { source, title, type, overrideUrl, sourceText } = req.body;
    try {
        const ragApplication = req.ragApplication;
        if (!ragApplication) {
            throw new Error('RAG Application is not initialized');
        }

        if (type === 'siteMap') {
            handleSiteMapImport(source, req);
            const data = {};
            data.uniqueId = "siteMap:" + source;
            return res.status(201).json(data);
        }

        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);

        let loader;
        // Normal addSource process for non-sitemap types
        switch (type) {
            case 'PDF':
                loader = new PdfLoader({ filePathOrUrl: source });
                break;
            case 'JSON':
                const response = await axios.get(source);
                const jsonObject = response.data;
                loader = new JsonLoader({ object: jsonObject, recurse: true });
                break;
            case 'text/plain':
                loader = new TextLoader({ text: sourceText || '' });
                break;
            case 'text/html':
            default:
                loader = new WebLoader({ urlOrContent: source });
                break;
        }

        const userId = req.session.user.id;
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        let totalTokens = 0;
        for await (const chunk of loader.getChunks()) {
            const tokenCount = encode(chunk.pageContent).length;
            totalTokens += tokenCount;

            if (totalTokens > user.tokens) {
                return res.status(400).json({ error: 'Insufficient tokens to load the source' });
            }
        }

        await ragApplication.addLoader(loader);
        const uniqueId = loader.getUniqueId();

        newTransaction(userId, uniqueId, "sources", "Load source", totalTokens * -1);

        const updateObject = { tokens: totalTokens, source, loadedDate: new Date(), type, title, overrideUrl };

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

async function getSourcesCount(req, res) {
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);

        // Use countDocuments to get the count of documents that match the criteria
        const count = await EmbeddingsCache.countDocuments({ loaderId: { $ne: "LOADERS_LIST_CACHE_KEY" } });

        res.json({ count });
    } catch (error) {
        if (!returnRawData) {
            res.status(500).json({ error: 'Failed to retrieve sources count' });
        } else {
            throw error;
        }
    }
}

async function getSources(req, res, returnRawData = false) {
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);

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
            return null;
        }
    }
}

async function getSource(req, res, returnRawData = false) {
    const uniqueId = req.params.loaderId;
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);

        const loader = await EmbeddingsCache.findOne({ loaderId: uniqueId });
        if (!loader) {
            if (returnRawData) {
                return null;
            } else {
                res.status(404).json({ error: 'Loader not found' });
            }
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
            return null;
        }
    }
}

async function updateSource(req, res) {
    const loaderId = req.params.loaderId;
    const { title, overrideUrl } = req.body;
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);

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
            // Proceed with cache deletion regardless of the result
            const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);
            await EmbeddingsCache.deleteOne({ loaderId: uniqueId });
            console.warn(`Loader with ID ${uniqueId} was not found or could not be deleted. No Chunks?`);
            res.sendStatus(204);
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete loader' });
    }
}

async function getSiteMapStatus(req, res) {
    try {
        const EmbeddingsCache = getEmbeddingsCacheModel(req.params.instanceId);
        const globalSiteMapUrls = Object.keys(global.siteMapThreads || {});

        // Iterate over global site map threads first
        const siteMapStatusesFromThreads = globalSiteMapUrls.map((siteMapUrl) => {
            const threadRunning = global.siteMapThreads[siteMapUrl];
            let totalUrls = threadRunning.urls.length;
            let completedUrls = totalUrls - threadRunning.remaining;

            return {
                siteMapUrl,
                threadRunning: threadRunning.running,
                totalUrls: totalUrls,
                completedUrls: completedUrls
            };
        });

        // Get unique site maps from the database that are not in the global threads
        const uniqueSiteMaps = await EmbeddingsCache.distinct('siteMap', {
            siteMap: { $exists: true, $nin: globalSiteMapUrls }
        });

        // Get statuses for those unique site maps
        const siteMapStatusesFromDatabase = await Promise.all(uniqueSiteMaps.map(async (siteMapUrl) => {
            let totalUrls = 0;
            let completedUrls = 0;

            const response = await axios.get(siteMapUrl);
            const xmlData = response.data;
            const $ = load(xmlData, { xmlMode: true });
            totalUrls = $('url').length;
            completedUrls = await EmbeddingsCache.countDocuments({ siteMap: siteMapUrl });

            return {
                siteMapUrl,
                threadRunning: false,
                totalUrls: totalUrls,
                completedUrls: completedUrls
            };
        }));

        const siteMapStatuses = [...siteMapStatusesFromThreads, ...siteMapStatusesFromDatabase];

        res.json(siteMapStatuses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve site map status' });
    }
}

export { addSource, getSources, getSourcesCount, getSource, updateSource, deleteSource, getHeaders, getSiteMapStatus };