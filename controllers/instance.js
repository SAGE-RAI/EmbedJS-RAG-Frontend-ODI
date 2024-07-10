import Instance from '../models/instance.js';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';

// Function to generate a sanitized database name
function generateDatabaseName(userId, instanceName) {
    return `${userId}_${sanitize(instanceName).replace(/\s+/g, '_')}`;
}

async function createInstance(req, res) {
    try {
        const { name, description, isPublic } = req.body;
        const userId = req.user.id;

        // Generate the database name
        const dbName = generateDatabaseName(userId, name);
        const newInstance = new Instance({
            name,
            description,
            dbName,
            createdBy: userId,
            public: isPublic || false
        });
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

        if (!req.isAdmin && (!userAccess || userAccess.role !== 'instanceAdmin')) {
            // If the user is not an admin and doesn't have instanceAdmin role, remove sharedWith
            delete instance.sharedWith;
        }

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
        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

async function deleteInstance(req, res) {
    try {
        const instanceId = req.params.instanceId;

        // Find the RAG instance to get the database name
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const dbName = instance.dbName;
        const mongoUri = process.env.MONGO_URI;

        // Drop the associated database
        try {
            const connection = mongoose.createConnection(`${mongoUri}/${dbName}`, {});

            await connection.dropDatabase();
            await connection.close();
        } catch(err) {
        }

        // Delete the RAG instance from the master database
        await Instance.findByIdAndDelete(instanceId);

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