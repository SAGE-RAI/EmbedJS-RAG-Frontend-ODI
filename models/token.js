// models/token.js

const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  accessToken: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiry: {
    type: Date,
    required: true
  }
});

const Token = mongoose.model('Token', tokenSchema);

module.exports = Token;