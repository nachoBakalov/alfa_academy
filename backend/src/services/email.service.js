const nodemailer = require('nodemailer');
const AppError = require('../utils/AppError');
const { env } = require('../config/env');

function ensureEmailEnabled() {
  if (!env.EMAIL_ENABLED) {
    throw new AppError(503, 'Email delivery is not enabled');
  }
}

function createTransporter() {
  ensureEmailEnabled();

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

async function sendMail(payload, options = {}) {
  ensureEmailEnabled();

  const transporter = options.transporter || createTransporter();

  const message = {
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo || env.EMAIL_REPLY_TO || undefined,
  };

  const info = await transporter.sendMail(message);

  return {
    messageId: info.messageId || null,
    accepted: Array.isArray(info.accepted) ? info.accepted : [],
    rejected: Array.isArray(info.rejected) ? info.rejected : [],
  };
}

module.exports = {
  createTransporter,
  sendMail,
};
