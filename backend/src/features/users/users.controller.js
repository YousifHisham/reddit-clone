const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../auth/auth.model');

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await User.findById(req.params.id).select('-otp -otpExpiry -email -fcmToken -refreshTokens');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    const updates = {};
    if (req.body.bio !== undefined) updates.bio = req.body.bio;
    if (req.file?.path) updates.profilePicture = req.file.path;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No profile fields provided',
        code: 'VALIDATION_ERROR',
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    }).select('-otp -otpExpiry -email -fcmToken -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, users: [] });

    const users = await User.find({
      username: { $regex: escapeRegex(q), $options: 'i' },
    })
      .select('username profilePicture postKarma commentKarma')
      .limit(10);

    return res.json({ success: true, users });
  } catch (err) {
    return next(err);
  }
};

const getSavedPosts = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    let query = User.findById(req.params.id);
    if (mongoose.modelNames().includes('Post')) {
      query = query.populate({
        path: 'savedPosts',
        populate: { path: 'author community', select: 'username name' },
      });
    }

    const user = await query.select('savedPosts');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, savedPosts: user.savedPosts });
  } catch (err) {
    return next(err);
  }
};

const savePost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: { savedPosts: req.params.postId },
      },
      { returnDocument: 'after' }
    ).select('savedPosts');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, savedPosts: user.savedPosts });
  } catch (err) {
    return next(err);
  }
};

const unsavePost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    if (req.params.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        code: 'FORBIDDEN',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        $pull: { savedPosts: req.params.postId },
      },
      { returnDocument: 'after' }
    ).select('savedPosts');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, savedPosts: user.savedPosts });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  searchUsers,
  getSavedPosts,
  savePost,
  unsavePost,
};
