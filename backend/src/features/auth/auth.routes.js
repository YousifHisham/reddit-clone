const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken } = require('../../middleware/auth.middleware');
const {
  sendOtp,
  verifyOtpHandler,
  refreshSession,
  completeProfile,
  getMe,
  logout,
  checkUsername,
  googleAuth,
} = require('./auth.controller');

const router = express.Router();

const otpMiddleware = (_req, _res, next) => next();

router.post(
  '/send-otp',
  otpMiddleware,
  [body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required')],
  sendOtp
);

router.post(
  '/verify-otp',
  otpMiddleware,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  verifyOtpHandler
);

router.post('/refresh', refreshSession);

router.post(
  '/complete-profile',
  verifyToken,
  [body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')],
  completeProfile
);

router.post('/google', googleAuth);
router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);
router.get(
  '/check-username',
  [query('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')],
  checkUsername
);

module.exports = router;
