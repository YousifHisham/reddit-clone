const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { createComment, deleteComment, upvoteComment, downvoteComment } = require('./comments.controller');

const router = express.Router();

router.post('/', verifyToken, createComment);
router.delete('/:id', verifyToken, deleteComment);
router.post('/:id/upvote', verifyToken, upvoteComment);
router.post('/:id/downvote', verifyToken, downvoteComment);

module.exports = router;
