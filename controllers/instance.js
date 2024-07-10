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

        const newinstance = new instance({
            name,
            description,
            dbName,
            createdBy: userId,
            public: isPublic || false
        });
        await newinstance.save();
        res.status(201).json(newinstance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getInstance(req, res) {
    try {
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'instance not found' });
        }
        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateInstance(req, res) {
    try {
        const { name, description, isPublic } = req.body;
        const instance = await Instance.findById(req.params.instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }
        if (name) instance.name = name;
        if (description) instance.description = description;
        if (isPublic !== undefined) instance.public = isPublic;
        await instance.save();
        res.json(instance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteInstance(req, res) {
    try {
        const instanceId = req.params.instanceId;

        // Find the RAG instance to get the database name
        const instance = await Instance.findById(instanceId);
        if (!instance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }

        const dbName = instance.dbName;
        const mongoUri = process.env.MONGO_URI;

        // Drop the associated database
        const connection = mongoose.createConnection(`${mongoUri}/${dbName}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        await connection.dropDatabase();
        await connection.close();

        // Delete the RAG instance from the master database
        await Instance.findByIdAndDelete(instanceId);

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export { createInstance, getInstance, updateInstance, deleteInstance };