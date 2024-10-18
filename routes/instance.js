import express from 'express';
import { getInstance, updateInstance, deleteInstance, addUserToInstance, removeUserFromInstance } from '../controllers/instance.js';
import { ensureAuthenticated, canAccessInstance, canAdminInstance } from '../middleware/auth.js';
import { getRatingsReport } from '../controllers/conversation.js';

const router = express.Router({ mergeParams: true });

router.get('/', async (req, res, next) => {
    try {
        if (req.accepts(['json', 'html']) === 'json') {
            return getInstance(req, res, next); // Pass next to the controller
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "View Instance";
            let userCanAdminInstance = false;
            // Try to call canAdminInstance and set userCanAdminInstance accordingly
            try {
                await canAdminInstance(req, res, (err) => {
                    if (!err) {
                        userCanAdminInstance = true;
                    }
                });
            } catch (error) {
                userCanAdminInstance = false; // Set to false if there's an error
            }
            console.log('can admin instance ' + userCanAdminInstance);
            res.render('pages/instance/view', { instanceId: req.params.instanceId, userCanAdminInstance: userCanAdminInstance });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        next(error); // Forward error to the error handler
    }
});

router.get('/edit', ensureAuthenticated, canAdminInstance, (req, res) => {
    res.locals.pageTitle = "Edit Instance";
    res.render('pages/instance/edit', { instanceId: req.params.instanceId });
});

// Get ratings report
router.get("/ratingsReport", ensureAuthenticated, canAdminInstance, async (req, res, next) => {
    try {
        if (req.accepts(['json', 'html']) === 'json') {
            return getRatingsReport(req, res, next); // Pass next to the controller
        } else if (req.accepts(['html', 'json']) === 'html') {
            res.locals.pageTitle = "Ratings report";
            res.render('pages/instance/ratingsReport', { instanceId: req.params.instanceId });
        } else {
            res.status(406).send('Not Acceptable');
        }
    } catch (error) {
        next(error); // Forward error to the error handler
    }
});

router.put('/', ensureAuthenticated, canAdminInstance, (req, res, next) => updateInstance(req, res, next)); // Pass next to the controller
router.delete('/', ensureAuthenticated, canAdminInstance, (req, res, next) => deleteInstance(req, res, next)); // Pass next to the controller

// Add user to instance
router.post('/sharedWith', ensureAuthenticated, canAdminInstance, (req, res, next) => addUserToInstance(req, res, next)); // Pass next to the controller

// Route to view sharedWith management page
router.get('/sharedWith', ensureAuthenticated, canAdminInstance, (req, res) => {
    res.locals.pageTitle = "Manage Shared Users";
    res.render('pages/instance/sharedWith', { instanceId: req.params.instanceId });
});

// Remove user from instance
router.delete('/sharedWith/:email', ensureAuthenticated, canAdminInstance, (req, res, next) => removeUserFromInstance(req, res, next)); // Pass next to the controller

export default router;