const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: ['upvote', 'comment', 'join', 'post_approval', 'post_approved', 'post_rejected'],
    required: true,
  },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
