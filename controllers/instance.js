import Instance from '../models/instance.js';
import { getEmbeddingsCacheModel } from '../models/embeddingsCache.js';
import mongoose from 'mongoose';
import { removeActiveInstanceFromCache } from '../middleware/auth.js';

async function createInstance(req, res, next) {
    try {
        const { name, description, ratingReward, isPublic, systemPrompt, suggestions, ratingResponses, model, embedModel } = req.body;
        const userId = req.user.id;

        // Validate the required fields
        if (!name || !systemPrompt) {
            const error = new Error('Name and systemPrompt are required');
            error.status = 400;
            return next(error);
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
        return next(error);
    }
}

// Fetch instance details, include sharedWith only if the user can admin the instance
async function getInstance(req, res, next) {
    try {
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
        }

        const userAccess = req.userAccess;

        // Clone the instance object before modifying it
        const clonedInstance = JSON.parse(JSON.stringify(instance));

        // Get list of admin emails from environment variable
        const adminEmails = process.env.ADMIN ? process.env.ADMIN.split(',') : [];

        if (req.user && adminEmails.includes(req.user.email)) {
            res.json(clonedInstance);
        } else if (userAccess && userAccess.role === 'instanceAdmin') {
            res.json(clonedInstance);
        } else {
            // If the user is not an admin, remove sensitive fields from the cloned object
            delete clonedInstance.sharedWith;
            delete clonedInstance.ratingResponses;
            delete clonedInstance.createdBy;
            delete clonedInstance.model.baseUrl;
            delete clonedInstance.model.apiKey;
            delete clonedInstance.embedModel.baseUrl;
            delete clonedInstance.embedModel.apiKey;
            res.json(clonedInstance);
        }
    } catch (error) {
        return next(error);
    }
}

// Function to update an instance
async function updateInstance(req, res, next) {
    try {
        const instanceId = req.params.instanceId;
        const newData = req.body;

        // Fetch the current instance data
        const currentInstance = await Instance.findById(instanceId);
        if (!currentInstance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
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
                    const error = new Error('When sources exist, only the embedModel.apiKey field can be updated.');
                    error.status = 400;
                    return next(error);
                }
            }
        }

        // Update the instance
        const updatedInstance = await Instance.findByIdAndUpdate(instanceId, newData, { new: true });

        if (!updatedInstance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
        }


        // Remove from cache
        removeActiveInstanceFromCache(instanceId);

        // Send the updated instance as a response
        res.json(updatedInstance);
    } catch (error) {
        return next(error)
    }
}

async function deleteInstance(req, res, next) {
    try {
        const instanceId = req.params.instanceId;

        // Find the instance to ensure it exists
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
        }

        const dbName = instanceId; // Using instanceId as the database name

        try {
            const connection = mongoose.connection.useDb(dbName, { useCache: true });

            // Drop the entire database using mongoose's connection
            connection.db.dropDatabase((err, result) => {
                if (err) {
                    console.error('Error dropping database:', err);
                    const error = new Error('Failed to delete associated database');
                    error.status = 500;
                    return next(error);
                }
                console.log('Database deleted successfully');
                connection.close();
            });

        } catch (err) {
            return next(error);
        }

        // Delete the instance from the master database
        await Instance.findByIdAndDelete(instanceId);

        res.sendStatus(204);
    } catch (error) {
        return next(error);
    }
}

async function addUserToInstance(req, res, next) {
    try {

        const { email, role } = req.body;
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
        }

        // Ensure sharedWith is initialized as an array
        if (!Array.isArray(instance.sharedWith)) {
            instance.sharedWith = [];
        }

        // Check if user is already shared with
        const existingUser = instance.sharedWith.find(user => user.email === email);
        if (existingUser) {
            const error = new Error('User already shared with instance');
            error.status = 400;
            return next(error);
        }

        // Add user to sharedWith
        instance.sharedWith.push({ email, role });
        await instance.save();

        res.json(instance);
    } catch (error) {
        return next(error);
    }
};

async function removeUserFromInstance(req, res, next) {
    try {
        const { email } = req.params;
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            const error = new Error('Instance not found');
            error.status = 404;
            return next(error);
        }

        // Remove user from sharedWith
        instance.sharedWith = instance.sharedWith.filter(user => user.email !== email);
        await instance.save();

        res.json(instance);
    } catch (error) {
        return next(error);
    }
};

export { createInstance, getInstance, updateInstance, deleteInstance, addUserToInstance, removeUserFromInstance };