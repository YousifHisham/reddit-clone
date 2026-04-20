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
} = require('./communities.controller');
const { getCommunityPosts } = require('../posts/posts.controller');

const router = express.Router();

router.get('/search', [query('q').optional().trim().isLength({ max: 50 })], searchCommunities);

router.get('/', listCommunities);

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

module.exports = router;
