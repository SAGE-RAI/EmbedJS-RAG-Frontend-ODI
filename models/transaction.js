import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    source: {
        id: { type: String, required: true },
        type: {
            type: String,
            enum: ['conversations', 'sources', 'ratings'],
            required: true
        },
        description: {
            type: String
        }
    },
    date: { type: Date, default: Date.now },
    tokens: { type: Number, required: true }
}, {
    collection: 'Transactions' // Specify the collection name
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;