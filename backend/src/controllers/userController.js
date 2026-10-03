const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const config = require('../config/config');
const { isValidEmail } = require('../utils/emailValidator');
const emailService = require('../services/emailService');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// List users with search, role filter, status filter, and pagination
async function getUsers(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const roleId = req.query.roleId ? parseInt(req.query.roleId, 10) : null;
    const status = req.query.status; // 'active', 'inactive'
    const approvalStatus = req.query.approvalStatus ? req.query.approvalStatus.trim().toUpperCase() : null;

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      whereClauses.push(`(u.name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (roleId) {
      whereClauses.push(`u.role_id = $${paramIdx}`);
      params.push(roleId);
      paramIdx++;
    }

    if (status === 'active') {
      whereClauses.push(`u.is_active = true`);
    } else if (status === 'inactive') {
      whereClauses.push(`u.is_active = false`);
    }

    if (approvalStatus) {
      whereClauses.push(`u.approval_status = $${paramIdx}`);
      params.push(approvalStatus);
      paramIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count
    const countRes = await db.query(`SELECT COUNT(*) FROM users u ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data query
    const dataSql = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role_id, u.store_id, 
        u.is_active, u.email_verified, u.has_custom_permissions, u.approval_status, u.approved_at, u.last_login, u.created_at, u.updated_at,
        r.name AS role_name, r.display_name AS role_display_name,
        s.name AS store_name,
        ab.name AS approved_by_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      LEFT JOIN users ab ON u.approved_by = ab.id
      ${whereSql}
      ORDER BY u.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    return sendSuccess(res, result.rows, 'Users retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getUsers error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get user by ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role_id, u.store_id, 
        u.is_active, u.email_verified, u.approval_status, u.approved_at, u.last_login, u.created_at,
        r.name AS role_name, r.display_name AS role_display_name,
        s.name AS store_name,
        ab.name AS approved_by_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      LEFT JOIN users ab ON u.approved_by = ab.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Create new user (Admin / Super Admin) - Sends verification link
async function createUser(req, res) {
  try {
    const { name, email, phone, password, roleId, storeId, isActive } = req.body;

    if (!name || !email || !password || !roleId) {
      return sendError(res, 'Name, email, password, and role are required.', 400);
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return sendError(res, 'Invalid email format.', 400);
    }

    // Check email uniqueness
    const checkEmail = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (checkEmail.rows.length > 0) {
      return sendError(res, 'A user with this email already exists.', 400);
    }

    // Role check: If current user is Admin, cannot create Super Admin
    const targetRoleRes = await db.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    if (targetRoleRes.rows.length === 0) {
      return sendError(res, 'Selected role does not exist.', 400);
    }

    const targetRoleName = targetRoleRes.rows[0].name;
    if (req.user.roleName !== 'super_admin' && targetRoleName === 'super_admin') {
      return sendError(res, 'Only Super Admin can create another Super Admin.', 403);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate 32-byte hex verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Check if email was verified via OTP
    const verifiedOtpCheck = await db.query(`
      SELECT id FROM email_verification_otps
      WHERE email = $1 AND is_used = true AND verified_at IS NOT NULL
      ORDER BY id DESC LIMIT 1
    `, [normalizedEmail]);
    const isEmailVerified = verifiedOtpCheck.rows.length > 0;

    const insertRes = await db.query(`
      INSERT INTO users (name, email, phone, password_hash, role_id, store_id, is_active, email_verified, verification_token, verification_token_expires_at, approval_status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'APPROVED', $11, CURRENT_TIMESTAMP)
      RETURNING id, name, email, phone, role_id, store_id, is_active, email_verified, approval_status, created_at;
    `, [name.trim(), normalizedEmail, cleanPhone, passwordHash, roleId, storeId || null, isActive !== false, isEmailVerified, verificationToken, tokenExpiresAt, req.user.id]);

    const newUser = insertRes.rows[0];

    // Send verification link via email
    await emailService.sendVerificationLink(normalizedEmail, newUser.name, verificationToken, config.frontendUrl);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'USERS',
      recordId: newUser.id,
      newValues: { name: newUser.name, email: newUser.email, role: targetRoleName },
      req
    });

    const devVerificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

    return sendSuccess(
      res, 
      {
        ...newUser,
        devVerificationUrl: !config.smtp.user || config.nodeEnv === 'development' ? devVerificationUrl : undefined
      }, 
      'User created successfully! A verification link has been dispatched to their email address.', 
      201
    );
  } catch (error) {
    console.error('createUser error:', error);
    return sendError(res, error.message, 500);
  }
}

// Update user
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, roleId, storeId, isActive } = req.body;

    // Check existing target user
    const targetRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [id]);

    if (targetRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = targetRes.rows[0];

    // Protection: Admin cannot modify Super Admin
    if (targetUser.role_name === 'super_admin' && req.user.roleName !== 'super_admin') {
      return sendError(res, 'Cannot modify Super Admin account.', 403);
    }

    // If role is being changed to Super Admin, only Super Admin can do so
    if (roleId && roleId !== targetUser.role_id) {
      const newRoleRes = await db.query('SELECT name FROM roles WHERE id = $1', [roleId]);
      if (newRoleRes.rows[0]?.name === 'super_admin' && req.user.roleName !== 'super_admin') {
        return sendError(res, 'Only Super Admin can assign the Super Admin role.', 403);
      }
    }

    let cleanPhone = undefined;
    if (phone !== undefined) {
      if (phone) {
        cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
        }
      } else {
        cleanPhone = null;
      }
    }

    const updateRes = await db.query(`
      UPDATE users
      SET 
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        role_id = COALESCE($3, role_id),
        store_id = $4,
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING id, name, email, phone, role_id, store_id, is_active, updated_at;
    `, [
      name ? name.trim() : null,
      cleanPhone !== undefined ? cleanPhone : null,
      roleId || null,
      storeId || null,
      isActive !== undefined ? isActive : null,
      id
    ]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE',
      module: 'USERS',
      recordId: id,
      oldValues: { name: targetUser.name, role: targetUser.role_name },
      newValues: { name, roleId, isActive },
      req
    });

    return sendSuccess(res, updateRes.rows[0], 'User updated successfully');
  } catch (error) {
    console.error('updateUser error:', error);
    return sendError(res, error.message, 500);
  }
}

// Reset password by Admin
async function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters.', 400);
    }

    const targetRes = await db.query(`
      SELECT u.id, u.name, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [id]);

    if (targetRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    if (targetRes.rows[0].role_name === 'super_admin' && req.user.roleName !== 'super_admin') {
      return sendError(res, 'Cannot reset Super Admin password.', 403);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [passwordHash, id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'ADMIN_RESET_PASSWORD',
      module: 'USERS',
      recordId: id,
      req
    });

    return sendSuccess(res, null, 'User password has been successfully reset.');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Deactivate / Delete user
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const targetRes = await db.query(`
      SELECT u.id, u.name, u.email, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [id]);

    if (targetRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const targetUser = targetRes.rows[0];

    if (targetUser.role_name === 'super_admin') {
      return sendError(res, 'Super Admin cannot be deleted.', 403);
    }

    if (parseInt(id, 10) === req.user.id) {
      return sendError(res, 'You cannot delete your own account.', 400);
    }

    // Permanently delete user from database
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'DELETE_USER',
      module: 'USERS',
      recordId: id,
      oldValues: { name: targetUser.name, email: targetUser.email, role: targetUser.role_name },
      req
    });

    return sendSuccess(res, null, `User "${targetUser.name}" has been permanently deleted.`);
  } catch (error) {
    console.error('deleteUser error:', error);
    return sendError(res, error.message, 500);
  }
}

// Resend Verification Link to an unverified user
async function resendUserVerification(req, res) {
  try {
    const { id } = req.params;

    const userRes = await db.query('SELECT id, name, email, email_verified FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    const user = userRes.rows[0];
    if (user.email_verified) {
      return sendError(res, 'This user email is already verified.', 400);
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(`
      UPDATE users 
      SET verification_token = $1, 
          verification_token_expires_at = $2, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3
    `, [verificationToken, tokenExpiresAt, id]);

    await emailService.sendVerificationLink(user.email, user.name, verificationToken, config.frontendUrl);

    const devVerificationUrl = `${config.frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    return sendSuccess(
      res,
      {
        email: user.email,
        devVerificationUrl: !config.smtp.user || config.nodeEnv === 'development' ? devVerificationUrl : undefined
      },
      `Verification link successfully dispatched to ${user.email}.`
    );
  } catch (error) {
    console.error('resendUserVerification error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get list of sales reps for assignment dropdowns (ONLY sales_person role)
async function getSalesReps(req, res) {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.is_active = true 
        AND r.name = 'sales_person'
      ORDER BY u.name ASC;
    `);

    return sendSuccess(res, result.rows, 'Sales representatives retrieved successfully');
  } catch (error) {
    console.error('getSalesReps error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get list of pending user registrations awaiting Super Admin approval
async function getPendingApprovals(req, res) {
  try {
    const result = await db.query(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role_id, u.store_id,
        u.is_active, u.email_verified, u.approval_status, u.created_at,
        r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.approval_status = 'PENDING'
      ORDER BY u.id DESC;
    `);

    return sendSuccess(res, result.rows, 'Pending user approvals retrieved successfully');
  } catch (error) {
    console.error('getPendingApprovals error:', error);
    return sendError(res, error.message, 500);
  }
}

// Approve user registration (Super Admin or Admin)
async function approveUser(req, res) {
  try {
    const { id } = req.params;
    const { roleId, storeId } = req.body;

    // Only Super Admin or Admin can approve
    if (req.user.roleName !== 'super_admin' && req.user.roleName !== 'admin') {
      return sendError(res, 'Only Super Admin can approve user registrations.', 403);
    }

    const targetRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role_id, u.store_id, u.approval_status,
             r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);

    if (targetRes.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    const targetUser = targetRes.rows[0];

    // Determine role to assign
    let finalRoleId = targetUser.role_id;
    if (roleId) {
      finalRoleId = parseInt(roleId, 10);
    }

    let finalStoreId = storeId !== undefined ? (storeId ? parseInt(storeId, 10) : null) : targetUser.store_id;

    const updateRes = await db.query(`
      UPDATE users
      SET 
        approval_status = 'APPROVED',
        is_active = true,
        approved_by = $1,
        approved_at = CURRENT_TIMESTAMP,
        role_id = COALESCE($2, role_id),
        store_id = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, name, email, phone, role_id, store_id, is_active, approval_status, approved_at;
    `, [req.user.id, finalRoleId, finalStoreId, id]);

    const updatedUser = updateRes.rows[0];

    // Fetch role display name
    const roleInfo = await db.query('SELECT name, display_name FROM roles WHERE id = $1', [updatedUser.role_id]);
    const roleDisplayName = roleInfo.rows[0]?.display_name || 'Sales Person';

    // Dispatch notification email
    emailService.sendAccountApprovedEmail(targetUser.email, targetUser.name, roleDisplayName).catch(e => {
      console.warn('Failed to dispatch account approved email:', e.message);
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'APPROVE_USER',
      module: 'USERS',
      recordId: id,
      newValues: { approval_status: 'APPROVED', is_active: true, role: roleDisplayName },
      req
    });

    return sendSuccess(
      res, 
      updatedUser, 
      `User "${targetUser.name}" has been successfully verified & approved! Sales Person dashboard access granted.`
    );
  } catch (error) {
    console.error('approveUser error:', error);
    return sendError(res, error.message, 500);
  }
}

// Reject user registration (Super Admin or Admin)
async function rejectUser(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (req.user.roleName !== 'super_admin' && req.user.roleName !== 'admin') {
      return sendError(res, 'Only Super Admin can reject user registrations.', 403);
    }

    const targetRes = await db.query(`
      SELECT u.id, u.name, u.email, u.approval_status
      FROM users u
      WHERE u.id = $1
    `, [id]);

    if (targetRes.rows.length === 0) {
      return sendError(res, 'User not found.', 404);
    }

    const targetUser = targetRes.rows[0];

    await db.query(`
      UPDATE users
      SET 
        approval_status = 'REJECTED',
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    emailService.sendAccountRejectedEmail(targetUser.email, targetUser.name, reason).catch(e => {
      console.warn('Failed to dispatch rejection email:', e.message);
    });

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'REJECT_USER',
      module: 'USERS',
      recordId: id,
      newValues: { approval_status: 'REJECTED', reason },
      req
    });

    return sendSuccess(res, null, `Registration for "${targetUser.name}" has been rejected.`);
  } catch (error) {
    console.error('rejectUser error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get permissions matrix for a specific user
async function getUserPermissions(req, res) {
  try {
    const { id } = req.params;

    const userRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role_id, u.has_custom_permissions,
             r.name AS role_name, r.display_name AS role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);

    if (userRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const user = userRes.rows[0];

    // All system permissions grouped by module
    const allPermsRes = await db.query(`
      SELECT id, code, module, description
      FROM permissions
      ORDER BY module ASC, code ASC;
    `);

    // Role default permission IDs
    const rolePermsRes = await db.query(`
      SELECT permission_id FROM role_permissions WHERE role_id = $1
    `, [user.role_id]);
    const rolePermissionIds = rolePermsRes.rows.map(r => r.permission_id);

    // User's custom permission IDs (if any)
    const userPermsRes = await db.query(`
      SELECT permission_id FROM user_permissions WHERE user_id = $1
    `, [id]);
    const userPermissionIds = userPermsRes.rows.map(r => r.permission_id);

    return sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.role_id,
        roleName: user.role_name,
        roleDisplayName: user.role_display_name,
        hasCustomPermissions: !!user.has_custom_permissions
      },
      hasCustomPermissions: !!user.has_custom_permissions,
      rolePermissionIds,
      userPermissionIds,
      effectivePermissionIds: user.has_custom_permissions ? userPermissionIds : rolePermissionIds,
      allPermissions: allPermsRes.rows
    }, 'User permissions retrieved successfully');
  } catch (error) {
    console.error('getUserPermissions error:', error);
    return sendError(res, error.message, 500);
  }
}

// Update permissions for a specific user (Super Admin only)
async function updateUserPermissions(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { permissionIds, resetToRole } = req.body;

    const userRes = await client.query('SELECT u.id, u.name, u.email, u.role_id, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1', [id]);
    if (userRes.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }
    const user = userRes.rows[0];

    await client.query('BEGIN');

    if (resetToRole) {
      // Revert to role default
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [id]);
      await client.query('UPDATE users SET has_custom_permissions = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    } else {
      if (!Array.isArray(permissionIds)) {
        await client.query('ROLLBACK');
        return sendError(res, 'permissionIds must be an array of permission IDs', 400);
      }

      // Clear existing user permissions
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [id]);

      // Insert new user permissions
      for (const pId of permissionIds) {
        await client.query('INSERT INTO user_permissions (user_id, permission_id) VALUES ($1, $2)', [id, pId]);
      }

      await client.query('UPDATE users SET has_custom_permissions = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    }

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: resetToRole ? 'RESET_USER_PERMISSIONS' : 'UPDATE_USER_PERMISSIONS',
      module: 'USERS',
      recordId: id,
      newValues: { targetUser: user.name, hasCustomPermissions: !resetToRole, permissionCount: resetToRole ? 0 : permissionIds.length },
      req
    });

    return sendSuccess(res, {
      userId: user.id,
      hasCustomPermissions: !resetToRole
    }, resetToRole ? `Permissions reset to default role (${user.role_name}) for ${user.name}` : `Custom permissions saved successfully for ${user.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateUserPermissions error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser,
  resendUserVerification,
  getSalesReps,
  getPendingApprovals,
  approveUser,
  rejectUser,
  getUserPermissions,
  updateUserPermissions
};

