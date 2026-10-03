const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Generate Next Order Number (e.g., SO-2026-0005)
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const res = await db.query(
    "SELECT order_number FROM sales_orders WHERE order_number LIKE $1 ORDER BY id DESC LIMIT 1",
    [`SO-${year}-%`]
  );

  let nextSeq = 1;
  if (res.rows.length > 0) {
    const lastNum = res.rows[0].order_number;
    const parts = lastNum.split('-');
    if (parts.length === 3) {
      nextSeq = parseInt(parts[2], 10) + 1;
    }
  }
  return `SO-${year}-${String(nextSeq).padStart(4, '0')}`;
}

// 1. GET ALL ORDERS with filters, search, pagination
async function getOrders(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status;
    const paymentStatus = req.query.paymentStatus;
    const customerId = req.query.customerId ? parseInt(req.query.customerId, 10) : null;
    const salesPersonId = req.query.salesPersonId ? parseInt(req.query.salesPersonId, 10) : null;
    const storeId = req.query.storeId ? parseInt(req.query.storeId, 10) : null;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    // RBAC filter
    if (req.user.roleName === 'sales_person') {
      whereClauses.push(`so.sales_person_id = $${paramIdx}`);
      params.push(req.user.id);
      paramIdx++;
    } else if (req.user.roleName === 'store_manager' && req.user.storeId) {
      whereClauses.push(`(so.store_id = $${paramIdx} OR so.store_id IS NULL)`);
      params.push(req.user.storeId);
      paramIdx++;
    }

    if (search) {
      whereClauses.push(`(so.order_number ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR c.phone ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status) {
      whereClauses.push(`so.order_status ILIKE $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (paymentStatus) {
      // Support flexible matching for both legacy (UNPAID, PARTIAL, PAID) and new (Pending, Partially Paid, Paid)
      whereClauses.push(`(
        so.payment_status ILIKE $${paramIdx}
        OR ($${paramIdx} ILIKE 'Pending' AND so.payment_status IN ('Pending', 'UNPAID'))
        OR ($${paramIdx} ILIKE 'UNPAID' AND so.payment_status IN ('Pending', 'UNPAID'))
        OR ($${paramIdx} ILIKE 'Partially Paid' AND so.payment_status IN ('Partially Paid', 'PARTIAL'))
        OR ($${paramIdx} ILIKE 'PARTIAL' AND so.payment_status IN ('Partially Paid', 'PARTIAL'))
        OR ($${paramIdx} ILIKE 'Paid' AND so.payment_status IN ('Paid', 'PAID'))
        OR ($${paramIdx} ILIKE 'PAID' AND so.payment_status IN ('Paid', 'PAID'))
      )`);
      params.push(paymentStatus);
      paramIdx++;
    }

    if (customerId) {
      whereClauses.push(`so.customer_id = $${paramIdx}`);
      params.push(customerId);
      paramIdx++;
    }

    if (salesPersonId) {
      whereClauses.push(`so.sales_person_id = $${paramIdx}`);
      params.push(salesPersonId);
      paramIdx++;
    }

    if (storeId) {
      whereClauses.push(`so.store_id = $${paramIdx}`);
      params.push(storeId);
      paramIdx++;
    }

    if (startDate) {
      whereClauses.push(`so.order_date >= $${paramIdx}`);
      params.push(startDate);
      paramIdx++;
    }

    if (endDate) {
      whereClauses.push(`so.order_date <= $${paramIdx}`);
      params.push(endDate);
      paramIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(DISTINCT so.id) 
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      ${whereSql}
    `;
    const countRes = await db.query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        so.id, so.order_number, so.order_date, so.customer_id, so.sales_person_id, so.store_id,
        so.subtotal, so.discount_total, so.tax_total, so.grand_total,
        so.paid_amount, so.pending_amount, so.payment_mode,
        so.payment_status, so.order_status, so.delivery_address, so.city, so.state, so.pincode,
        so.remarks, so.created_at, so.updated_at,
        c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
        u.name AS sales_person_name,
        s.name AS store_name,
        pkg.packaging_status,
        COUNT(items.id) as item_count
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_person_id = u.id
      LEFT JOIN stores s ON so.store_id = s.id
      LEFT JOIN packaging pkg ON so.id = pkg.order_id
      LEFT JOIN sales_order_items items ON so.id = items.order_id
      ${whereSql}
      GROUP BY so.id, c.name, c.phone, c.email, u.name, s.name, pkg.packaging_status
      ORDER BY so.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    return sendSuccess(res, result.rows, 'Orders retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getOrders error:', error);
    return sendError(res, error.message, 500);
  }
}

// 2. GET ORDER DETAILS (With items, timeline history, payments and packaging)
async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const orderRes = await db.query(`
      SELECT 
        so.*,
        c.name AS customer_name, c.customer_code, c.company_name, c.phone AS customer_phone, c.email AS customer_email, c.gstin AS customer_gstin,
        u.name AS sales_person_name, u.email AS sales_person_email,
        s.name AS store_name, s.code AS store_code,
        creator.name AS created_by_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_person_id = u.id
      LEFT JOIN stores s ON so.store_id = s.id
      LEFT JOIN users creator ON so.created_by = creator.id
      WHERE so.id = $1
    `, [id]);

    if (orderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }

    const order = orderRes.rows[0];

    // Check RBAC permission for sales person
    if (req.user.roleName === 'sales_person' && order.sales_person_id !== req.user.id) {
      return sendError(res, 'Access denied. You can only view your own sales orders.', 403);
    }

    // Line items (including original_price and selling unit_price)
    const itemsRes = await db.query(`
      SELECT 
        i.*,
        p.name AS product_name, p.sku AS product_sku, p.price AS master_product_price,
        u.code AS unit_code
      FROM sales_order_items i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE i.order_id = $1
      ORDER BY i.id ASC
    `, [id]);

    // Status timeline history
    const historyRes = await db.query(`
      SELECT 
        h.*,
        u.name AS changed_by_name,
        r.display_name AS changed_by_role
      FROM order_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE h.order_id = $1
      ORDER BY h.created_at ASC
    `, [id]);

    // Packaging details
    const pkgRes = await db.query(`
      SELECT 
        pkg.*,
        u.name AS assigned_to_name,
        s.name AS store_name
      FROM packaging pkg
      LEFT JOIN users u ON pkg.assigned_to = u.id
      LEFT JOIN stores s ON pkg.store_id = s.id
      WHERE pkg.order_id = $1
    `, [id]);

    // Payment history
    const paymentsRes = await db.query(`
      SELECT 
        p.*,
        u.name AS received_by_name,
        u.email AS received_by_email
      FROM order_payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.order_id = $1
      ORDER BY p.payment_date ASC, p.id ASC
    `, [id]);

    return sendSuccess(res, {
      ...order,
      items: itemsRes.rows,
      history: historyRes.rows,
      payments: paymentsRes.rows,
      packaging: pkgRes.rows[0] || null
    });
  } catch (error) {
    console.error('getOrderById error:', error);
    return sendError(res, error.message, 500);
  }
}

// 3. CREATE ORDER
async function createOrder(req, res) {
  const client = await db.getClient();
  try {
    const {
      customerId,
      orderDate,
      salesPersonId,
      storeId,
      items, // array of { productId, quantity, sellingPrice, unitPrice, discountPercent, taxRate }
      paidAmount,
      paymentMode,
      paymentNote,
      orderStatus,
      deliveryAddress,
      city,
      state,
      pincode,
      remarks
    } = req.body;

    if (!customerId) {
      return sendError(res, 'Customer is required.', 400);
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Order must contain at least one product item.', 400);
    }

    await client.query('BEGIN');

    // Customer check
    const custRes = await client.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (custRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Customer does not exist.', 404);
    }
    const customer = custRes.rows[0];

    // Auto-approve customer if pending
    if (customer.approval_status === 'PENDING') {
      await client.query(`UPDATE customers SET approval_status = 'APPROVED', approved_at = CURRENT_TIMESTAMP WHERE id = $1`, [customer.id]);
      customer.approval_status = 'APPROVED';
    }

    if (customer.approval_status === 'REJECTED') {
      await client.query('ROLLBACK');
      return sendError(res, 'This customer was rejected and cannot place orders.', 400);
    }

    if (!customer.is_active) {
      await client.query('ROLLBACK');
      return sendError(res, 'This customer account is inactive.', 400);
    }

    // Determine assigned sales person (automatically assigned if sales_person role)
    let assignedSalesPerson = salesPersonId;
    if (req.user.roleName === 'sales_person') {
      assignedSalesPerson = req.user.id;
    } else if (!assignedSalesPerson) {
      assignedSalesPerson = customer.assigned_sales_person_id || req.user.id;
    }

    const orderNumber = await generateOrderNumber();
    let finalOrderStatus = orderStatus || 'Pending';
    if (req.user.roleName === 'sales_person') {
      finalOrderStatus = 'Pending';
    }

    // Calculate totals from items with editable selling price
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let processedItems = [];

    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [item.productId]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return sendError(res, `Product with ID ${item.productId} does not exist.`, 400);
      }
      const product = prodRes.rows[0];

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        await client.query('ROLLBACK');
        return sendError(res, `Invalid quantity for product ${product.name}`, 400);
      }

      // Feature 1: Editable Selling Price at order level (original product price remains untouched in DB)
      const originalPrice = parseFloat(product.price);
      let sellingPrice = originalPrice;
      if (item.sellingPrice !== undefined && item.sellingPrice !== null && item.sellingPrice !== '') {
        sellingPrice = parseFloat(item.sellingPrice);
      } else if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '') {
        sellingPrice = parseFloat(item.unitPrice);
      }

      if (isNaN(sellingPrice) || sellingPrice < 0) {
        await client.query('ROLLBACK');
        return sendError(res, `Invalid selling price for product ${product.name}`, 400);
      }

      const discPercent = parseFloat(item.discountPercent || 0);
      const rawLine = qty * sellingPrice;
      const discAmount = (rawLine * discPercent) / 100;
      const afterDiscount = rawLine - discAmount;

      const taxRate = parseFloat(item.taxRate !== undefined ? item.taxRate : 0);
      const taxAmount = (afterDiscount * taxRate) / 100;
      const lineTotal = afterDiscount + taxAmount;

      subtotal += rawLine;
      discountTotal += discAmount;
      taxTotal += taxAmount;

      processedItems.push({
        productId: product.id,
        quantity: qty,
        originalPrice,
        unitPrice: sellingPrice, // Selling price stored in order items
        discountPercent: discPercent,
        discountAmount: discAmount,
        taxRate,
        taxAmount,
        lineTotal
      });
    }

    const grandTotal = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

    // Feature 2 & 3: Partial Payment System & Validations
    const initialPaid = parseFloat(paidAmount !== undefined && paidAmount !== null && paidAmount !== '' ? paidAmount : 0);
    if (isNaN(initialPaid) || initialPaid < 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Paid amount cannot be negative.', 400);
    }
    if (initialPaid > grandTotal) {
      await client.query('ROLLBACK');
      return sendError(res, `Paid amount (₹${initialPaid}) cannot exceed total order amount (₹${grandTotal}).`, 400);
    }

    const pendingAmount = Math.max(0, Math.round((grandTotal - initialPaid) * 100) / 100);

    let finalPaymentStatus = 'Pending';
    if (initialPaid >= grandTotal && grandTotal > 0) {
      finalPaymentStatus = 'Paid';
    } else if (initialPaid > 0) {
      finalPaymentStatus = 'Partially Paid';
    } else {
      finalPaymentStatus = 'Pending';
    }

    const selectedPaymentMode = initialPaid > 0 ? (paymentMode || 'Cash') : null;

    // Insert sales order
    const insertOrderSql = `
      INSERT INTO sales_orders (
        order_number, order_date, customer_id, sales_person_id, store_id,
        subtotal, discount_total, tax_total, grand_total,
        paid_amount, pending_amount, payment_mode, payment_status, order_status,
        delivery_address, city, state, pincode,
        remarks, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *;
    `;

    // Single warehouse system: auto-bind to the central warehouse
    let finalStoreId = storeId ? parseInt(storeId, 10) : null;
    if (!finalStoreId) {
      const defaultStoreRes = await client.query('SELECT id FROM stores LIMIT 1');
      finalStoreId = defaultStoreRes.rows[0]?.id || 1;
    }

    const orderValues = [
      orderNumber,
      orderDate || new Date().toISOString().split('T')[0],
      customerId,
      assignedSalesPerson,
      finalStoreId,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      initialPaid,
      pendingAmount,
      selectedPaymentMode,
      finalPaymentStatus,
      finalOrderStatus,
      deliveryAddress || customer.shipping_address || customer.billing_address,
      city || customer.city,
      state || customer.state,
      pincode || customer.pincode,
      remarks || null,
      req.user.id
    ];

    const orderResult = await client.query(insertOrderSql, orderValues);
    const newOrder = orderResult.rows[0];

    // Insert items with original_price and selling unit_price
    for (const pItem of processedItems) {
      await client.query(`
        INSERT INTO sales_order_items 
          (order_id, product_id, quantity, original_price, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        newOrder.id,
        pItem.productId,
        pItem.quantity,
        pItem.originalPrice,
        pItem.unitPrice,
        pItem.discountPercent,
        pItem.discountAmount,
        pItem.taxRate,
        pItem.taxAmount,
        pItem.lineTotal
      ]);
    }

    // Feature 4: Maintain Payment History
    if (initialPaid > 0) {
      await client.query(`
        INSERT INTO order_payments (order_id, amount, payment_mode, payment_date, received_by, note)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
      `, [
        newOrder.id,
        initialPaid,
        selectedPaymentMode,
        req.user.id,
        paymentNote || 'Initial payment on order creation'
      ]);
    }

    // Record initial status history
    await client.query(`
      INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, remarks)
      VALUES ($1, null, $2, $3, 'Order created')
    `, [newOrder.id, finalOrderStatus, req.user.id]);

    // If order is created in packaging/packed/confirmed stage, initialize packaging
    if (['CONFIRMED', 'PROCESSING', 'PACKAGING', 'PACKED'].includes(finalOrderStatus.toUpperCase())) {
      await client.query(`
        INSERT INTO packaging (order_id, store_id, packaging_status, assigned_to)
        VALUES ($1, $2, 'WAITING_FOR_PACKAGING', null)
        ON CONFLICT (order_id) DO NOTHING;
      `, [newOrder.id, storeId || null]);
    }

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'ORDERS',
      recordId: newOrder.order_number,
      newValues: {
        orderNumber: newOrder.order_number,
        grandTotal,
        paidAmount: initialPaid,
        pendingAmount,
        paymentStatus: finalPaymentStatus,
        itemsCount: processedItems.length
      },
      req
    });

    return sendSuccess(res, newOrder, 'Sales order created successfully', 201);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createOrder error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

// 4. UPDATE ORDER
async function updateOrder(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const {
      customerId,
      salesPersonId,
      storeId,
      items,
      orderStatus,
      deliveryAddress,
      city,
      state,
      pincode,
      remarks
    } = req.body;

    const existingOrderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (existingOrderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }

    const currentOrder = existingOrderRes.rows[0];

    // Check RBAC permission for sales person
    if (req.user.roleName === 'sales_person') {
      if (currentOrder.sales_person_id !== req.user.id) {
        return sendError(res, 'You can only update your own sales orders.', 403);
      }
      if (['PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].includes(String(currentOrder.order_status).toUpperCase())) {
        return sendError(res, `Cannot modify order once it is ${currentOrder.order_status}.`, 400);
      }
    }

    await client.query('BEGIN');

    let subtotal = currentOrder.subtotal;
    let discountTotal = currentOrder.discount_total;
    let taxTotal = currentOrder.tax_total;
    let grandTotal = currentOrder.grand_total;

    // If items provided, recompute with editable selling price
    if (Array.isArray(items) && items.length > 0) {
      subtotal = 0;
      discountTotal = 0;
      taxTotal = 0;
      let processedItems = [];

      for (const item of items) {
        const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [item.productId]);
        if (prodRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return sendError(res, `Product with ID ${item.productId} not found.`, 400);
        }
        const product = prodRes.rows[0];

        const qty = parseInt(item.quantity, 10);
        const originalPrice = parseFloat(product.price);
        let sellingPrice = originalPrice;
        if (item.sellingPrice !== undefined && item.sellingPrice !== null && item.sellingPrice !== '') {
          sellingPrice = parseFloat(item.sellingPrice);
        } else if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '') {
          sellingPrice = parseFloat(item.unitPrice);
        }

        const discPercent = parseFloat(item.discountPercent || 0);
        const rawLine = qty * sellingPrice;
        const discAmount = (rawLine * discPercent) / 100;
        const afterDiscount = rawLine - discAmount;
        const taxRate = parseFloat(item.taxRate !== undefined ? item.taxRate : 0);
        const taxAmount = (afterDiscount * taxRate) / 100;
        const lineTotal = afterDiscount + taxAmount;

        subtotal += rawLine;
        discountTotal += discAmount;
        taxTotal += taxAmount;

        processedItems.push({
          productId: product.id,
          quantity: qty,
          originalPrice,
          unitPrice: sellingPrice,
          discountPercent: discPercent,
          discountAmount: discAmount,
          taxRate,
          taxAmount,
          lineTotal
        });
      }

      grandTotal = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;

      // Delete existing items and reinsert
      await client.query('DELETE FROM sales_order_items WHERE order_id = $1', [id]);
      for (const pItem of processedItems) {
        await client.query(`
          INSERT INTO sales_order_items 
            (order_id, product_id, quantity, original_price, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id,
          pItem.productId,
          pItem.quantity,
          pItem.originalPrice,
          pItem.unitPrice,
          pItem.discountPercent,
          pItem.discountAmount,
          pItem.taxRate,
          pItem.taxAmount,
          pItem.lineTotal
        ]);
      }
    }

    const newStatus = orderStatus || currentOrder.order_status;

    // Recalculate pending amount and payment status based on current paid amount
    const currentPaid = parseFloat(currentOrder.paid_amount || 0);
    const newPending = Math.max(0, Math.round((grandTotal - currentPaid) * 100) / 100);
    let newPaymentStatus = 'Pending';
    if (currentPaid >= grandTotal && grandTotal > 0) {
      newPaymentStatus = 'Paid';
    } else if (currentPaid > 0) {
      newPaymentStatus = 'Partially Paid';
    }

    // Update sales order
    const updateSql = `
      UPDATE sales_orders
      SET 
        customer_id = COALESCE($1, customer_id),
        sales_person_id = COALESCE($2, sales_person_id),
        store_id = COALESCE($3, store_id),
        subtotal = $4,
        discount_total = $5,
        tax_total = $6,
        grand_total = $7,
        pending_amount = $8,
        payment_status = $9,
        order_status = $10,
        delivery_address = COALESCE($11, delivery_address),
        city = COALESCE($12, city),
        state = COALESCE($13, state),
        pincode = COALESCE($14, pincode),
        remarks = COALESCE($15, remarks),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *;
    `;

    const updatedResult = await client.query(updateSql, [
      customerId || null,
      salesPersonId || null,
      storeId || null,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      newPending,
      newPaymentStatus,
      newStatus,
      deliveryAddress || null,
      city || null,
      state || null,
      pincode || null,
      remarks || null,
      id
    ]);

    // If status changed, record timeline history
    if (newStatus !== currentOrder.order_status) {
      await client.query(`
        INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, remarks)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, currentOrder.order_status, newStatus, req.user.id, remarks || 'Status updated via order edit']);

      // Ensure packaging record exists if in packaging stages
      if (['CONFIRMED', 'PROCESSING', 'PACKAGING', 'PACKED'].includes(String(newStatus).toUpperCase())) {
        await client.query(`
          INSERT INTO packaging (order_id, store_id, packaging_status)
          VALUES ($1, $2, 'WAITING_FOR_PACKAGING')
          ON CONFLICT (order_id) DO NOTHING;
        `, [id, storeId || currentOrder.store_id]);
      }
    }

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE',
      module: 'ORDERS',
      recordId: currentOrder.order_number,
      oldValues: { status: currentOrder.order_status, grandTotal: currentOrder.grand_total },
      newValues: { status: newStatus, grandTotal },
      req
    });

    return sendSuccess(res, updatedResult.rows[0], 'Order updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('updateOrder error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

// 5. UPDATE ORDER STATUS
async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    if (!status) {
      return sendError(res, 'New status is required.', 400);
    }

    const currentOrderRes = await db.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (currentOrderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }

    const currentOrder = currentOrderRes.rows[0];

    // Check permissions
    if (req.user.roleName === 'sales_person') {
      if (currentOrder.sales_person_id !== req.user.id) {
        return sendError(res, 'Access denied. You can only update your own orders.', 403);
      }
      if (['DELIVERED', 'CANCELLED'].includes(String(currentOrder.order_status).toUpperCase())) {
        return sendError(res, 'Cannot change status of delivered or cancelled orders.', 400);
      }
    }

    const updateRes = await db.query(`
      UPDATE sales_orders
      SET order_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *;
    `, [status, id]);

    // Record history
    await db.query(`
      INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, remarks)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, currentOrder.order_status, status, req.user.id, remarks || `Status changed to ${status}`]);

    // Ensure packaging entry exists immediately if order is confirmed or in packaging flow
    const upperStatus = String(status).trim().toUpperCase();
    if (['CONFIRMED', 'PROCESSING', 'PACKAGING', 'PACKED'].includes(upperStatus)) {
      await db.query(`
        INSERT INTO packaging (order_id, store_id, packaging_status)
        VALUES ($1, $2, 'WAITING_FOR_PACKAGING')
        ON CONFLICT (order_id) DO UPDATE SET 
          packaging_status = COALESCE(packaging.packaging_status, 'WAITING_FOR_PACKAGING'),
          store_id = EXCLUDED.store_id;
      `, [id, currentOrder.store_id || 1]);
    } else if (['PENDING', 'CANCELLED', 'DRAFT'].includes(upperStatus)) {
      await db.query(`DELETE FROM packaging WHERE order_id = $1`, [id]);
    }

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'STATUS_CHANGE',
      module: 'ORDERS',
      recordId: currentOrder.order_number,
      oldValues: { status: currentOrder.order_status },
      newValues: { status, remarks },
      req
    });

    return sendSuccess(res, updateRes.rows[0], `Order status updated to ${status}`);
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    return sendError(res, error.message, 500);
  }
}

// 6. RECORD / ADD ORDER PAYMENT (Features 2, 3, 4)
async function addPayment(req, res) {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { amount, paymentMode, paymentDate, note } = req.body;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return sendError(res, 'Payment amount must be greater than zero.', 400);
    }

    const validModes = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];
    if (!paymentMode || !validModes.includes(paymentMode)) {
      return sendError(res, `Invalid payment mode. Supported modes: ${validModes.join(', ')}`, 400);
    }

    await client.query('BEGIN');

    const orderRes = await client.query('SELECT * FROM sales_orders WHERE id = $1 FOR UPDATE', [id]);
    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Order not found.', 404);
    }
    const order = orderRes.rows[0];

    // RBAC check: sales person can record payments for their own orders
    if (req.user.roleName === 'sales_person' && order.sales_person_id !== req.user.id) {
      await client.query('ROLLBACK');
      return sendError(res, 'Access denied. You can only record payments for your own orders.', 403);
    }

    const currentPending = parseFloat(order.pending_amount);
    if (currentPending <= 0) {
      await client.query('ROLLBACK');
      return sendError(res, 'Order is already fully paid.', 400);
    }

    if (parsedAmount > currentPending) {
      await client.query('ROLLBACK');
      return sendError(res, `Payment amount (₹${parsedAmount}) cannot exceed pending amount of ₹${currentPending}.`, 400);
    }

    const currentPaid = parseFloat(order.paid_amount || 0);
    const newPaid = Math.round((currentPaid + parsedAmount) * 100) / 100;
    const grandTotal = parseFloat(order.grand_total);
    const newPending = Math.max(0, Math.round((grandTotal - newPaid) * 100) / 100);

    let newPaymentStatus = 'Pending';
    if (newPending === 0) {
      newPaymentStatus = 'Paid';
    } else if (newPaid > 0) {
      newPaymentStatus = 'Partially Paid';
    }

    // Insert payment record into payment history
    const insertPaymentSql = `
      INSERT INTO order_payments (order_id, amount, payment_mode, payment_date, received_by, note)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const payRes = await client.query(insertPaymentSql, [
      id,
      parsedAmount,
      paymentMode,
      paymentDate || new Date().toISOString(),
      req.user.id,
      note || null
    ]);
    const newPayment = payRes.rows[0];

    // Update sales order
    const updateOrderSql = `
      UPDATE sales_orders
      SET 
        paid_amount = $1,
        pending_amount = $2,
        payment_status = $3,
        payment_mode = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const updatedOrderRes = await client.query(updateOrderSql, [
      newPaid,
      newPending,
      newPaymentStatus,
      paymentMode,
      id
    ]);

    await client.query('COMMIT');

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'PAYMENT_RECORD',
      module: 'ORDERS',
      recordId: order.order_number,
      newValues: {
        paymentId: newPayment.id,
        amount: parsedAmount,
        paymentMode,
        previousPaid: currentPaid,
        newPaid,
        newPending,
        paymentStatus: newPaymentStatus
      },
      req
    });

    return sendSuccess(res, {
      payment: newPayment,
      order: updatedOrderRes.rows[0]
    }, `Payment of ₹${parsedAmount} recorded successfully.`, 201);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('addPayment error:', error);
    return sendError(res, error.message, 500);
  } finally {
    client.release();
  }
}

// 7. DELETE ORDER
async function deleteOrder(req, res) {
  try {
    const { id } = req.params;

    const orderRes = await db.query('SELECT * FROM sales_orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) {
      return sendError(res, 'Order not found', 404);
    }

    const order = orderRes.rows[0];

    // If order is already packed, dispatched, or delivered, do not allow hard deletion
    if (['PACKED', 'DISPATCHED', 'DELIVERED'].includes(String(order.order_status).toUpperCase())) {
      return sendError(res, `Cannot delete an order that is already ${order.order_status}. You may cancel it instead.`, 400);
    }

    await db.query('DELETE FROM sales_orders WHERE id = $1', [id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'DELETE',
      module: 'ORDERS',
      recordId: order.order_number,
      req
    });

    return sendSuccess(res, null, `Order ${order.order_number} has been deleted.`);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  addPayment,
  deleteOrder
};
