const express = require('express');
const { body, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('../../middleware/auth.middleware');
const {
  sendOtp,
  verifyOtpHandler,
  refreshSession,
  completeProfile,
  getMe,
  logout,
  checkUsername,
} = require('./auth.controller');

const router = express.Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: {
    success: false,
    message: 'Too many OTP requests, try again later',
    code: 'RATE_LIMITED',
  },
});

router.post(
  '/send-otp',
  otpLimiter,
  [body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required')],
  sendOtp
);

router.post(
  '/verify-otp',
  otpLimiter,
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

router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);
router.get(
  '/check-username',
  [query('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')],
  checkUsername
);

module.exports = router;
