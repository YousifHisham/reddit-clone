const express = require('express');
const { body, param, query } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const {
  createCommunity,
  getCommunity,
  listCommunities,
  searchCommunities,
  joinCommunity,
  leaveCommunity,
  getFlairs,
  createFlair,
  getPendingPosts,
} = require('./communities.controller');
const { getCommunityPosts } = require('../posts/posts.controller');

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
      req.user = { id: decoded.id };
    } catch {}
  }
  next();
};

router.get('/search', [query('q').optional().trim().isLength({ max: 50 })], searchCommunities);

router.get('/', optionalAuth, listCommunities);

router.post(
  '/',
  verifyToken,
  [
    body('name').trim().isLength({ min: 3, max: 21 }).withMessage('Community name must be 3-21 characters'),
    body('description').trim().notEmpty().withMessage('Description required'),
    body('rules').optional().isString().isLength({ max: 5000 }).withMessage('Rules must be at most 5000 chars'),
  ],
  createCommunity
);

router.get('/:id', [param('id').isMongoId().withMessage('Valid community id required')], getCommunity);

router.post(
  '/:id/join',
  verifyToken,
  [param('id').isMongoId().withMessage('Valid community id required')],
  joinCommunity
);

router.post(
  '/:id/leave',
  verifyToken,
  [param('id').isMongoId().withMessage('Valid community id required')],
  leaveCommunity
);

router.get('/:id/posts', getCommunityPosts);
router.get('/:id/flairs', getFlairs);
router.post('/:id/flairs', verifyToken, createFlair);
router.get('/:id/pending', verifyToken, getPendingPosts);

module.exports = router;
