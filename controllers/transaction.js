import Transaction from '../models/transaction.js';
import User from '../models/user.js';

const getTransactions = async (req, res) => {
    try {
        const userId = req.user._id;
        const transactions = await Transaction.find({ user_id: userId }).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve transactions' });
    }
};

const newTransaction = async (userId, sourceId, sourceType, description, tokens) => {
    if (!['conversations', 'sources', 'ratings'].includes(sourceType)) {
        console.error('Invalid source type');
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
        }

        // Create new transaction
        const transaction = new Transaction({
            user_id: user._id,
            source: { id: sourceId, type: sourceType, description: description },
            tokens
        });

        // Update user tokens
        user.tokens += tokens;
        await user.save();

        // Save transaction
        await transaction.save();

    } catch (error) {
        console.error('Failed to create transaction: ' + error.message);
    }
};

export { getTransactions, newTransaction };