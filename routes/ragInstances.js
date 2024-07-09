import express from 'express';
import { createRag } from '../controllers/ragInstance.js';
import { isAdmin } from '../middleware/auth.js';
import RagInstance from '../models/ragInstance.js';

const router = express.Router();

router.get('/', isAdmin, async (req, res) => {
    try {
        const ragInstances = await RagInstance.find({});
        if (req.accepts(['json', 'html']) === 'json') {
            res.json(ragInstances);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "RAG Instances";
            res.render('pages/rag/view');
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', isAdmin, createRag);
router.get('/add', isAdmin, (req, res) => {
    res.locals.pageTitle = "Add RAG Instance";
    res.render('pages/rag/add');
});

export default router;