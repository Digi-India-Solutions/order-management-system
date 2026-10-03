const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// List customers with search, status, approvalStatus, and pagination
async function getCustomers(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const status = req.query.status;
    const approvalStatus = req.query.approvalStatus;

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    // Note: Sales persons can now view all customers so they can take orders from any customer!

    if (search) {
      whereClauses.push(`(c.name ILIKE $${paramIdx} OR c.customer_code ILIKE $${paramIdx} OR c.phone ILIKE $${paramIdx} OR c.email ILIKE $${paramIdx} OR c.company_name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (status === 'active') {
      whereClauses.push(`c.is_active = true`);
    } else if (status === 'inactive') {
      whereClauses.push(`c.is_active = false`);
    }

    if (approvalStatus) {
      whereClauses.push(`c.approval_status = $${paramIdx}`);
      params.push(approvalStatus.toUpperCase());
      paramIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) FROM customers c ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        c.id, c.customer_code, c.name, c.company_name, c.email, c.phone, c.gstin,
        c.billing_address, c.shipping_address, c.city, c.state, c.pincode,
        c.assigned_sales_person_id, c.email_verified, c.is_active, 
        c.approval_status, c.approved_by, c.approved_at,
        c.created_at, c.updated_at,
        u.name AS sales_person_name,
        approver.name AS approved_by_name
      FROM customers c
      LEFT JOIN users u ON c.assigned_sales_person_id = u.id
      LEFT JOIN users approver ON c.approved_by = approver.id
      ${whereSql}
      ORDER BY c.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    return sendSuccess(res, result.rows, 'Customers retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getCustomers error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get customer by ID with recent orders
async function getCustomerById(req, res) {
  try {
    const { id } = req.params;

    const custRes = await db.query(`
      SELECT 
        c.*,
        u.name AS sales_person_name
      FROM customers c
      LEFT JOIN users u ON c.assigned_sales_person_id = u.id
      WHERE c.id = $1
    `, [id]);

    if (custRes.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    // Recent orders
    const ordersRes = await db.query(`
      SELECT id, order_number, order_date, grand_total, payment_status, order_status, created_at
      FROM sales_orders
      WHERE customer_id = $1
      ORDER BY id DESC
      LIMIT 5
    `, [id]);

    return sendSuccess(res, {
      customer: custRes.rows[0],
      recentOrders: ordersRes.rows
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Create Customer
async function createCustomer(req, res) {
  try {
    const {
      customerCode,
      name,
      companyName,
      email,
      phone,
      gstin,
      billingAddress,
      shippingAddress,
      city,
      state,
      pincode,
      assignedSalesPersonId
    } = req.body;

    // All fields are mandatory
    if (!name || !name.trim()) {
      return sendError(res, 'Customer name is required.', 400);
    }
    if (!companyName || !companyName.trim()) {
      return sendError(res, 'Company / Organization is required.', 400);
    }
    if (!phone || !phone.trim()) {
      return sendError(res, 'Phone number is required.', 400);
    }
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
    }
    if (!email || !email.trim()) {
      return sendError(res, 'Email address is required.', 400);
    }
    if (!shippingAddress || !shippingAddress.trim()) {
      return sendError(res, 'Shipping / Delivery address is required.', 400);
    }
    if (!city || !city.trim()) {
      return sendError(res, 'City is required.', 400);
    }
    if (!state || !state.trim()) {
      return sendError(res, 'State is required.', 400);
    }
    if (!pincode || !pincode.trim()) {
      return sendError(res, 'Pincode is required.', 400);
    }

    const assignedPerson = assignedSalesPersonId || (req.user.roleName === 'sales_person' ? req.user.id : null);
    if (!assignedPerson) {
      return sendError(res, 'Assigned Sales Rep is required. Please assign a sales person.', 400);
    }

    // Ensure the assigned person strictly has the 'sales_person' role
    const spCheck = await db.query(`
      SELECT u.id FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1 AND r.name = 'sales_person' AND u.is_active = true
    `, [assignedPerson]);
    if (spCheck.rows.length === 0) {
      return sendError(res, 'Assigned Sales Rep must be an active user with the Sales Person role.', 400);
    }

    // Auto-generate code if empty
    let code = customerCode ? customerCode.trim().toUpperCase() : null;
    if (!code) {
      const countRes = await db.query('SELECT COUNT(*) FROM customers');
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      code = `CUST-${String(nextNum).padStart(4, '0')}`;
    }

    // Check unique code
    const existing = await db.query('SELECT id FROM customers WHERE customer_code = $1', [code]);
    if (existing.rows.length > 0) {
      return sendError(res, `Customer code "${code}" already exists.`, 400);
    }

    // Check if customer email was verified with OTP
    let isEmailVerified = false;
    const cleanEmail = email.trim().toLowerCase();
    const verifiedOtpCheck = await db.query(`
      SELECT id FROM email_verification_otps
      WHERE email = $1 AND is_used = true AND verified_at IS NOT NULL
      ORDER BY id DESC LIMIT 1
    `, [cleanEmail]);
    isEmailVerified = verifiedOtpCheck.rows.length > 0;
    if (!isEmailVerified) {
      return sendError(res, 'Email address must be verified with OTP before creating the customer.', 400);
    }

    // Customer email is verified with OTP -> automatically APPROVED
    const initialApprovalStatus = 'APPROVED';
    const approvedBy = req.user.id;
    const approvedAt = new Date();

    const insertRes = await db.query(`
      INSERT INTO customers 
        (customer_code, name, company_name, email, phone, gstin, billing_address, shipping_address, city, state, pincode, assigned_sales_person_id, email_verified, approval_status, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `, [
      code,
      name.trim(),
      companyName ? companyName.trim() : null,
      cleanEmail,
      phone.trim(),
      gstin ? gstin.trim().toUpperCase() : null,
      billingAddress || null,
      shippingAddress || null,
      city || null,
      state || null,
      pincode || null,
      assignedPerson,
      isEmailVerified,
      initialApprovalStatus,
      approvedBy,
      approvedAt
    ]);

    const customer = insertRes.rows[0];

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'CUSTOMERS',
      recordId: customer.id,
      newValues: { code, name: customer.name, phone: customer.phone, approval_status: initialApprovalStatus },
      req
    });

    const successMsg = 'Customer created and approved successfully.';

    return sendSuccess(res, customer, successMsg, 201);
  } catch (error) {
    console.error('createCustomer error:', error);
    return sendError(res, error.message, 500);
  }
}

// Update Customer
async function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      companyName,
      email,
      phone,
      gstin,
      billingAddress,
      shippingAddress,
      city,
      state,
      pincode,
      assignedSalesPersonId,
      isActive
    } = req.body;

    const existingRes = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }

    const oldCustomer = existingRes.rows[0];

    let cleanPhone = null;
    if (phone !== undefined) {
      if (!phone || !phone.trim()) {
        return sendError(res, 'Phone number cannot be empty.', 400);
      }
      cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
      }
    }

    if (assignedSalesPersonId) {
      const spCheck = await db.query(`
        SELECT u.id FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1 AND r.name = 'sales_person' AND u.is_active = true
      `, [assignedSalesPersonId]);
      if (spCheck.rows.length === 0) {
        return sendError(res, 'Assigned Sales Rep must be an active user with the Sales Person role.', 400);
      }
    }

    let isEmailVerified = oldCustomer.email_verified;
    const cleanEmail = email !== undefined ? (email ? email.trim().toLowerCase() : null) : oldCustomer.email;
    if (cleanEmail && cleanEmail !== (oldCustomer.email || '').toLowerCase()) {
      const verifiedOtpCheck = await db.query(`
        SELECT id FROM email_verification_otps
        WHERE email = $1 AND is_used = true AND verified_at IS NOT NULL
        ORDER BY id DESC LIMIT 1
      `, [cleanEmail]);
      isEmailVerified = verifiedOtpCheck.rows.length > 0;
    } else if (!cleanEmail) {
      isEmailVerified = false;
    }

    const updateRes = await db.query(`
      UPDATE customers
      SET 
        name = COALESCE($1, name),
        company_name = COALESCE($2, company_name),
        email = $3,
        phone = COALESCE($4, phone),
        gstin = COALESCE($5, gstin),
        billing_address = COALESCE($6, billing_address),
        shipping_address = COALESCE($7, shipping_address),
        city = COALESCE($8, city),
        state = COALESCE($9, state),
        pincode = COALESCE($10, pincode),
        assigned_sales_person_id = COALESCE($11, assigned_sales_person_id),
        is_active = COALESCE($12, is_active),
        email_verified = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *;
    `, [
      name ? name.trim() : null,
      companyName !== undefined ? companyName : null,
      cleanEmail,
      cleanPhone !== null ? cleanPhone : (phone ? phone.trim() : null),
      gstin !== undefined ? (gstin ? gstin.trim().toUpperCase() : null) : null,
      billingAddress !== undefined ? billingAddress : null,
      shippingAddress !== undefined ? shippingAddress : null,
      city !== undefined ? city : null,
      state !== undefined ? state : null,
      pincode !== undefined ? pincode : null,
      assignedSalesPersonId !== undefined ? assignedSalesPersonId : null,
      isActive !== undefined ? isActive : null,
      isEmailVerified,
      id
    ]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE',
      module: 'CUSTOMERS',
      recordId: id,
      oldValues: { name: oldCustomer.name, phone: oldCustomer.phone },
      newValues: { name, phone, gstin },
      req
    });

    return sendSuccess(res, updateRes.rows[0], 'Customer updated successfully');
  } catch (error) {
    console.error('updateCustomer error:', error);
    return sendError(res, error.message, 500);
  }
}

// Delete Customer
async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;

    // Check if customer has orders
    const orderCheck = await db.query('SELECT id FROM sales_orders WHERE customer_id = $1 LIMIT 1', [id]);
    if (orderCheck.rows.length > 0) {
      // Soft-delete / deactivate instead of hard delete to preserve foreign key constraints
      await db.query('UPDATE customers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return sendSuccess(res, null, 'Customer has existing orders, so their status was set to Inactive.');
    }

    await db.query('DELETE FROM customers WHERE id = $1', [id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'DELETE',
      module: 'CUSTOMERS',
      recordId: id,
      req
    });

    return sendSuccess(res, null, 'Customer deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Approve or Reject Customer (Super Admin / Admin)
async function approveCustomer(req, res) {
  try {
    const { id } = req.params;
    const { status = 'APPROVED', reason } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return sendError(res, 'Status must be APPROVED or REJECTED.', 400);
    }

    const checkRes = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return sendError(res, 'Customer not found.', 404);
    }

    const currentCustomer = checkRes.rows[0];

    const updateRes = await db.query(`
      UPDATE customers
      SET approval_status = $1,
          approved_by = $2,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [status.toUpperCase(), req.user.id, id]);

    const updatedCustomer = updateRes.rows[0];

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: status.toUpperCase() === 'APPROVED' ? 'CUSTOMER_APPROVED' : 'CUSTOMER_REJECTED',
      module: 'CUSTOMERS',
      recordId: id,
      oldValues: { approval_status: currentCustomer.approval_status },
      newValues: { approval_status: status.toUpperCase(), reason },
      req
    });

    return sendSuccess(
      res,
      updatedCustomer,
      `Customer "${updatedCustomer.name}" has been ${status.toUpperCase() === 'APPROVED' ? 'approved and activated' : 'rejected'}.`
    );
  } catch (error) {
    console.error('approveCustomer error:', error);
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  approveCustomer
};
