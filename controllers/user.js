import User from '../models/user.js'; // Import the User model
import { newTransaction } from '../controllers/transaction.js';

// Function to retrieve or create a user based on the profile data
async function retrieveOrCreateUser(profile) {
    let user = await User.findOne({ email: profile.email });

    if (!user) {
        const defaultTokens = process.env.DEFAULT_TOKENS ? parseInt(process.env.DEFAULT_TOKENS, 10) : 0;
        const tokens = profile.tokens !== undefined ? profile.tokens : defaultTokens;
        user = new User({
            name: profile.name,
            email: profile.email,
            lastLogin: new Date()
        });
        await user.save();
        const userId = user._id;
        newTransaction(userId, userId, "user", "New user creation", tokens);
    }

    return user;
}

export { retrieveOrCreateUser };