const db = require('../config/db');

/**
 * Log an audit trail entry
 */
async function logAudit({
  userId = null,
  userName = 'System',
  role = 'SYSTEM',
  action,
  module,
  recordId = null,
  oldValues = null,
  newValues = null,
  req = null
}) {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || null;
      userAgent = req.headers?.['user-agent'] || null;
      if (!userId && req.user) {
        userId = req.user.id;
        userName = req.user.name;
        role = req.user.roleName || req.user.role;
      }
    }

    const query = `
      INSERT INTO audit_logs 
        (user_id, user_name, role, action, module, record_id, old_values, new_values, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      userId,
      userName,
      role,
      action,
      module,
      recordId ? String(recordId) : null,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
      userAgent
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('[AuditService] Failed to record audit log:', error);
    // Don't crash main operation if audit logging fails
    return null;
  }
}

module.exports = {
  logAudit
};
