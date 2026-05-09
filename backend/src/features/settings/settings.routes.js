const express = require('express');
const { verifyToken } = require('../../middleware/auth.middleware');
const {
  getSettings,
  updateAccount,
  updateProfile,
  updatePrivacy,
  updatePreferences,
  updateNotifications,
  updateEmailNotifications,
  deleteAccount,
} = require('./settings.controller');

const router = express.Router();
router.use(verifyToken); // all routes require auth

router.get('/', getSettings);
router.patch('/account', updateAccount);
router.patch('/profile', updateProfile);
router.patch('/privacy', updatePrivacy);
router.patch('/preferences', updatePreferences);
router.patch('/notifications', updateNotifications);
router.patch('/email', updateEmailNotifications);
router.delete('/account', deleteAccount);

module.exports = router;
