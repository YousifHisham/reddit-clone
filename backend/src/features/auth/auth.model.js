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

    // Profile
    displayName: { type: String, default: '' },
    banner: { type: String, default: '' },
    socialLinks: [{ platform: { type: String }, url: { type: String } }],
    nsfwProfile: { type: Boolean, default: false },
    showFollowerCount: { type: Boolean, default: true },

    // Privacy
    allowFollow: { type: Boolean, default: true },
    chatRequests: { type: String, default: 'everyone' },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    showInSearch: { type: Boolean, default: true },
    listOnDirectory: { type: Boolean, default: true },
    personalizeAds: { type: Boolean, default: true },
    partnerAds: { type: Boolean, default: true },
    useApproxLocation: { type: Boolean, default: false },

    // Preferences
    showNsfw: { type: Boolean, default: false },
    blurNsfw: { type: Boolean, default: true },
    showRecommendations: { type: Boolean, default: true },
    displayLanguage: { type: String, default: 'en-US' },
    autoplayMedia: { type: Boolean, default: true },
    reduceMotion: { type: Boolean, default: false },
    displayMode: { type: String, default: 'auto' },
    useCommunityThemes: { type: Boolean, default: true },
    openInNewTab: { type: Boolean, default: false },
    defaultFeedView: { type: String, default: 'card' },
    useMarkdownEditor: { type: Boolean, default: false },

    // Notifications (nested)
    notificationSettings: {
      chatMessages: { type: String, default: 'all' },
      chatRequestsNotif: { type: String, default: 'all' },
      mentions: { type: String, default: 'all' },
      commentsOnPosts: { type: String, default: 'all' },
      upvotesOnPosts: { type: String, default: 'all' },
      upvotesOnComments: { type: String, default: 'all' },
      repliesToComments: { type: String, default: 'all' },
      newFollowers: { type: String, default: 'all' },
      awards: { type: String, default: 'all' },
      postsYouFollow: { type: String, default: 'all' },
      trendingPosts: { type: String, default: 'all' },
      featuredContent: { type: String, default: 'all' },
      breakingNews: { type: String, default: 'off' },
      redditAnnouncements: { type: String, default: 'all' },
      cakeDay: { type: String, default: 'all' },
      modNotifications: { type: String, default: 'all' },
    },

    // Email notifications (nested)
    emailNotifications: {
      messages: { type: Boolean, default: true },
      adminNotifications: { type: Boolean, default: false },
      chatRequests: { type: Boolean, default: true },
      commentsOnPosts: { type: Boolean, default: true },
      repliesToComments: { type: Boolean, default: true },
      upvotesOnPosts: { type: Boolean, default: false },
      upvotesOnComments: { type: Boolean, default: false },
      usernameMentions: { type: Boolean, default: true },
      newFollowers: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
      weeklyRecap: { type: Boolean, default: false },
      weeklyTopic: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
