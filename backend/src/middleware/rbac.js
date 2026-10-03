const { sendError } = require('../utils/apiResponse');

/**
 * Middleware to restrict route to specific roles
 * @param {string|string[]} allowedRoles
 */
function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized. Please authenticate.', 401);
    }

    // Super Admin always has full access
    if (req.user.roleName === 'super_admin') {
      return next();
    }

    if (!roles.includes(req.user.roleName)) {
      return sendError(res, 'Access denied. You do not have the required role to perform this action.', 403);
    }

    next();
  };
}

/**
 * Middleware to check granular permission
 * @param {string|string[]} requiredPermissions
 */
function requirePermission(requiredPermissions) {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized. Please authenticate.', 401);
    }

    // Super Admin has all permissions
    if (req.user.roleName === 'super_admin') {
      return next();
    }

    const userPerms = req.user.permissions || [];
    const hasPermission = permissions.some(p => userPerms.includes(p));

    if (!hasPermission) {
      return sendError(
        res,
        `Access denied. Required permission(s): ${permissions.join(' or ')}`,
        403
      );
    }

    next();
  };
}

module.exports = {
  requireRole,
  requirePermission
};
