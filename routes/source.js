import express from 'express';
import { addSource, getSources, getSource, updateSource, deleteSource } from '../controllers/source.js';
import { ensureAuthenticated, checkOwnership, setActiveInstance, canAccessInstance, canEditSources } from '../middleware/auth.js';
import fetch from 'node-fetch'; // Import node-fetch
import { load } from 'cheerio';
import pdfParse from 'pdf-parse'

const router = express.Router({ mergeParams: true });

// Route to fetch headers and title
router.get('/headers', ensureAuthenticated, async (req, res) => {
    try {
        const { url } = req.query; // Get the URL from query parameters

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
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

            // Fetch the actual JSON content
            const jsonResponse = await fetch(url);
            const jsonData = await jsonResponse.json();

            // Attempt to extract title from JSON metadata (adjust based on JSON structure)
            if (jsonData.title) {
                title = jsonData.title;
            } else if (jsonData.metadata && jsonData.metadata.title) {
                title = jsonData.metadata.title;
            } else {
                title = 'Untitled JSON';
            }

        } else if (contentType.includes('application/pdf')) {
            sourceType = 'PDF';

            // Fetch the actual PDF content and extract title from metadata
            const pdfResponse = await fetch(url);
            const pdfBuffer = await pdfResponse.arrayBuffer();
            const pdfData = await pdfParse(pdfBuffer);
            title = pdfData.info.Title || 'Untitled PDF';

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

        // Send back the headers as JSON
        res.json({ contentType, sourceType, title });
    } catch (error) {
        console.error('Error fetching headers:', error);
        res.status(500).json({ error: 'Failed to fetch headers' });
    }
});


// Route to view and add sources
router.get('/add', ensureAuthenticated, canAccessInstance, canEditSources, (req, res) => {
    res.locals.pageTitle = "Add Source";
    res.render('pages/sources/add', { instanceId: req.params.instanceId });
});

// Route to view and add sources
router.get('/import', ensureAuthenticated, canAccessInstance, canEditSources, (req, res) => {
    res.locals.pageTitle = "Bulk Import";
    res.render('pages/sources/import', { instanceId: req.params.instanceId });
});

router.post('/', ensureAuthenticated, canAccessInstance, canEditSources, setActiveInstance, addSource);

// Route to list sources with content negotiation
router.get('/', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const sources = await getSources(req, res, true); // Use a flag to return raw data
        if (req.accepts(['json', 'html']) === 'json') {
            res.json(sources);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Sources";
            res.render('pages/sources/view', { instanceId: req.params.instanceId });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get a specific source with content negotiation
router.get('/:loaderId', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const source = await getSource(req, res, true); // Use a flag to return raw data
        if (req.accepts(['json', 'html']) === 'json') {
            res.json(source);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Edit Source";
            res.render('pages/sources/edit', { source });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:loaderId', ensureAuthenticated, canAccessInstance, canEditSources, updateSource);
router.delete('/:loaderId', ensureAuthenticated, canAccessInstance, setActiveInstance, canEditSources, deleteSource);

export default router;