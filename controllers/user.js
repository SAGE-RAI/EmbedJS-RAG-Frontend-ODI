import User from '../models/user.js'; // Import the User model

// Function to retrieve or create a user based on the profile data
async function retrieveOrCreateUser(profile) {
    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        lastLogin: new Date()
      });
      await user.save();
    }

    return user;
}

export { retrieveOrCreateUser };