const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../config/db');
const { sendError } = require('../utils/apiResponse');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Token expired. Please log in again.', 401);
      }
      return sendError(res, 'Invalid token. Authorization denied.', 401);
    }

    // Fetch user from DB to ensure still active and permissions are up-to-date
    const userQuery = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role_id, u.store_id, u.is_active, u.email_verified, u.has_custom_permissions,
        r.name AS role_name, r.display_name AS role_display_name,
        s.name AS store_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN stores s ON u.store_id = s.id
      WHERE u.id = $1
    `;
    const userResult = await db.query(userQuery, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return sendError(res, 'User account no longer exists.', 401);
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return sendError(res, 'Your account is deactivated. Contact an administrator.', 403);
    }

    if (!user.email_verified) {
      return sendError(res, 'Email not verified. Please verify your email before proceeding.', 403);
    }

    // Fetch permissions (User Custom Overrides if enabled, otherwise Role Default permissions)
    let permissions = [];
    if (user.has_custom_permissions) {
      const userPermQuery = `
        SELECT p.code
        FROM permissions p
        INNER JOIN user_permissions up ON p.id = up.permission_id
        WHERE up.user_id = $1
      `;
      const permResult = await db.query(userPermQuery, [user.id]);
      permissions = permResult.rows.map(r => r.code);
    } else {
      const rolePermQuery = `
        SELECT p.code
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1
      `;
      const permResult = await db.query(rolePermQuery, [user.role_id]);
      permissions = permResult.rows.map(r => r.code);
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roleId: user.role_id,
      roleName: user.role_name,
      roleDisplayName: user.role_display_name,
      storeId: user.store_id,
      storeName: user.store_name,
      hasCustomPermissions: !!user.has_custom_permissions,
      permissions
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return sendError(res, 'Internal authentication error', 500);
  }
}

module.exports = {
  authenticate
};
