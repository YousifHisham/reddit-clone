const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (to, otp) => {
  await transporter.sendMail({
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
};

module.exports = { sendOtpEmail };
