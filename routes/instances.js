import express from 'express';
import { createInstance } from '../controllers/instance.js';
import { ensureAuthenticated, isAdmin } from '../middleware/auth.js';
import Instance from '../models/instance.js';

const router = express.Router();

router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        const userEmail = req.user.email;

        const instances = await Instance.find({
            $or: [
                { createdBy: userId },
                { public: true },
                { 'sharedWith.email': userEmail }
            ]
        });

        const result = instances.map(instance => {
            if (instance.createdBy.equals(userId)) {
                return instance;
            } else {
                return {
                    _id: instance._id,
                    name: instance.name,
                    description: instance.description,
                    public: instance.public
                };
            }
        });

        if (req.accepts(['json', 'html']) === 'json') {
            res.json(result);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Instances";
            res.render('pages/instances/view');
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', ensureAuthenticated, createInstance);
router.get('/add', ensureAuthenticated, isAdmin, (req, res) => {
    res.locals.pageTitle = "Add Instance";
    res.render('pages/instances/add');
});

export default router;