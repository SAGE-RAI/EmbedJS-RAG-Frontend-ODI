import RagInstance from '../models/ragInstance.js';
import sanitize from 'sanitize-filename';
import mongoose from 'mongoose';

// Function to generate a sanitized database name
function generateDatabaseName(userId, instanceName) {
    return `${userId}_${sanitize(instanceName).replace(/\s+/g, '_')}`;
}

async function createRag(req, res) {
    try {
        const { name, description, isPublic } = req.body;
        const userId = req.user.id;

        // Generate the database name
        const dbName = generateDatabaseName(userId, name);

        const newRagInstance = new RagInstance({
            name,
            description,
            dbName,
            createdBy: userId,
            public: isPublic || false
        });
        await newRagInstance.save();
        res.status(201).json(newRagInstance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function getRag(req, res) {
    try {
        const ragInstance = await RagInstance.findById(req.params.ragId);
        if (!ragInstance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }
        res.json(ragInstance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function updateRag(req, res) {
    try {
        const { name, description, isPublic } = req.body;
        const ragInstance = await RagInstance.findById(req.params.ragId);
        if (!ragInstance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }
        if (name) ragInstance.name = name;
        if (description) ragInstance.description = description;
        if (isPublic !== undefined) ragInstance.public = isPublic;
        await ragInstance.save();
        res.json(ragInstance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function deleteRag(req, res) {
    try {
        const ragId = req.params.ragId;

        // Find the RAG instance to get the database name
        const ragInstance = await RagInstance.findById(ragId);
        if (!ragInstance) {
            return res.status(404).json({ error: 'RAG instance not found' });
        }

        const dbName = ragInstance.dbName;
        const mongoUri = process.env.MONGO_URI;

        // Drop the associated database
        const connection = mongoose.createConnection(`${mongoUri}/${dbName}`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        await connection.dropDatabase();
        await connection.close();

        // Delete the RAG instance from the master database
        await RagInstance.findByIdAndDelete(ragId);

        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export { createRag, getRag, updateRag, deleteRag };