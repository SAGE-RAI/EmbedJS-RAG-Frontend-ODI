import express from 'express';
import { addSource, getSources, getSource, updateSource, deleteSource } from '../controllers/source.js';
import { ensureAuthenticated, checkOwnership, canAccessInstance } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Route to view and add sources
router.get('/add', ensureAuthenticated, canAccessInstance, (req, res) => {
    res.locals.pageTitle = "Add Source";
    res.render('pages/sources/add', { instanceId: req.params.instanceId });
});

// Route to view and add sources
router.get('/import', ensureAuthenticated, canAccessInstance, (req, res) => {
    res.locals.pageTitle = "Bulk Import";
    res.render('pages/sources/import', { instanceId: req.params.instanceId });
});

router.post('/', ensureAuthenticated, checkOwnership, addSource);

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

router.put('/:loaderId', ensureAuthenticated, checkOwnership, updateSource);
router.delete('/:loaderId', ensureAuthenticated, checkOwnership, deleteSource);

export default router;