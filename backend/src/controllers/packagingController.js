const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// 1. GET PACKAGING LIST
async function getPackagingOrders(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const packagingStatus = req.query.packagingStatus;
    const storeId = req.query.storeId ? parseInt(req.query.storeId, 10) : null;
    const search = req.query.search ? req.query.search.trim() : '';

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    // Store manager restriction to their assigned store if applicable
    if (req.user.roleName === 'store_manager' && req.user.storeId) {
      whereClauses.push(`(so.store_id = $${paramIdx} OR so.store_id IS NULL)`);
      params.push(req.user.storeId);
      paramIdx++;
    } else if (storeId) {
      whereClauses.push(`so.store_id = $${paramIdx}`);
      params.push(storeId);
      paramIdx++;
    }

    if (packagingStatus) {
      whereClauses.push(`COALESCE(pkg.packaging_status, 'WAITING_FOR_PACKAGING') = $${paramIdx}`);
      params.push(packagingStatus);
      paramIdx++;
    }

    if (search) {
      whereClauses.push(`(so.order_number ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR pkg.tracking_number ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Include orders in packaging stages (case-insensitive)
    whereClauses.push(`UPPER(so.order_status) IN ('CONFIRMED', 'PROCESSING', 'PACKAGING', 'PACKED', 'DISPATCHED')`);

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Total Count
    const countSql = `
      SELECT COUNT(DISTINCT so.id)
      FROM sales_orders so
      LEFT JOIN packaging pkg ON so.id = pkg.order_id
      LEFT JOIN customers c ON so.customer_id = c.id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Data
    const dataSql = `
      SELECT 
        so.id AS order_id, so.order_number, so.order_date, so.order_status, so.grand_total,
        c.name AS customer_name, c.phone AS customer_phone, c.city AS customer_city,
        s.name AS store_name,
        pkg.id AS packaging_id,
        COALESCE(pkg.packaging_status, 'WAITING_FOR_PACKAGING') AS packaging_status,
        pkg.package_count, pkg.weight_kg, pkg.dimensions, pkg.packaging_material,
        pkg.tracking_number, pkg.carrier_name, pkg.quality_checked, pkg.quality_checker_name,
        pkg.packed_at, pkg.dispatched_at, pkg.remarks AS packaging_remarks,
        u.name AS assigned_to_name,
        COUNT(items.id) AS total_items,
        SUM(items.quantity) AS total_quantity
      FROM sales_orders so
      LEFT JOIN packaging pkg ON so.id = pkg.order_id
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN stores s ON so.store_id = s.id
      LEFT JOIN users u ON pkg.assigned_to = u.id
      LEFT JOIN sales_order_items items ON so.id = items.order_id
      ${whereSql}
      GROUP BY so.id, c.name, c.phone, c.city, s.name, pkg.id, u.name
      ORDER BY 
        CASE 
          WHEN pkg.packaging_status = 'WAITING_FOR_PACKAGING' THEN 1
          WHEN pkg.packaging_status = 'PACKAGING_STARTED' THEN 2
          WHEN pkg.packaging_status = 'QUALITY_CHECK' THEN 3
          WHEN pkg.packaging_status = 'PACKED' THEN 4
          WHEN pkg.packaging_status = 'READY_FOR_DISPATCH' THEN 5
          ELSE 6
        END ASC,
        so.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    // Packaging Summary Counts for Dashboard Cards
    const summarySql = `
      SELECT 
        COUNT(*) FILTER (WHERE COALESCE(pkg.packaging_status, 'WAITING_FOR_PACKAGING') = 'WAITING_FOR_PACKAGING' AND so.order_status != 'CANCELLED') as waiting_count,
        COUNT(*) FILTER (WHERE pkg.packaging_status = 'PACKAGING_STARTED') as in_progress_count,
        COUNT(*) FILTER (WHERE pkg.packaging_status = 'QUALITY_CHECK') as quality_check_count,
        COUNT(*) FILTER (WHERE pkg.packaging_status = 'PACKED') as packed_count,
        COUNT(*) FILTER (WHERE pkg.packaging_status = 'READY_FOR_DISPATCH') as ready_for_dispatch_count
      FROM sales_orders so
      LEFT JOIN packaging pkg ON so.id = pkg.order_id
      WHERE UPPER(so.order_status) IN ('CONFIRMED', 'PROCESSING', 'PACKAGING', 'PACKED', 'DISPATCHED')
      ${req.user.roleName === 'store_manager' && req.user.storeId ? `AND (so.store_id = ${req.user.storeId} OR so.store_id IS NULL)` : ''};
    `;
    const summaryRes = await db.query(summarySql);

    return sendSuccess(res, result.rows, 'Packaging orders retrieved', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: summaryRes.rows[0]
    });
  } catch (error) {
    console.error('getPackagingOrders error:', error);
    return sendError(res, error.message, 500);
  }
}

// 2. GET PACKAGING DETAILS (With line items)
async function getPackagingDetails(req, res) {
  try {
    const { orderId } = req.params;

    const orderRes = await db.query(`
      SELECT 
        so.*,
        c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
        s.name AS store_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN stores s ON so.store_id = s.id
      WHERE so.id = $1
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }

    const order = orderRes.rows[0];

    // Ensure packaging record exists
    let pkgRes = await db.query('SELECT * FROM packaging WHERE order_id = $1', [orderId]);
    if (pkgRes.rows.length === 0) {
      const createPkg = await db.query(`
        INSERT INTO packaging (order_id, store_id, packaging_status)
        VALUES ($1, $2, 'WAITING_FOR_PACKAGING')
        RETURNING *;
      `, [orderId, order.store_id]);
      pkgRes = createPkg;
    }

    const packaging = pkgRes.rows[0];

    // Get items
    const itemsRes = await db.query(`
      SELECT 
        i.*,
        p.name AS product_name, p.sku AS product_sku,
        u.code AS unit_code
      FROM sales_order_items i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE i.order_id = $1
      ORDER BY i.id ASC;
    `, [orderId]);

    return sendSuccess(res, {
      order,
      packaging,
      items: itemsRes.rows
    });
  } catch (error) {
    console.error('getPackagingDetails error:', error);
    return sendError(res, error.message, 500);
  }
}

// 3. UPDATE PACKAGING PROCESS & STATUS
async function updatePackaging(req, res) {
  const client = await db.getClient();
  try {
    const { orderId } = req.params;
    const {
      packagingStatus, // 'WAITING_FOR_PACKAGING', 'PACKAGING_STARTED', 'QUALITY_CHECK', 'PACKED', 'READY_FOR_DISPATCH'
      packageCount,
      weightKg,
      dimensions,
      packagingMaterial,
      trackingNumber,
      carrierName,
      qualityChecked,
      qualityCheckerName,
      qualityNotes,
      remarks,
      assignedTo
    } = req.body;

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }
    const order = orderRes.rows[0];

    await client.query('BEGIN');

    // Check existing packaging
    const existingPkgRes = await client.query('SELECT * FROM packaging WHERE order_id = $1', [orderId]);
    let oldPackaging = existingPkgRes.rows[0];

    let packedAt = oldPackaging?.packed_at;
    let dispatchedAt = oldPackaging?.dispatched_at;

    if (packagingStatus === 'PACKED' && !packedAt) {
      packedAt = new Date();
    }
    if (packagingStatus === 'READY_FOR_DISPATCH' && !dispatchedAt) {
      dispatchedAt = new Date();
    }

    let updatedPkg;
    if (!oldPackaging) {
      const insertSql = `
        INSERT INTO packaging (
          order_id, store_id, packaging_status, assigned_to,
          package_count, weight_kg, dimensions, packaging_material,
          tracking_number, carrier_name, quality_checked, quality_checker_name, quality_notes,
          remarks, packed_at, dispatched_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;
      const insRes = await client.query(insertSql, [
        orderId,
        order.store_id,
        packagingStatus || 'PACKAGING_STARTED',
        assignedTo || req.user.id,
        packageCount || 1,
        weightKg || 0.0,
        dimensions || null,
        packagingMaterial || null,
        trackingNumber || null,
        carrierName || null,
        qualityChecked || false,
        qualityCheckerName || null,
        qualityNotes || null,
        remarks || null,
        packedAt,
        dispatchedAt
      ]);
      updatedPkg = insRes.rows[0];
    } else {
      const updateSql = `
        UPDATE packaging
        SET
          packaging_status = COALESCE($1, packaging_status),
          assigned_to = COALESCE($2, assigned_to),
          package_count = COALESCE($3, package_count),
          weight_kg = COALESCE($4, weight_kg),
          dimensions = COALESCE($5, dimensions),
          packaging_material = COALESCE($6, packaging_material),
          tracking_number = COALESCE($7, tracking_number),
          carrier_name = COALESCE($8, carrier_name),
          quality_checked = COALESCE($9, quality_checked),
          quality_checker_name = COALESCE($10, quality_checker_name),
          quality_notes = COALESCE($11, quality_notes),
          remarks = COALESCE($12, remarks),
          packed_at = COALESCE($13, packed_at),
          dispatched_at = COALESCE($14, dispatched_at),
          updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $15
        RETURNING *;
      `;
      const upRes = await client.query(updateSql, [
        packagingStatus || null,
        assignedTo || null,
        packageCount !== undefined ? packageCount : null,
        weightKg !== undefined ? weightKg : null,
        dimensions !== undefined ? dimensions : null,
        packagingMaterial !== undefined ? packagingMaterial : null,
        trackingNumber !== undefined ? trackingNumber : null,
        carrierName !== undefined ? carrierName : null,
        qualityChecked !== undefined ? qualityChecked : null,
        qualityCheckerName !== undefined ? qualityCheckerName : null,
        qualityNotes !== undefined ? qualityNotes : null,
        remarks !== undefined ? remarks : null,
        packedAt || null,
        dispatchedAt || null,
        orderId
      ]);
      updatedPkg = upRes.rows[0];
    }

    // Sync Sales Order Status with Packaging stage
    let correspondingOrderStatus = order.order_status;
    if (packagingStatus === 'PACKAGING_STARTED' || packagingStatus === 'QUALITY_CHECK') {
      correspondingOrderStatus = 'PACKAGING';
    } else if (packagingStatus === 'PACKED') {
      correspondingOrderStatus = 'PACKED';
    } else if (packagingStatus === 'READY_FOR_DISPATCH') {
      correspondingOrderStatus = 'PACKED';
    }

    if (correspondingOrderStatus !== order.order_status) {
      await client.query(`
        UPDATE sales_orders
        SET order_status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2;
      `, [correspondingOrderStatus, orderId]);

      // Record in order status history
      await client.query(`
        INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, remarks)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        orderId,
        order.order_status,
        correspondingOrderStatus,
        req.user.id,
        `Packaging update: ${packagingStatus}. ${remarks || ''}`
      ]);
    }

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE',
      module: 'PACKAGING',
      recordId: order.order_number,
      oldValues: { packaging_status: oldPackaging?.packaging_status },
      newValues: { packaging_status: packagingStatus, packageCount, weightKg },
      req
    });

    return sendSuccess(res, updatedPkg, `Packaging updated to ${packagingStatus}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updatePackaging error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

module.exports = {
  getPackagingOrders,
  getPackagingDetails,
  updatePackaging
};
