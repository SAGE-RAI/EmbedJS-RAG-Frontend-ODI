import express from 'express';
import { getInstance, updateInstance, deleteInstance, addUserToInstance, removeUserFromInstance } from '../controllers/instance.js'
import { ensureAuthenticated, canAccessInstance, isAdmin, canAdminInstance } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

router.get('/', ensureAuthenticated, canAccessInstance, async (req, res) => {
    try {
        if (req.accepts(['json', 'html']) === 'json') {
            return getInstance(req, res);
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "View Instance";
            res.render('pages/instance/view', { instanceId: req.params.instanceId });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/edit', ensureAuthenticated, isAdmin, canAdminInstance, (req, res) => {
    res.locals.pageTitle = "Edit Instance";
    res.render('pages/instance/edit', { instanceId: req.params.instanceId });
});

router.put('/', ensureAuthenticated, canAdminInstance, updateInstance);
router.delete('/', ensureAuthenticated, canAdminInstance, deleteInstance);

// Add user to instance
router.post('/sharedWith', ensureAuthenticated, canAdminInstance, addUserToInstance);

// Route to view sharedWith management page
router.get('/sharedWith', ensureAuthenticated, canAdminInstance, (req, res) => {
    res.locals.pageTitle = "Manage Shared Users";
    res.render('pages/instance/sharedWith', { instanceId: req.params.instanceId });
});

// Remove user from instance
router.delete('/sharedWith/:email', ensureAuthenticated, canAdminInstance, removeUserFromInstance);

export default router;