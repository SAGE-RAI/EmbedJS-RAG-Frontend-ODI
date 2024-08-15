import Instance from '../models/instance.js';
import mongoose from 'mongoose';
import { removeActiveInstanceFromCache } from '../middleware/auth.js';

async function createInstance(req, res) {
    try {
        const { name, description, isPublic, systemPrompt, suggestions, ratingResponses } = req.body;
        const userId = req.user.id;

        // Validate the required fields
        if (!name || !systemPrompt) {
            return res.status(400).json({ error: 'Name and systemPrompt are required' });
        }

        // Create the new instance
        const newInstance = new Instance({
            name,
            description,
            public: isPublic || false,
            systemPrompt,
            suggestions: suggestions || [], // Default to empty array if not provided
            ratingResponses: ratingResponses || { '1': [], '2': [], '3': [], '4': [], '5': [] }, // Default to empty arrays if not provided
            createdBy: userId
        });

        // Save the instance to the database
        await newInstance.save();
        res.status(201).json(newInstance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Fetch instance details, include sharedWith only if the user can admin the instance
async function getInstance(req, res) {
    try {
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const userAccess = req.userAccess;

        if (!userAccess || userAccess.role !== 'instanceAdmin') {
            // If the user is not an admin and doesn't have instanceAdmin role, remove sharedWith
            delete instance.sharedWith;
        }
        /*
        if (!instance.systemPrompt) {
            console.log(req.ragApplication.queryTemplate);
            instance.systemPrompt = req.ragApplication.queryTemplate;
        }
        */

        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Function to update an instance
async function updateInstance(req, res) {
    try {
        const instance = await Instance.findByIdAndUpdate(req.params.instanceId, req.body, { new: true });
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }
        removeActiveInstanceFromCache(req.params.instanceId);
        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function deleteInstance(req, res) {
    try {
        const instanceId = req.params.instanceId;

        // Find the instance to ensure it exists
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const mongoUri = process.env.MONGO_URI;
        const dbName = instanceId; // Using instanceId as the database name

        try {
            // Connect to the associated database
            const connection = await mongoose.createConnection(`${mongoUri}/${dbName}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });

            // Drop the associated database
            await connection.dropDatabase();
            await connection.close();
        } catch (err) {
            console.log('Failed to delete database');
            console.log(err);
            return res.status(500).json({ error: 'Failed to delete associated database' });
        }

        // Delete the instance from the master database
        //await Instance.findByIdAndDelete(instanceId);

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function addUserToInstance(req, res) {
    try {

        const { email, role } = req.body;
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Ensure sharedWith is initialized as an array
        if (!Array.isArray(instance.sharedWith)) {
            instance.sharedWith = [];
        }

        // Check if user is already shared with
        const existingUser = instance.sharedWith.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already shared with instance' });
        }

        // Add user to sharedWith
        instance.sharedWith.push({ email, role });
        await instance.save();

        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function removeUserFromInstance(req, res) {
    try {
        const { email } = req.params;
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Remove user from sharedWith
        instance.sharedWith = instance.sharedWith.filter(user => user.email !== email);
        await instance.save();

        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export { createInstance, getInstance, updateInstance, deleteInstance, addUserToInstance, removeUserFromInstance };