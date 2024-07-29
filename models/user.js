import mongoose from 'mongoose';

// Create user schema and model
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    tokens: {
        type: Number,
        default: 0,
    },
    lastLogin: Date,
    lastLoginFormatted: String,
}, {
    collection: 'Users' // Specify the collection name
});

const User = mongoose.model('User', userSchema);

export default User;