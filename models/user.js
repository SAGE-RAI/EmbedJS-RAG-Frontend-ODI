// models/token.js

const mongoose = require('mongoose');

// Create user schema and model
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    lastLogin: Date,
    lastLoginFormatted: String,
  });

  const User = mongoose.model('User', userSchema);

  module.exports = User;