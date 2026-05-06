const mongoose = require('mongoose');

const joinRequestSchema = new mongoose.Schema({
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

joinRequestSchema.index({ community: 1, requester: 1 }, { unique: true });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
