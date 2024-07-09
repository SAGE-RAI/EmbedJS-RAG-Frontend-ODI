import express from 'express';
import { addSource, getSources, getSource, updateSource, deleteSource } from '../controllers/source.js';
import { ensureAuthenticated, checkOwnership, canAccessRag } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Route to view and add sources
router.get('/add', ensureAuthenticated, canAccessRag, (req, res) => {
    res.locals.pageTitle = "Add Source";
    res.render('pages/sources/add', { ragId: req.params.ragId });
});

// Route to view and add sources
router.get('/import', ensureAuthenticated, canAccessRag, (req, res) => {
    res.locals.pageTitle = "Bulk Import";
    res.render('pages/sources/import', { ragId: req.params.ragId });
});

router.post('/', ensureAuthenticated, checkOwnership, addSource);

// Route to list sources with content negotiation
router.get('/', ensureAuthenticated, canAccessRag, async (req, res) => {
    try {
        const sources = await getSources(req, res, true); // Use a flag to return raw data
        if (req.accepts(['json', 'html']) === 'json') {
            res.json(sources);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Sources";
            res.render('pages/sources/view', { ragId: req.params.ragId });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Route to get a specific source with content negotiation
router.get('/:loaderId', ensureAuthenticated, canAccessRag, async (req, res) => {
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

router.put('/:loaderId', ensureAuthenticated, checkOwnership, updateSource);
router.delete('/:loaderId', ensureAuthenticated, checkOwnership, deleteSource);

export default router;