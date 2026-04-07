const { validationResult } = require('express-validator');
const User = require('./auth.model');
const {
  generateOtp,
  hashOtp,
  verifyOtp,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashToken,
  durationToMs,
} = require('./auth.utils');
const { sendOtpEmail } = require('../../config/email');

const REFRESH_COOKIE_NAME = 'refreshToken';

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: durationToMs(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d', 7 * 24 * 60 * 60 * 1000),
});

const pruneExpiredRefreshTokens = (tokens = []) => {
  const now = new Date();
  return tokens.filter((entry) => new Date(entry.expiresAt) > now);
};

const issueSessionTokens = async (user, res, rotatedFromHash = null) => {
  const accessToken = createAccessToken(user._id.toString());
  const { token: refreshToken, expiresAt } = createRefreshToken(user._id.toString());
  const newRefreshTokenHash = hashToken(refreshToken);

  user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens || []);

  if (rotatedFromHash) {
    const previousToken = user.refreshTokens.find((entry) => entry.tokenHash === rotatedFromHash);
    if (previousToken) {
      previousToken.revokedAt = new Date();
      previousToken.replacedByTokenHash = newRefreshTokenHash;
    }
  }

  user.refreshTokens.push({
    tokenHash: newRefreshTokenHash,
    expiresAt,
  });

  await user.save();
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());

  return accessToken;
};

const sendOtp = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    const { email } = req.body;
    let user = await User.findOne({ email });
    if (!user) user = new User({ email });

    const otp = generateOtp();
    user.otp = await hashOtp(otp);
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();
    await sendOtpEmail(email, otp);

    return res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    return next(err);
  }
};

const verifyOtpHandler = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        code: 'VALIDATION_ERROR',
      });
    }

    const { email, otp } = req.body;
    const user = await User.findOne({ email }).select('+refreshTokens');

    if (!user || !user.otp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email',
        code: 'INVALID_OTP',
      });
    }

    if (new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired',
        code: 'OTP_EXPIRED',
      });
    }

    const isValidOtp = await verifyOtp(otp, user.otp);
    if (!isValidOtp) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect OTP',
        code: 'INVALID_OTP',
      });
    }

    user.verified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    const accessToken = await issueSessionTokens(user, res);
    const isNewUser = !user.username;

    return res.json({
      success: true,
      token: accessToken,
      accessToken,
      isNewUser,
      userId: user._id,
    });
  } catch (err) {
    return next(err);
  }
};

const refreshSession = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!incomingRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing',
        code: 'UNAUTHORIZED',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(incomingRefreshToken);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        code: 'UNAUTHORIZED',
      });
    }

    if (decoded.type !== 'refresh') {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Invalid token type',
        code: 'UNAUTHORIZED',
      });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) {
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'UNAUTHORIZED',
      });
    }

    user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens || []);
    const incomingHash = hashToken(incomingRefreshToken);
    const storedToken = user.refreshTokens.find((entry) => entry.tokenHash === incomingHash);

    if (!storedToken) {
      await user.save();
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Refresh token revoked',
        code: 'UNAUTHORIZED',
      });
    }

    if (storedToken.revokedAt) {
      user.refreshTokens.forEach((entry) => {
        if (!entry.revokedAt) entry.revokedAt = new Date();
      });
      await user.save();
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
      return res.status(401).json({
        success: false,
        message: 'Refresh token reuse detected',
        code: 'UNAUTHORIZED',
      });
    }

    const accessToken = await issueSessionTokens(user, res, incomingHash);

    return res.json({
      success: true,
      token: accessToken,
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
};

const completeProfile = async (req, res, next) => {
  try {
    const { username, gender, interests, tags } = req.body;

    const existing = await User.findOne({ username });
    if (existing && existing._id.toString() !== req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken',
        code: 'USERNAME_TAKEN',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, gender, interests: interests || [], tags: tags || [] },
      { returnDocument: 'after' }
    ).select('-otp -otpExpiry');

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-otp -otpExpiry');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'NOT_FOUND',
      });
    }

    return res.json({ success: true, user });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const incomingRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (incomingRefreshToken) {
      const user = await User.findById(req.user.id).select('+refreshTokens');
      if (user) {
        const incomingHash = hashToken(incomingRefreshToken);
        user.refreshTokens = pruneExpiredRefreshTokens(user.refreshTokens || []);
        const storedToken = user.refreshTokens.find(
          (entry) => entry.tokenHash === incomingHash && !entry.revokedAt
        );
        if (storedToken) storedToken.revokedAt = new Date();
        await user.save();
      }
    }

    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return next(err);
  }
};

const checkUsername = async (req, res, next) => {
  try {
    const { username } = req.query;
    const existing = await User.findOne({ username });
    return res.json({ available: !existing });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  sendOtp,
  verifyOtpHandler,
  refreshSession,
  completeProfile,
  getMe,
  logout,
  checkUsername,
};
