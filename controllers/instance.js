import Instance from '../models/instance.js';
import { getEmbeddingsCacheModel } from '../models/embeddingsCache.js';
import mongoose from 'mongoose';
import { removeActiveInstanceFromCache } from '../middleware/auth.js';

async function createInstance(req, res) {
    try {
        const { name, description, ratingReward, isPublic, systemPrompt, suggestions, ratingResponses, model, embedModel } = req.body;
        const userId = req.user.id;

        // Validate the required fields
        if (!name || !systemPrompt) {
            return res.status(400).json({ error: 'Name and systemPrompt are required' });
        }

        // Check if provider is 'Default' and get values from config
        if (model.provider === "Default") {
            model.provider = process.env.MODEL_PROVIDER;
            model.name = process.env.MODEL_NAME;
        }

        if (embedModel.provider === "Default") {
            embedModel.provider =  process.env.EMBED_PROVIDER;
            embedModel.name = process.env.EMBED_MODEL_NAME;
            embedModel.dimensions = process.env.EMBED_DIMENSIONS;
        }

        // Create the new instance
        const newInstance = new Instance({
            name,
            description,
            ratingReward,
            public: isPublic || false,
            systemPrompt,
            embedModel,
            model,
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
            delete instance.model.baseUrl;
            delete instance.model.apiKey;
            delete instance.embedModel.baseUrl;
            delete instance.embedModel.apiKey;
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
        const instanceId = req.params.instanceId;
        const newData = req.body;

        // Fetch the current instance data
        const currentInstance = await Instance.findById(instanceId);
        if (!currentInstance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const EmbeddingsCache = getEmbeddingsCacheModel(req.session.activeInstance.id);

        // Use countDocuments to get the count of documents that match the criteria
        const sourceCount = await EmbeddingsCache.countDocuments({ loaderId: { $ne: "LOADERS_LIST_CACHE_KEY" } });

        if (sourceCount > 0) {
            // If sources exist, ensure only embedModel.apiKey is updated
            if (newData.embedModel) {
                const currentEmbedModel = currentInstance.embedModel || {};
                const newEmbedModel = newData.embedModel;

                // Check if any field other than apiKey is different
                let illegalChange = false;
                for (let newField of ['provider', 'name', 'baseUrl']) {
                    if (newEmbedModel[newField] && newEmbedModel[newField] !== currentEmbedModel[newField]) {
                        illegalChange = true;
                        break; // If any field is different, flag illegal change
                    }
                }

                if (!illegalChange) {
                    // Add back the provider, name, and baseUrl from currentEmbedModel to newData.embedModel
                    newData.embedModel.provider = currentEmbedModel.provider;
                    newData.embedModel.name = currentEmbedModel.name;
                    newData.embedModel.baseUrl = currentEmbedModel.baseUrl;

                } else {
                    return res.status(400).json({ error: 'When sources exist, only the embedModel.apiKey field can be updated.' });
                }
            }
        }

        // Update the instance
        const updatedInstance = await Instance.findByIdAndUpdate(instanceId, newData, { new: true });

        if (!updatedInstance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        // Remove from cache
        removeActiveInstanceFromCache(instanceId);

        // Send the updated instance as a response
        res.json(updatedInstance);
    } catch (error) {
        console.error('Error updating instance:', error);
        res.status(500).json({ error: error.message });
    }
}

async function deleteInstance(req, res) {
    try {
        const instanceId = req.params.instanceId;

        // Find the instance to ensure it exists
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'Instance not found' });
        }

        const dbName = instanceId; // Using instanceId as the database name

        try {
            const connection = mongoose.connection.useDb(dbName, { useCache: true });

            // Drop the entire database using mongoose's connection
            connection.db.dropDatabase((err, result) => {
                if (err) {
                    console.error('Error dropping database:', err);
                    return res.status(500).json({ error: 'Failed to delete associated database' });
                }
                console.log('Database deleted successfully');
                connection.close();
            });

        } catch (err) {
            console.error('Failed to delete database');
            console.error(err);
            return res.status(500).json({ error: 'Failed to delete associated database' });
        }

        // Delete the instance from the master database
        await Instance.findByIdAndDelete(instanceId);

        res.sendStatus(204);
    } catch (error) {
        console.error('Error in deleteInstance:', error);
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