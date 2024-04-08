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

    // Update the expiration date to be 24 hours from now
    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    tokenDoc.expiry = expirationDate;
    await tokenDoc.save();

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

async function deleteOldTokens() {
  console.log('finding old tokens');
  try {
    // Calculate the cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now());

    // Find conversations that meet the criteria
    const tokensToDelete = await Token.find({
      expiry: { $lt: cutoffTime } // Expired tokens
    });

    // Iterate over each conversation document and delete it
    // Iterate over each conversation and delete it
    for (const token of tokensToDelete) {
      await Token.deleteOne({ _id: token._id });
    }

    console.log(`Deleted ${tokensToDelete.length} old tokens.`);
  } catch (error) {
    console.error('Error deleting old tokens:', error);
  }
}

//Delete old tokens
deleteOldTokens();
const interval = setInterval(deleteOldTokens, 3600000);

module.exports = { processToken , verifyToken, getUserIDFromToken };