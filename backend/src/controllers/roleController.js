const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Get all roles with their assigned permissions
async function getRoles(req, res) {
  try {
    const rolesRes = await db.query(`
      SELECT 
        r.id, r.name, r.display_name, r.description, r.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COALESCE(
          json_agg(
            json_build_object('id', p.id, 'code', p.code, 'module', p.module, 'description', p.description)
          ) FILTER (WHERE p.id IS NOT NULL), '[]'
        ) as permissions
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      GROUP BY r.id
      ORDER BY r.id ASC;
    `);

    return sendSuccess(res, rolesRes.rows, 'Roles retrieved successfully');
  } catch (error) {
    console.error('getRoles error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get all permissions list grouped by module
async function getAllPermissions(req, res) {
  try {
    const result = await db.query(`
      SELECT id, code, module, description
      FROM permissions
      ORDER BY module ASC, code ASC;
    `);

    return sendSuccess(res, result.rows, 'Permissions retrieved successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Update permissions for a specific role (Super Admin only)
async function updateRolePermissions(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { permissionIds } = req.body; // array of integers

    if (!Array.isArray(permissionIds)) {
      return sendError(res, 'permissionIds must be an array of permission IDs', 400);
    }

    const roleRes = await client.query('SELECT id, name FROM roles WHERE id = $1', [id]);
    if (roleRes.rows.length === 0) {
      return sendError(res, 'Role not found', 404);
    }

    const role = roleRes.rows[0];

    await client.query('BEGIN');

    // Remove existing
    await client.query('DELETE FROM role_permissions WHERE role_id = $1', [id]);

    // Insert new
    for (const pId of permissionIds) {
      await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [id, pId]);
    }

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE_PERMISSIONS',
      module: 'ROLES',
      recordId: id,
      newValues: { role: role.name, permissionCount: permissionIds.length },
      req
    });

    return sendSuccess(res, null, `Permissions updated for role ${role.name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateRolePermissions error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

module.exports = {
  getRoles,
  getAllPermissions,
  updateRolePermissions
};
