// admin.js
// rag routes

const express = require('express');
const router = express.Router();
const { WebLoader } = require('@llm-tools/embedjs');
const EmbeddingsCache = require('../models/embeddingsCache'); // Import the embeddingsCache model

let ragApplication;

// Function to set the RAG application instance
function setRAGApplication(application) {
    ragApplication = application;
}

function isAdmin(req, res, next) {
    next();
    // Check if authMethod session variable is set to 'google'
    if (req.session.authMethod === 'google') {
        next(); // Proceed to the next middleware or route handler
    } else {
        // If user is not authenticated, send permission denied error
        res.status(403).send('Permission denied');
    }
}

async function deleteLoader(ragApplication, uniqueLoaderId, areYouSure = false) {
    if (!areYouSure) {
      console.warn('Delete loader called without confirmation. No action taken.');
      return false;
    }
    const deleteResult = await ragApplication.deleteEmbeddingsFromLoader(uniqueLoaderId, true);
    if (deleteResult) {
      console.log(`Embeddings associated with loader ${uniqueLoaderId} deleted successfully.`);
      return true;
    } else {
      console.log(`Failed to delete embeddings associated with loader ${uniqueLoaderId}.`);
      return false;
    }
}

// Route to create a new loader
router.post('/loader', async (req, res) => {
  const { url, type } = req.body;
  console.log(url);
  if (!ragApplication) {
    return res.status(500).json({ error: 'RAG Application is not initialized' });
  }

  const loader = new WebLoader({ url });

  try {
    await ragApplication.addLoader(loader);

    // Get the unique ID of the loader
    const uniqueId = loader.getUniqueId();
    // Update the existing document in the EmbeddingsCache collection
    const updateResult = await EmbeddingsCache.findOneAndUpdate(
        { loaderId: uniqueId },
        {
          $set: {
            source: url,
            loadedDate: new Date()
          }
        },
        { upsert: true, new: true } // Create a new document if it doesn't exist, return the updated document
      );

    if (!updateResult) {
      console.error('Failed to update cache database with loader information');
      return res.status(500).json({ error: 'Failed to update cache database with loader information' });
    }

    res.json({ uniqueId });
  } catch (error) {
    console.error('Failed to add loader:', error);
    res.status(500).json({ error: 'Failed to add loader' });
  }
});

// Route to retrieve all loaders
router.get('/loader', async (req, res) => {
    if (!ragApplication) {
      return res.status(500).json({ error: 'RAG Application is not initialized' });
    }

    try {
      // Find all documents in the EmbeddingsCache collection
      const loaders = await EmbeddingsCache.find({});

      res.json({ loaders });
    } catch (error) {
      console.error('Failed to retrieve loaders:', error);
      res.status(500).json({ error: 'Failed to retrieve loaders' });
    }
});

// Route to delete a loader
router.delete('/loader/:uniqueId', async (req, res) => {
  const uniqueId = req.params.uniqueId;
  if (!ragApplication) {
    return res.status(500).json({ error: 'RAG Application is not initialized' });
  }

  const result = await deleteLoader(ragApplication, uniqueId, true);
  if (result) {
    res.sendStatus(200);
  } else {
    res.status(500).json({ error: 'Failed to delete loader' });
  }
});

// Route to run a query
router.get('/', async (req, res) => {
  const query = req.query.query;
  if (!ragApplication) {
    return res.status(500).json({ error: 'RAG Application is not initialized' });
  }

  try {
    const response = await ragApplication.query(query);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run query' });
  }
});

// Route to get embeddings count
router.get('/embeddings/count', async (req, res) => {
    if (!ragApplication) {
      return res.status(500).json({ error: 'RAG Application is not initialized' });
    }

    try {
      const count = await ragApplication.getEmbeddingsCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get embeddings count' });
    }
});

  // Route to get context for a query
router.get('/context', async (req, res) => {
    const query = req.query.query;
    if (!ragApplication) {
      return res.status(500).json({ error: 'RAG Application is not initialized' });
    }

    try {
      const context = await ragApplication.getContext(query);
      res.json({ context });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get context for query' });
    }
});

module.exports = { router, setRAGApplication };