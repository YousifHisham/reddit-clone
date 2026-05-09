const User = require('../auth/auth.model');

const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -otpExpiry -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const settings = {
      account: {
        gender: user.gender,
        useApproxLocation: user.useApproxLocation,
      },
      profile: {
        displayName: user.displayName,
        about: user.bio,
        nsfw: user.nsfwProfile,
        showFollowerCount: user.showFollowerCount,
        socialLinks: user.socialLinks,
      },
      privacy: {
        allowFollow: user.allowFollow,
        chatRequests: user.chatRequests,
        listProfile: user.listOnDirectory,
        showInSearch: user.showInSearch,
        personalizeAds: user.personalizeAds,
        partnerAdInfo: user.partnerAds,
      },
      preferences: {
        language: user.displayLanguage,
        showMature: user.showNsfw,
        blurMature: user.blurNsfw,
        recommendations: user.showRecommendations,
        autoplay: user.autoplayMedia,
        reduceMotion: user.reduceMotion,
        displayMode: user.displayMode,
        communityThemes: user.useCommunityThemes,
        openInNewTab: user.openInNewTab,
        feedView: user.defaultFeedView,
        markdownEditor: user.useMarkdownEditor,
      },
      notifications: user.notificationSettings ? user.notificationSettings.toObject() : {},
      email: user.emailNotifications ? user.emailNotifications.toObject() : {},
    };

    return res.json({ success: true, user, settings });
  } catch (err) {
    return next(err);
  }
};

const updateAccount = async (req, res, next) => {
  try {
    const { gender, useApproxLocation } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(gender !== undefined && { gender }), ...(useApproxLocation !== undefined && { useApproxLocation }) },
      { new: true, runValidators: true }
    ).select('-otp -otpExpiry -refreshTokens');
    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, about, nsfwProfile, nsfw, showFollowerCount, socialLinks } = req.body;
    const update = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (bio !== undefined) update.bio = bio;
    if (about !== undefined) update.bio = about;
    if (nsfwProfile !== undefined) update.nsfwProfile = nsfwProfile;
    if (nsfw !== undefined) update.nsfwProfile = nsfw;
    if (showFollowerCount !== undefined) update.showFollowerCount = showFollowerCount;
    if (socialLinks !== undefined) update.socialLinks = socialLinks;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select('-otp -otpExpiry -refreshTokens');
    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const updatePrivacy = async (req, res, next) => {
  try {
    const { allowFollow, chatRequests, showInSearch, listOnDirectory, personalizeAds, partnerAds } = req.body;
    const update = {};
    if (allowFollow !== undefined) update.allowFollow = allowFollow;
    if (chatRequests !== undefined) update.chatRequests = chatRequests;
    if (showInSearch !== undefined) update.showInSearch = showInSearch;
    if (listOnDirectory !== undefined) update.listOnDirectory = listOnDirectory;
    if (personalizeAds !== undefined) update.personalizeAds = personalizeAds;
    if (partnerAds !== undefined) update.partnerAds = partnerAds;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select('-otp -otpExpiry -refreshTokens');
    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const {
      showNsfw, blurNsfw, showRecommendations, displayLanguage, autoplayMedia,
      reduceMotion, displayMode, useCommunityThemes, openInNewTab, defaultFeedView, useMarkdownEditor,
    } = req.body;
    const update = {};
    if (showNsfw !== undefined) update.showNsfw = showNsfw;
    if (blurNsfw !== undefined) update.blurNsfw = blurNsfw;
    if (showRecommendations !== undefined) update.showRecommendations = showRecommendations;
    if (displayLanguage !== undefined) update.displayLanguage = displayLanguage;
    if (autoplayMedia !== undefined) update.autoplayMedia = autoplayMedia;
    if (reduceMotion !== undefined) update.reduceMotion = reduceMotion;
    if (displayMode !== undefined) update.displayMode = displayMode;
    if (useCommunityThemes !== undefined) update.useCommunityThemes = useCommunityThemes;
    if (openInNewTab !== undefined) update.openInNewTab = openInNewTab;
    if (defaultFeedView !== undefined) update.defaultFeedView = defaultFeedView;
    if (useMarkdownEditor !== undefined) update.useMarkdownEditor = useMarkdownEditor;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true }).select('-otp -otpExpiry -refreshTokens');
    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const updateNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const incoming = req.body.notificationSettings || req.body;
    const current = user.notificationSettings ? user.notificationSettings.toObject() : {};
    user.notificationSettings = { ...current, ...incoming };
    await user.save();
    return res.json({ success: true, notificationSettings: user.notificationSettings });
  } catch (err) {
    return next(err);
  }
};

const updateEmailNotifications = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const incoming = req.body.emailNotifications || req.body;
    const current = user.emailNotifications ? user.emailNotifications.toObject() : {};
    user.emailNotifications = { ...current, ...incoming };
    await user.save();
    return res.json({ success: true, emailNotifications: user.emailNotifications });
  } catch (err) {
    return next(err);
  }
};

const deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth' });
    return res.json({ success: true, message: 'Account deleted' });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getSettings,
  updateAccount,
  updateProfile,
  updatePrivacy,
  updatePreferences,
  updateNotifications,
  updateEmailNotifications,
  deleteAccount,
};
