const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/config');
const { isValidEmail } = require('../utils/emailValidator');
const { generateOTP, hashOTP, verifyOTPHash } = require('../utils/otpGenerator');
const emailService = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Token generation helper
function generateToken(user, permissions) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role_name,
      roleId: user.role_id,
      storeId: user.store_id,
      permissions
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

// 1. REGISTER (Generates & Sends 6-Digit Email OTP)
async function register(req, res) {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return sendError(res, 'Please provide name, email, password and confirm password.', 400);
    }

    if (password !== confirmPassword) {
      return sendError(res, 'Passwords do not match.', 400);
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters long.', 400);
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
      }
    }

    // Strict email format validation
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return sendError(
        res,
        'Invalid email address format. Please provide a valid email (e.g. user@domain.com) without illegal characters or consecutive dots.',
        400
      );
    }

    // Check if user already exists
    const existing = await db.query('SELECT id, email_verified, is_active FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      if (existing.rows[0].email_verified) {
        return sendError(res, 'An account with this email address already exists. Please login.', 400);
      }
    }

    // Default role: sales_person (ID 4)
    const roleRes = await db.query("SELECT id FROM roles WHERE name = 'sales_person'");
    const defaultRoleId = roleRes.rows[0]?.id || 4;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let userId;
    if (existing.rows.length === 0) {
      // Create user unverified and pending approval
      const insertUser = await db.query(`
        INSERT INTO users (name, email, phone, password_hash, role_id, email_verified, is_active, approval_status)
        VALUES ($1, $2, $3, $4, $5, false, false, 'PENDING')
        RETURNING id;
      `, [name.trim(), normalizedEmail, cleanPhone, passwordHash, defaultRoleId]);
      userId = insertUser.rows[0].id;
    } else {
      userId = existing.rows[0].id;
      // Update pending unverified user details
      await db.query(`
        UPDATE users
        SET name = $1, phone = $2, password_hash = $3, email_verified = false, is_active = false, approval_status = 'PENDING', updated_at = CURRENT_TIMESTAMP
        WHERE id = $4;
      `, [name.trim(), cleanPhone, passwordHash, userId]);
    }

    // Invalidate any older unused registration OTPs for this email
    await db.query(`
      UPDATE email_verification_otps
      SET is_used = true
      WHERE email = $1 AND purpose = 'REGISTRATION' AND is_used = false
    `, [normalizedEmail]);

    // Generate 6-digit OTP and hash
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await db.query(`
      INSERT INTO email_verification_otps (email, otp_hash, purpose, expires_at, attempts, max_attempts, is_used)
      VALUES ($1, $2, 'REGISTRATION', $3, 0, 5, false);
    `, [normalizedEmail, otpHash, expiresAt]);

    // Send 6-digit OTP to user's email
    await emailService.sendOtpEmail(normalizedEmail, name.trim(), otp, 'REGISTRATION');

    // Audit log
    await logAudit({
      userId,
      userName: name,
      role: 'PENDING_VERIFICATION',
      action: 'REGISTER_OTP_SENT',
      module: 'AUTH',
      recordId: userId,
      newValues: { email: normalizedEmail, name },
      req
    });

    return sendSuccess(
      res,
      {
        email: normalizedEmail,
        requiresOtp: true
      },
      'Registration initiated! A 6-digit verification code has been sent to your email address. Please enter the OTP to activate your account.',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 'Failed to complete registration: ' + error.message, 500);
  }
}

// 2. VERIFY OTP (Submits 6-digit code received via email to activate account)
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return sendError(res, 'Email and 6-digit verification OTP are required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    // Check user existence
    const userRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role_id, u.store_id, u.email_verified, u.is_active, u.approval_status,
             r.name AS role_name, r.display_name AS role_display_name, s.name AS store_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.email = $1
    `, [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return sendError(res, 'No account found with this email address.', 404);
    }

    const user = userRes.rows[0];

    if (user.email_verified) {
      if (user.approval_status === 'PENDING') {
        await db.query(`UPDATE users SET approval_status = 'APPROVED', is_active = true, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) WHERE id = $1`, [user.id]);
      }
      return sendSuccess(res, { emailVerified: true, alreadyVerified: true, approvalStatus: 'APPROVED' }, 'Email is already verified. You can log in.');
    }

    // Fetch latest active registration OTP
    const otpRes = await db.query(`
      SELECT id, otp_hash, expires_at, attempts, max_attempts
      FROM email_verification_otps
      WHERE email = $1 AND purpose = 'REGISTRATION' AND is_used = false
      ORDER BY id DESC
      LIMIT 1;
    `, [normalizedEmail]);

    if (otpRes.rows.length === 0) {
      return sendError(res, 'No active verification code found for this email. Please click "Resend OTP".', 400);
    }

    const otpRecord = otpRes.rows[0];

    // Check if expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return sendError(res, 'The verification code has expired (valid for 10 minutes). Please request a new OTP.', 400);
    }

    // Check attempt limits
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      return sendError(res, 'Too many incorrect attempts. Please request a fresh OTP.', 400);
    }

    // Verify OTP hash
    const isMatch = await verifyOTPHash(cleanOtp, otpRecord.otp_hash);
    if (!isMatch) {
      const newAttempts = otpRecord.attempts + 1;
      await db.query('UPDATE email_verification_otps SET attempts = $1 WHERE id = $2', [newAttempts, otpRecord.id]);
      const remaining = otpRecord.max_attempts - newAttempts;
      return sendError(
        res,
        `Invalid 6-digit OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`,
        400
      );
    }

    // Mark OTP as used
    await db.query('UPDATE email_verification_otps SET is_used = true WHERE id = $1', [otpRecord.id]);

    // Verify email on user record and auto-approve immediately
    await db.query(`
      UPDATE users 
      SET email_verified = true, 
          is_active = true,
          approval_status = 'APPROVED',
          approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
          verification_token = NULL,
          verification_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);

    await logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role_name,
      action: 'EMAIL_VERIFIED_OTP',
      module: 'AUTH',
      recordId: user.id,
      newValues: { email: user.email, verified: true, approval_status: 'APPROVED' },
      req
    });

    // Fetch user permissions
    const permResult = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [user.role_id]);
    const permissions = permResult.rows.map(r => r.code);
    const jwtToken = generateToken({ ...user, approval_status: 'APPROVED', is_active: true }, permissions);

    return sendSuccess(
      res,
      {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role_name,
          emailVerified: true,
          approvalStatus: 'APPROVED'
        }
      },
      'Email verified successfully! Your account is active and approved.'
    );
  } catch (error) {
    console.error('OTP verification error:', error);
    return sendError(res, 'Failed to verify OTP: ' + error.message, 500);
  }
}

// 3. RESEND OTP (Dispatches fresh 6-digit OTP to user's email)
async function resendOtp(req, res) {
  try {
    const { email, purpose = 'REGISTRATION' } = req.body;

    if (!email) {
      return sendError(res, 'Email is required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userRes = await db.query('SELECT id, name, email_verified FROM users WHERE email = $1', [normalizedEmail]);
    if (userRes.rows.length === 0) {
      return sendError(res, 'No user found with this email address.', 404);
    }

    const user = userRes.rows[0];
    if (purpose === 'REGISTRATION' && user.email_verified) {
      return sendError(res, 'This email address is already verified. Please proceed to login.', 400);
    }

    // Invalidate previous OTPs for this email and purpose
    await db.query(`
      UPDATE email_verification_otps 
      SET is_used = true 
      WHERE email = $1 AND purpose = $2 AND is_used = false
    `, [normalizedEmail, purpose]);

    // Generate new 6-digit OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await db.query(`
      INSERT INTO email_verification_otps (email, otp_hash, purpose, expires_at, attempts, max_attempts, is_used)
      VALUES ($1, $2, $3, $4, 0, 5, false);
    `, [normalizedEmail, otpHash, purpose, expiresAt]);

    // Send via email
    await emailService.sendOtpEmail(normalizedEmail, user.name, otp, purpose);

    return sendSuccess(
      res,
      { email: normalizedEmail },
      'A fresh 6-digit verification code has been dispatched to your email address.'
    );
  } catch (error) {
    console.error('Resend OTP error:', error);
    return sendError(res, 'Failed to resend OTP: ' + error.message, 500);
  }
}

// Fallback: VERIFY EMAIL VIA TOKEN LINK (for backward compatibility if someone clicks link)
async function verifyEmail(req, res) {
  try {
    const token = req.body?.token || req.query?.token;
    const email = req.body?.email || req.query?.email;

    if (!token) {
      return sendError(res, 'Verification token is required.', 400);
    }

    const cleanToken = token.trim();
    let querySql = `
      SELECT u.id, u.name, u.email, u.email_verified, u.is_active, u.approval_status, u.role_id, 
             u.verification_token, u.verification_token_expires_at,
             r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.verification_token = $1
    `;
    let queryParams = [cleanToken];

    if (email) {
      querySql += ` OR (u.email = $2 AND u.verification_token = $1)`;
      queryParams.push(email.trim().toLowerCase());
    }

    const userRes = await db.query(querySql, queryParams);

    if (userRes.rows.length === 0) {
      return sendError(res, 'Invalid or expired verification link.', 400);
    }

    const user = userRes.rows[0];

    if (user.email_verified) {
      if (user.approval_status === 'PENDING') {
        await db.query(`UPDATE users SET approval_status = 'APPROVED', is_active = true, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) WHERE id = $1`, [user.id]);
      }
      return sendSuccess(res, { emailVerified: true, alreadyVerified: true, approvalStatus: 'APPROVED' }, 'Email is already verified. You can log in.');
    }

    // Auto-approve and activate upon email verification link
    await db.query(`
      UPDATE users 
      SET email_verified = true, 
          is_active = true,
          approval_status = 'APPROVED',
          approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP),
          verification_token = NULL, 
          verification_token_expires_at = NULL, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [user.id]);

    const permResult = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [user.role_id]);
    const permissions = permResult.rows.map(r => r.code);
    const jwtToken = generateToken({ ...user, approval_status: 'APPROVED', is_active: true }, permissions);

    return sendSuccess(
      res,
      {
        token: jwtToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role_name,
          emailVerified: true,
          approvalStatus: 'APPROVED'
        }
      },
      'Email verified successfully! Your account is now active.'
    );
  } catch (error) {
    return sendError(res, 'Failed to verify email: ' + error.message, 500);
  }
}

async function resendVerificationLink(req, res) {
  return resendOtp(req, res);
}

// Helper to get effective permissions (User custom permissions if enabled, else Role permissions)
async function getEffectivePermissions(userId, roleId, hasCustomPermissions) {
  if (hasCustomPermissions) {
    const res = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = $1
    `, [userId]);
    return res.rows.map(r => r.code);
  } else {
    const res = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
    `, [roleId]);
    return res.rows.map(r => r.code);
  }
}

// 4. LOGIN
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Query user with role and store details
    const userRes = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.password_hash, u.role_id, u.store_id, 
        u.is_active, u.email_verified, u.approval_status, u.last_login, u.has_custom_permissions,
        r.name AS role_name, r.display_name AS role_display_name,
        s.name AS store_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.email = $1
    `, [normalizedEmail]);

    if (userRes.rows.length === 0) {
      return sendError(res, 'Invalid credentials. Please verify your email and password.', 401);
    }

    const user = userRes.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials. Please verify your email and password.', 401);
    }

    // Check email verification
    if (!user.email_verified) {
      return sendError(res, 'Your email is not verified yet. Please enter the 6-digit OTP sent to your email to activate your account.', 403, {
        requiresOtp: true,
        email: user.email
      });
    }

    // If user's email is verified, ensure approval status is APPROVED and account is active
    if (user.approval_status === 'PENDING') {
      await db.query(`
        UPDATE users 
        SET approval_status = 'APPROVED', is_active = true, approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP) 
        WHERE id = $1
      `, [user.id]);
      user.approval_status = 'APPROVED';
      user.is_active = true;
    }

    if (user.approval_status === 'REJECTED') {
      return sendError(
        res,
        'Your registration was reviewed and rejected. Please contact support if you believe this is in error.',
        403,
        {
          rejected: true,
          approvalStatus: 'REJECTED'
        }
      );
    }

    // Check active status
    if (!user.is_active) {
      return sendError(res, 'Your account has been deactivated. Please contact an administrator.', 403);
    }

    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Fetch user effective permissions
    const permissions = await getEffectivePermissions(user.id, user.role_id, user.has_custom_permissions);

    const token = generateToken(user, permissions);

    await logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role_name,
      action: 'LOGIN',
      module: 'AUTH',
      recordId: user.id,
      req
    });

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          roleId: user.role_id,
          role: user.role_name,
          roleDisplayName: user.role_display_name,
          storeId: user.store_id,
          storeName: user.store_name,
          hasCustomPermissions: !!user.has_custom_permissions,
          approvalStatus: user.approval_status || 'APPROVED',
          permissions
        }
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 'Failed to log in: ' + error.message, 500);
  }
}

// 5. CURRENT USER (ME)
async function getMe(req, res) {
  try {
    const userRes = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role_id, u.store_id, 
        u.is_active, u.email_verified, u.approval_status, u.last_login, u.created_at, u.has_custom_permissions,
        r.name AS role_name, r.display_name AS role_display_name,
        s.name AS store_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.id = $1
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const user = userRes.rows[0];

    const permissions = await getEffectivePermissions(user.id, user.role_id, user.has_custom_permissions);

    return sendSuccess(res, {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.role_id,
      role: user.role_name,
      roleDisplayName: user.role_display_name,
      storeId: user.store_id,
      storeName: user.store_name,
      hasCustomPermissions: !!user.has_custom_permissions,
      approvalStatus: user.approval_status || 'APPROVED',
      permissions,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// 6. FORGOT PASSWORD (Dispatches 6-Digit Email OTP)
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'Email is required', 400);

    const normalizedEmail = email.trim().toLowerCase();
    const userRes = await db.query('SELECT id, name, is_active FROM users WHERE email = $1', [normalizedEmail]);

    if (userRes.rows.length === 0) {
      // Don't leak whether email exists
      return sendSuccess(res, { email: normalizedEmail, requiresOtp: true }, 'If that email address is registered, a password reset code has been dispatched.');
    }

    const user = userRes.rows[0];

    // Invalidate previous reset OTPs
    await db.query(`
      UPDATE email_verification_otps 
      SET is_used = true 
      WHERE email = $1 AND purpose = 'PASSWORD_RESET' AND is_used = false
    `, [normalizedEmail]);

    // Generate 6-digit OTP
    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(`
      INSERT INTO email_verification_otps (email, otp_hash, purpose, expires_at, attempts, max_attempts, is_used)
      VALUES ($1, $2, 'PASSWORD_RESET', $3, 0, 5, false);
    `, [normalizedEmail, otpHash, expiresAt]);

    // Send OTP email
    await emailService.sendOtpEmail(normalizedEmail, user.name, otp, 'PASSWORD_RESET');

    return sendSuccess(
      res, 
      { 
        email: normalizedEmail,
        requiresOtp: true
      }, 
      'A 6-digit password reset code has been sent to your email address.'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(res, 'Failed to process request: ' + error.message, 500);
  }
}

// 7. RESET PASSWORD (Verifies 6-digit OTP or link token & Resets Password)
async function resetPassword(req, res) {
  try {
    const { otp, token, email, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return sendError(res, 'New password and password confirmation are required.', 400);
    }

    if (newPassword !== confirmPassword) {
      return sendError(res, 'Passwords do not match.', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'Password must be at least 6 characters.', 400);
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : '';

    // Priority 1: 6-Digit OTP verification
    if (otp && normalizedEmail) {
      const cleanOtp = otp.toString().trim();
      const otpRes = await db.query(`
        SELECT id, otp_hash, expires_at, attempts, max_attempts
        FROM email_verification_otps
        WHERE email = $1 AND purpose = 'PASSWORD_RESET' AND is_used = false
        ORDER BY id DESC
        LIMIT 1;
      `, [normalizedEmail]);

      if (otpRes.rows.length === 0) {
        return sendError(res, 'No active password reset code found for this email. Please click Resend Code.', 400);
      }

      const otpRecord = otpRes.rows[0];

      if (new Date() > new Date(otpRecord.expires_at)) {
        return sendError(res, 'The password reset code has expired (valid for 10 minutes). Please request a new code.', 400);
      }

      if (otpRecord.attempts >= otpRecord.max_attempts) {
        return sendError(res, 'Too many incorrect attempts. Please request a new password reset code.', 400);
      }

      const isMatch = await verifyOTPHash(cleanOtp, otpRecord.otp_hash);
      if (!isMatch) {
        const newAttempts = otpRecord.attempts + 1;
        await db.query('UPDATE email_verification_otps SET attempts = $1 WHERE id = $2', [newAttempts, otpRecord.id]);
        const remaining = otpRecord.max_attempts - newAttempts;
        return sendError(
          res,
          `Invalid 6-digit OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`,
          400
        );
      }

      // Mark OTP used
      await db.query('UPDATE email_verification_otps SET is_used = true WHERE id = $1', [otpRecord.id]);

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      const updateRes = await db.query(`
        UPDATE users 
        SET password_hash = $1, 
            email_verified = true, 
            is_active = true,
            verification_token = NULL,
            verification_token_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP 
        WHERE email = $2
        RETURNING id, name;
      `, [newHash, normalizedEmail]);

      if (updateRes.rows.length === 0) {
        return sendError(res, 'User account not found.', 404);
      }

      await logAudit({
        userId: updateRes.rows[0].id,
        userName: updateRes.rows[0].name,
        action: 'PASSWORD_RESET_OTP',
        module: 'AUTH',
        recordId: updateRes.rows[0].id,
        req
      });

      return sendSuccess(res, null, 'Password reset successfully! Your email is verified and you can now log in.');
    }

    // Priority 2: Fallback Token link verification
    if (token) {
      const cleanToken = token.trim();
      const tokenRes = await db.query(`
        SELECT prt.id, prt.user_id, prt.expires_at, prt.is_used, u.email, u.name, u.role_id
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token_hash = $1 AND prt.is_used = false
        ORDER BY prt.id DESC
        LIMIT 1;
      `, [cleanToken]);

      if (tokenRes.rows.length === 0) {
        return sendError(res, 'Invalid or expired password reset link. Please request a new link.', 400);
      }

      const record = tokenRes.rows[0];

      if (new Date() > new Date(record.expires_at)) {
        return sendError(res, 'The password reset link has expired. Please request a new link.', 400);
      }

      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(newPassword, salt);

      await db.query(`
        UPDATE users 
        SET password_hash = $1, 
            email_verified = true, 
            is_active = true,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [newHash, record.user_id]);

      await db.query('UPDATE password_reset_tokens SET is_used = true WHERE id = $1', [record.id]);

      return sendSuccess(res, null, 'Password reset successfully! Your email is verified and you can now log in.');
    }

    return sendError(res, 'Verification OTP or reset token is required.', 400);
  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(res, 'Failed to reset password: ' + error.message, 500);
  }
}

// 8. CHANGE PASSWORD (Authenticated)
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 'Current password and new password are required.', 400);
    }

    if (newPassword !== confirmPassword) {
      return sendError(res, 'New passwords do not match.', 400);
    }

    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters long.', 400);
    }

    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);

    if (!isMatch) {
      return sendError(res, 'Incorrect current password.', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, req.user.id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      recordId: req.user.id,
      req
    });

    return sendSuccess(res, null, 'Password updated successfully.');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// 7. Generic Email OTP Verification (Customers, Users, Forms)
async function sendVerificationOtp(req, res) {
  try {
    const { email, name = '', purpose = 'GENERAL_VERIFICATION' } = req.body;
    if (!email) {
      return sendError(res, 'Email address is required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return sendError(res, 'Invalid email format.', 400);
    }

    // Invalidate previous unused OTPs for this email & purpose
    await db.query(`
      UPDATE email_verification_otps
      SET is_used = true
      WHERE email = $1 AND purpose = $2 AND is_used = false
    `, [normalizedEmail, purpose]);

    const otp = generateOTP();
    const otpHash = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.query(`
      INSERT INTO email_verification_otps (email, otp_hash, purpose, expires_at, attempts, max_attempts, is_used)
      VALUES ($1, $2, $3, $4, 0, 5, false)
    `, [normalizedEmail, otpHash, purpose, expiresAt]);

    await emailService.sendOtpEmail(normalizedEmail, name, otp, purpose);

    return sendSuccess(res, { email: normalizedEmail, purpose }, `Verification OTP sent to ${normalizedEmail}. Please enter the 6-digit code.`);
  } catch (error) {
    console.error('sendVerificationOtp error:', error);
    return sendError(res, 'Failed to send verification OTP: ' + error.message, 500);
  }
}

async function verifyEmailOtp(req, res) {
  try {
    const { email, otp, purpose = 'GENERAL_VERIFICATION' } = req.body;
    if (!email || !otp) {
      return sendError(res, 'Email and 6-digit OTP code are required.', 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const otpRes = await db.query(`
      SELECT id, otp_hash, expires_at, attempts, max_attempts
      FROM email_verification_otps
      WHERE email = $1 AND purpose = $2 AND is_used = false AND expires_at > CURRENT_TIMESTAMP
      ORDER BY id DESC
      LIMIT 1
    `, [normalizedEmail, purpose]);

    if (otpRes.rows.length === 0) {
      return sendError(res, 'No active OTP found or code has expired. Please request a new OTP.', 400);
    }

    const otpRecord = otpRes.rows[0];

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await db.query('UPDATE email_verification_otps SET is_used = true WHERE id = $1', [otpRecord.id]);
      return sendError(res, 'Too many incorrect attempts. Please request a new OTP.', 400);
    }

    const isMatch = await verifyOTPHash(cleanOtp, otpRecord.otp_hash);
    if (!isMatch) {
      await db.query('UPDATE email_verification_otps SET attempts = attempts + 1 WHERE id = $1', [otpRecord.id]);
      const remaining = otpRecord.max_attempts - (otpRecord.attempts + 1);
      return sendError(res, `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new code.'}`, 400);
    }

    // Mark OTP verified
    await db.query(`
      UPDATE email_verification_otps
      SET is_used = true, verified_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [otpRecord.id]);

    // If purpose is customer verification, update any existing customer record
    if (purpose === 'CUSTOMER_VERIFICATION') {
      await db.query('UPDATE customers SET email_verified = true WHERE email = $1', [normalizedEmail]);
    }

    return sendSuccess(res, { email: normalizedEmail, verified: true }, 'Email verified successfully with OTP!');
  } catch (error) {
    console.error('verifyEmailOtp error:', error);
    return sendError(res, 'OTP verification failed: ' + error.message, 500);
  }
}

module.exports = {
  register,
  verifyOtp,
  verifyEmail,
  resendOtp,
  resendOTP: resendOtp,
  resendVerificationLink: resendOtp,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  sendVerificationOtp,
  verifyEmailOtp
};
