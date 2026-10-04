require('dotenv').config();
const nodemailer = require('nodemailer');
const config = require('../config/config');

let transporter = null;
let lastConfigHash = '';

async function getTransporter() {
  require('dotenv').config();
  const smtpUser = (process.env.SMTP_USER || config.smtp.user || '').trim();
  const smtpPass = (process.env.SMTP_PASS || config.smtp.pass || '').replace(/\s+/g, '');
  const configHash = `${smtpUser}:${smtpPass}`;

  if (transporter && lastConfigHash === configHash) {
    return transporter;
  }

  // If real SMTP or Gmail is configured
  if (smtpUser && smtpPass) {
    if (config.smtp.host?.toLowerCase().includes('gmail') || smtpUser.endsWith('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      lastConfigHash = configHash;
      console.log('[EmailService] Configured with live Gmail service for user:', smtpUser);
      return transporter;
    }

    if (config.smtp.host) {
      transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      lastConfigHash = configHash;
      console.log('[EmailService] Configured with custom SMTP host:', config.smtp.host);
      return transporter;
    }
  }

  // Fallback: Use test / json / console transporter with quick ethereal attempt
  try {
    const etherealPromise = nodemailer.createTestAccount();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Ethereal setup timeout')), 2500)
    );
    const testAccount = await Promise.race([etherealPromise, timeoutPromise]);
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log('[EmailService] Using Ethereal test account:', testAccount.user);
    return transporter;
  } catch (err) {
    console.log('[EmailService] SMTP running in development console mode:', err.message);
    transporter = {
      sendMail: async (opts) => {
        console.log(`[EmailService] Dev Dispatch: Email sent to ${opts.to} with subject: ${opts.subject}`);
        return { messageId: 'dev-' + Date.now() };
      }
    };
    return transporter;
  }
}

/**
 * Sends Email Verification Link with Token
 */
async function sendVerificationLink(email, name, token, frontendUrl = config.frontendUrl || 'https://oms.digiindiasolutions.com') {
  const mailer = await getTransporter();
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
        .body { padding: 32px 24px; color: #334155; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .btn-box { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .btn:hover { background: #1d4ed8; }
        .fallback { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Management System</h1>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>Thank you for registering on the OMS Enterprise Portal. To activate your account, please verify your email address by clicking the button below:</p>
          <div class="btn-box">
            <a href="${verifyUrl}" class="btn" target="_blank">Verify Email Address</a>
          </div>
          <p>This verification link is valid for 24 hours. If the button above does not work, copy and paste this URL into your browser:</p>
          <div class="fallback">${verifyUrl}</div>
          <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you did not register for this account, please disregard this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Portal. All rights reserved. Secure Enterprise Order Management.
        </div>
      </div>
    </body>
    </html>
  `;

  // Always log link for development / test visibility
  console.log(`\n==================================================`);
  console.log(`[EMAIL DISPATCH] Verification Link for ${email}`);
  console.log(`>>> Click to Verify: ${verifyUrl} <<<`);
  console.log(`==================================================\n`);

  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `[OMS] Activate Your Account - Email Verification Link`,
      html
    });
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending verification email link:', error);
    return { error: error.message };
  }
}

/**
 * Sends Password Reset OTP / Link
 */
/**
 * Sends Password Reset Link with Token
 */
async function sendPasswordResetLink(email, name, token, frontendUrl = config.frontendUrl || 'https://oms.digiindiasolutions.com') {
  const mailer = await getTransporter();
  const resetUrl = `${frontendUrl}/forgot-password?token=${token}&email=${encodeURIComponent(email)}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 30px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; }
        .body { padding: 32px 24px; color: #334155; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .btn-box { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
        .btn:hover { background: #1d4ed8; }
        .fallback { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>We received a request to reset your password for your OMS account. Please verify your email and set a new password by clicking the button below:</p>
          <div class="btn-box">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>
          <p>This password reset link is valid for 1 hour. If the button above does not work, copy and paste this URL into your browser:</p>
          <div class="fallback">${resetUrl}</div>
          <p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you did not request a password reset, please ignore this email or notify your system administrator.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Portal. All rights reserved. Secure Enterprise Order Management.
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n==================================================`);
  console.log(`[EMAIL DISPATCH] Password Reset Link for ${email}`);
  console.log(`>>> Click to Reset Password: ${resetUrl} <<<`);
  console.log(`==================================================\n`);

  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `[OMS] Reset Your Password - Verification Link`,
      html
    });
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending password reset link:', error);
    return { error: error.message };
  }
}

/**
 * Sends 6-Digit OTP Email for Account Activation or Password Reset
 */
async function sendOtpEmail(email, name, otp, purpose = 'REGISTRATION') {
  const mailer = await getTransporter();
  const isRegistration = purpose === 'REGISTRATION';
  const isCustomer = purpose === 'CUSTOMER_VERIFICATION';
  const isUser = purpose === 'USER_VERIFICATION';
  const isPasswordReset = purpose === 'PASSWORD_RESET';

  let title = 'Email Verification';
  let intro = 'Use the 6-digit OTP code below to verify your email address:';

  if (isRegistration) {
    title = 'Activate Your Account';
    intro = 'Thank you for signing up on the OMS Enterprise Portal. Use the 6-digit OTP below to verify your email and activate your account:';
  } else if (isCustomer) {
    title = 'Verify Customer Email';
    intro = 'Use the 6-digit verification code below to verify the customer email address on OMS Portal:';
  } else if (isUser) {
    title = 'Verify User Account Email';
    intro = 'Use the 6-digit verification code below to verify the user email address on OMS Portal:';
  } else if (isPasswordReset) {
    title = 'Password Reset Verification';
    intro = 'We received a request to reset your password. Use the 6-digit OTP below to verify your identity and set a new password:';
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .body { padding: 30px 24px; color: #334155; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .otp-box { text-align: center; margin: 28px 0; padding: 18px; background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 10px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #15803d; }
        .expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
        .footer { background: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>${intro}</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
            <div class="expiry">Valid for 10 minutes. Do not share this code with anyone.</div>
          </div>
          <p style="font-size: 13px; color: #64748b;">If you did not request this OTP, please ignore this email.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Portal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n==================================================`);
  console.log(`[EMAIL DISPATCH] 6-Digit OTP for ${email} (${purpose})`);
  console.log(`>>> OTP: ${otp} <<<`);
  console.log(`==================================================\n`);

  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `[OMS] Your Verification OTP: ${otp}`,
      html
    });
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending OTP email:', error);
    return { error: error.message };
  }
}

/**
 * Sends notification email when Super Admin verifies and approves a user account
 */
async function sendAccountApprovedEmail(email, name, roleDisplayName = 'Sales Person') {
  const mailer = await getTransporter();
  const loginUrl = `${config.frontendUrl}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .body { padding: 30px 24px; color: #334155; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .approval-badge { display: inline-block; padding: 8px 16px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; color: #047857; font-weight: 600; font-size: 14px; margin: 15px 0; }
        .btn { display: inline-block; padding: 12px 28px; background: #059669; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 20px; }
        .footer { background: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Approved!</h1>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>Great news! Your registration has been verified and approved by the <strong>Super Admin</strong>.</p>
          <div class="approval-badge">
            Role Granted: ${roleDisplayName}
          </div>
          <p>You can now log in to the OMS Enterprise Portal and access your dashboard to manage sales orders, customers, and fulfillment tracking.</p>
          <div style="text-align: center;">
            <a href="${loginUrl}" class="btn">Log In to OMS Portal</a>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Portal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  console.log(`\n==================================================`);
  console.log(`[EMAIL DISPATCH] Account Approved Email for ${email}`);
  console.log(`>>> Login URL: ${loginUrl} <<<`);
  console.log(`==================================================\n`);

  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `[OMS] Your Account Has Been Approved by Super Admin!`,
      html
    });
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending approval email:', error);
    return { error: error.message };
  }
}

/**
 * Sends notification email when Super Admin rejects a user account
 */
async function sendAccountRejectedEmail(email, name, reason = '') {
  const mailer = await getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: #ffffff; padding: 26px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .body { padding: 30px 24px; color: #334155; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
        .footer { background: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Account Registration Update</h1>
        </div>
        <div class="body">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>We are writing to inform you that your registration on the OMS Enterprise Portal was reviewed and could not be approved at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you believe this is in error, please contact your organization administrator.</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Portal. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await mailer.sendMail({
      from: config.smtp.from,
      to: email,
      subject: `[OMS] Account Registration Status Update`,
      html
    });
    return info;
  } catch (error) {
    console.error('[EmailService] Error sending rejection email:', error);
    return { error: error.message };
  }
}

module.exports = {
  sendVerificationLink,
  sendPasswordResetLink,
  sendPasswordResetEmail: sendPasswordResetLink,
  sendOtpEmail,
  sendAccountApprovedEmail,
  sendAccountRejectedEmail
};

