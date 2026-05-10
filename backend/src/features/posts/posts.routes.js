const express = require('express');
const { body } = require('express-validator');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../../middleware/auth.middleware');
const { uploadPost } = require('../../config/cloudinary');
const { createPost, getPost, getCommunityPosts, getFeed, deletePost, updatePost, updatePostStatus, upvotePost, downvotePost, summarizePost, saveDraft, getDrafts } = require('./posts.controller');
const { getComments } = require('../comments/comments.controller');

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    } catch {}
  }
  next();
};

const router = express.Router();

router.get('/feed', optionalAuth, getFeed);
router.get('/drafts', verifyToken, getDrafts);
router.post('/draft', verifyToken, uploadPost.single('image'), saveDraft);
router.post('/', verifyToken, uploadPost.single('image'), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('community').notEmpty().withMessage('Community required'),
], createPost);
router.get('/:id/comments', getComments);
router.get('/:id', getPost);
router.patch('/:id/status', verifyToken, updatePostStatus);
router.patch('/:id', verifyToken, updatePost);
router.delete('/:id', verifyToken, deletePost);
router.post('/:id/upvote', verifyToken, upvotePost);
router.post('/:id/downvote', verifyToken, downvotePost);
router.post('/:id/summarize', summarizePost);

module.exports = router;
