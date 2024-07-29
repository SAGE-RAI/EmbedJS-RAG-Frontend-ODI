import mongoose from 'mongoose';

const sharedWithSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['contentEditor', 'instanceAdmin', ''],
    default: ''
  }
}, {
  _id: false // Prevent Mongoose from creating _id for subdocuments
});

const instanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  public: {
    type: Boolean,
    default: false,
    required: true
  },
  sharedWith: [sharedWithSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
},{
  timestamps: true,
  collection: 'Instances' // Specify the collection name
});

const Instance = mongoose.model('Instance', instanceSchema);

export default Instance;
