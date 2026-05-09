const nodemailer = require('nodemailer');

const gmailTransporter = nodemailer.createTransport({
  service: 'gmail',
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailhogTransporter = process.env.MAILHOG_FALLBACK_ENABLED === 'true'
  ? nodemailer.createTransport({
      host: process.env.MAILHOG_HOST || '127.0.0.1',
      port: Number(process.env.MAILHOG_PORT || 1025),
      secure: false,
      ignoreTLS: true,
    })
  : null;

const buildOtpMail = (to, otp) => ({
  from: `"Reddit Clone" <${process.env.EMAIL_USER}>`,
  to,
  subject: 'Your verification code',
  html: `
    <div style="font-family: IBM Plex Sans, sans-serif; max-width: 400px; margin: auto;">
      <h2>Your verification code</h2>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff4500;">${otp}</p>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p style="color: #878a8c; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `,
});

const sendOtpEmail = async (to, otp) => {
  const message = buildOtpMail(to, otp);

  try {
    await gmailTransporter.sendMail(message);
  } catch (err) {
    if (!mailhogTransporter) throw err;
    console.warn('[WARN] Gmail delivery failed; falling back to MailHog:', err.message);
    await mailhogTransporter.sendMail(message);
  }
};

module.exports = { sendOtpEmail };
