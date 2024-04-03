const Token = require('../models/token'); // Import the Token model

async function verifyToken(accessToken) {
  try {
    // Find the token in the database
    const tokenDoc = await Token.findOne({ accessToken });

    // If token not found, return false
    if (!tokenDoc) {
      return false;
    }

    // Check if the token has expired
    if (tokenDoc.expiry < new Date()) {
      // Token has expired, delete it from the database and return false
      await Token.deleteOne({ accessToken });
      return false;
    }

    // Token is valid
    return true;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

// Function to process the token
async function processToken(accessToken,userId) {
  if (!accessToken) {
    return;
  }
  let token = await Token.findOne({ accessToken: accessToken });
  if (!token) {
    token = new Token({
      accessToken: accessToken,
      userId: userId,
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
    });
  } else {
    token.expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
  }

  await token.save();
}

async function getUserIDFromToken(accessToken) {
  try {
    // Find the token in the database
    const tokenDoc = await Token.findOne({ accessToken });

    // If token not found, return null or throw an error
    if (!tokenDoc) {
      throw new Error('Token not found');
    }

    // Return the user ID associated with the token
    return tokenDoc.userId;
  } catch (error) {
    console.error('Error retrieving user ID from token:', error);
    throw error; // Rethrow the error
  }
}

module.exports = { processToken , verifyToken, getUserIDFromToken };