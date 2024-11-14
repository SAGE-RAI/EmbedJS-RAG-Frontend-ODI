import express from 'express';
import { addSource, getSources, getSource, updateSource, deleteSource, getSourcesCount, getHeaders, getSiteMapStatus, updateSiteMap } from '../controllers/source.js';
import { ensureAuthenticated, checkOwnership, setActiveInstance, canAccessInstance, canEditSources } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/headers', ensureAuthenticated, async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        const headers = await getHeaders(url);
        res.json(headers);
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

// Route to get sitemap status
router.get('/sitemap/status', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        await getSiteMapStatus(req, res);
    } catch (error) {
        console.error('Error fetching sitemap status:', error);
        res.status(500).json({ error: 'Failed to fetch sitemap status' });
    }
});

router.post('/sitemap/update', ensureAuthenticated, canAccessInstance, canEditSources, setActiveInstance, updateSiteMap);

router.post('/', ensureAuthenticated, canAccessInstance, canEditSources, setActiveInstance, addSource);

// Route to list sources with content negotiation
router.get('/', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const sources = await getSources(req, res, true); // Use a flag to return raw data
        let userCanEditSources = false;
        try {
            await canEditSources(req, res, () => {
                userCanEditSources = true;
            });
        } catch (error) {
            userCanEditSources = false;
        } // Check if user can edit sources

        if (req.accepts(['json', 'html']) === 'json') {
            res.json(sources);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Sources";
            res.render('pages/sources/view', { instanceId: req.params.instanceId, userCanEditSources: userCanEditSources });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to list sources with content negotiation
router.get('/count', ensureAuthenticated, canAccessInstance, getSourcesCount);

// Route to get a specific source with content negotiation
router.get('/:loaderId', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        const source = await getSource(req, res, true); // Use a flag to return raw data
        if (!source) {
            res.status(404).send('Source Not Found');
        } else if (req.accepts(['json', 'html']) === 'json') {
            res.json(source);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Edit Source";
            res.render('pages/sources/edit', { source });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

router.put('/:loaderId', ensureAuthenticated, canAccessInstance, canEditSources, updateSource);
router.delete('/:loaderId', ensureAuthenticated, canAccessInstance, setActiveInstance, canEditSources, deleteSource);

export default router;