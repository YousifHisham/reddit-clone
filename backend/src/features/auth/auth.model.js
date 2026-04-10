const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bio: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    gender: { type: String, default: '' },
    interests: [{ type: String }],
    tags: [{ type: String }],
    otp: { type: String },
    otpExpiry: { type: Date },
    verified: { type: Boolean, default: false },
    postKarma: { type: Number, default: 0 },
    commentKarma: { type: Number, default: 0 },
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    fcmToken: { type: String, default: '' },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
