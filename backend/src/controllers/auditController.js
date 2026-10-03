const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');

async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '15', 10);
    const offset = (page - 1) * limit;

    const moduleFilter = req.query.module;
    const actionFilter = req.query.action;
    const search = req.query.search ? req.query.search.trim() : '';

    let whereClauses = [];
    let params = [];
    let idx = 1;

    if (moduleFilter) {
      whereClauses.push(`module = $${idx}`);
      params.push(moduleFilter);
      idx++;
    }

    if (actionFilter) {
      whereClauses.push(`action = $${idx}`);
      params.push(actionFilter);
      idx++;
    }

    if (search) {
      whereClauses.push(`(user_name ILIKE $${idx} OR record_id ILIKE $${idx} OR action ILIKE $${idx} OR module ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) FROM audit_logs ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT *
      FROM audit_logs
      ${whereSql}
      ORDER BY id DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    return sendSuccess(res, result.rows, 'Audit logs retrieved', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getAuditLogs
};
