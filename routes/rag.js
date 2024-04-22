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
    if (!req.isAuthenticated()) {
      return res.redirect('/auth/google'); // Return the redirect response
    }
    // Check if authMethod session variable is set to 'google'
    if (req.session.authMethod === 'google') {
        next(); // Proceed to the next middleware or route handler
    } else {
        // If user is not authenticated, send permission denied error
        res.status(403).send('Permission denied');
    }
}

async function reload(uniqueLoaderId) {
  try {
      // Get source (source), title, and type from the cache
      const loader = await EmbeddingsCache.findOne({ loaderId: uniqueLoaderId });

      if (!loader) {
          throw new Error('Loader not found');
      }

      const { source, title, type } = loader;

      // Call deleteLoader(uniqueLoaderId)
      const deleteResult = await deleteLoader(uniqueLoaderId);

      if (!deleteResult) {
          throw new Error('Failed to delete loader');
      }

      // Call addSource(source, title, type)
      const addSourceResult = await addSource(source, title, type);

      return addSourceResult;
  } catch (error) {
      console.error('Failed to reload loader:', error);
      throw error;
  }
}

async function deleteLoader(uniqueLoaderId) {
    const deleteResult = await ragApplication.deleteEmbeddingsFromLoader(uniqueLoaderId, true);
    if (deleteResult) {
      console.log(`Embeddings associated with loader ${uniqueLoaderId} deleted successfully.`);
      return true;
    } else {
      console.log(`Failed to delete embeddings associated with loader ${uniqueLoaderId}.`);
      return false;
    }
}

// Function to add a new source
async function addSource(source, title, type) {
  if (!ragApplication) {
      throw new Error('RAG Application is not initialized');
  }

  const loader = new WebLoader({ url: source });
  await ragApplication.addLoader(loader);

  const uniqueId = loader.getUniqueId();
  const updateObject = {
      source: source,
      loadedDate: new Date()
  };

  if (title !== null) {
      updateObject.title = title;
  }

  if (type !== null) {
      updateObject.type = type;
  }

  const updateResult = await EmbeddingsCache.findOneAndUpdate(
      { loaderId: uniqueId },
      { $set: updateObject },
      { upsert: true, new: true }
  );

  if (!updateResult) {
      throw new Error('Failed to update cache database with loader information');
  }

  return { uniqueId };
}

router.post('/sources', isAdmin, async (req, res) => {
  const { source, title, type } = req.body;

  try {
      if (!source) {
          throw new Error('Source is required');
      }

      const result = await addSource(source, title, type);
      res.json(result);
  } catch (error) {
      console.error('Failed to add source:', error);
      res.status(500).json({ error: error.message });
  }
});


// Route to update an existing loader's metadata
router.post('/sources/:loaderId', isAdmin, async (req, res) => {
  const loaderId = req.params.loaderId;
  const { title, type } = req.body;

  try {
      // Create an update object with updated fields
      const updateObject = {};

      // Set the "title" field if it is not null
      if (title !== null) {
          updateObject.title = title;
      }

      // Set the "type" field if it is not null
      if (type !== null) {
          updateObject.type = type;
      }

      // Update the existing document in the EmbeddingsCache collection
      const updateResult = await EmbeddingsCache.findOneAndUpdate(
          { loaderId: loaderId },
          { $set: updateObject },
          { new: true } // Return the updated document
      );

      if (!updateResult) {
          console.error('Failed to update cache database with loader information');
          return res.status(500).json({ error: 'Failed to update cache database with loader information' });
      }

      res.json({ uniqueId: loaderId }); // Respond with the updated loaderId
  } catch (error) {
      console.error('Failed to update loader:', error);
      res.status(500).json({ error: 'Failed to update loader' });
  }
});

// Route to retrieve all loaders
router.get('/sources', isAdmin, async (req, res) => {
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

// Route to retrieve a single loader by its uniqueId
router.get('/sources/:uniqueId', async (req, res) => {
  const uniqueId = req.params.uniqueId;

  try {
      // Find the document in the EmbeddingsCache collection by uniqueId
      const loader = await EmbeddingsCache.findOne({ loaderId: uniqueId });

      if (!loader) {
          return res.status(404).json({ error: 'Loader not found' });
      }

      res.json({ loader });
  } catch (error) {
      console.error('Failed to retrieve loader:', error);
      res.status(500).json({ error: 'Failed to retrieve loader' });
  }
});

// Route to delete a loader
router.delete('/sources/:uniqueId', isAdmin, async (req, res) => {
  const uniqueId = req.params.uniqueId;
  if (!ragApplication) {
    return res.status(500).json({ error: 'RAG Application is not initialized' });
  }

  const result = await deleteLoader(uniqueId);
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
router.get('/embeddings/count', isAdmin, async (req, res) => {
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