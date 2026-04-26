const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    rules: { type: String, default: '' },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    memberCount: { type: Number, default: 0 },
    banner: { type: String, default: '' },
    icon: { type: String, default: '' },
    flairs: [{ name: String, color: String }],
    requiresApproval: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Community', communitySchema);
