const express = require('express');
const { param, query, body } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const { uploadProfile } = require('../../config/cloudinary');
const {
  getProfile,
  updateProfile,
  searchUsers,
  getSavedPosts,
  savePost,
  unsavePost,
} = require('./users.controller');

const router = express.Router();

router.get('/search', [query('q').optional().trim().isLength({ max: 50 })], searchUsers);

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const user = await require('../auth/auth.model').findById(req.user.id).select('-otp -otpExpiry -fcmToken -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user });
  } catch (err) { return next(err); }
});

router.get('/:id', [param('id').isMongoId().withMessage('Valid user id required')], getProfile);

router.put(
  '/:id',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Valid user id required'),
    body('bio').optional().isString().isLength({ max: 500 }).withMessage('Bio must be at most 500 chars'),
  ],
  uploadProfile.single('profilePicture'),
  updateProfile
);

router.get(
  '/:id/saved',
  verifyToken,
  [param('id').isMongoId().withMessage('Valid user id required')],
  getSavedPosts
);

router.post(
  '/:id/save/:postId',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Valid user id required'),
    param('postId').isMongoId().withMessage('Valid post id required'),
  ],
  savePost
);

router.delete(
  '/:id/save/:postId',
  verifyToken,
  [
    param('id').isMongoId().withMessage('Valid user id required'),
    param('postId').isMongoId().withMessage('Valid post id required'),
  ],
  unsavePost
);

module.exports = router;
