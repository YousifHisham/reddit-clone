const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { getThreads, getMessages, sendMessage, markThreadRead } = require('./messages.controller');

const router = express.Router();

router.get('/threads', verifyToken, getThreads);
router.get('/:threadId', verifyToken, getMessages);
router.post('/', verifyToken, sendMessage);
router.patch('/:threadId/read', verifyToken, markThreadRead);

module.exports = router;
