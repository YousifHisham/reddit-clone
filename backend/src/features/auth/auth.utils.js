const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10);
};

const verifyOtp = async (otp, hashed) => {
  return bcrypt.compare(otp, hashed);
};

const durationToMs = (value, fallbackMs) => {
  if (!value) return fallbackMs;
  if (/^\d+$/.test(value)) return Number(value);

  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const getAccessSecret = () => process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const getRefreshSecret = () => process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const createAccessToken = (userId) => {
  return jwt.sign({ id: userId, type: 'access' }, getAccessSecret(), {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m',
  });
};

const createRefreshToken = (userId, tokenId = crypto.randomUUID()) => {
  const expiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  const token = jwt.sign({ id: userId, type: 'refresh', jti: tokenId }, getRefreshSecret(), {
    expiresIn,
  });
  const expiresAt = new Date(Date.now() + durationToMs(expiresIn, 7 * 24 * 60 * 60 * 1000));

  return { token, expiresAt, tokenId };
};

const verifyAccessToken = (token) => jwt.verify(token, getAccessSecret());
const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Backwards-compatible alias with previous tests and callers.
const createToken = createAccessToken;

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
  createToken,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  durationToMs,
};
