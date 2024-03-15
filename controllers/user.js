const User = require('../models/user'); // Import the Token model

// Function to retrieve or create a user based on the profile data
async function retrieveOrCreateUser(profile) {
    let user = await User.findOne({ id: profile.id });

    if (!user) {
      user = new User({
        id: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        lastLogin: new Date()
      });
      await user.save();
    }

    return user;
}

module.exports = { retrieveOrCreateUser };