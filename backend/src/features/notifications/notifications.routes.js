const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const { getNotifications, markAllRead } = require('./notifications.controller');

const router = express.Router();

router.get('/', verifyToken, getNotifications);
router.patch('/read', verifyToken, markAllRead);

module.exports = router;
