const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// ==========================================
// CATEGORIES
// ==========================================
async function getCategories(req, res) {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name ASC;
    `);
    return sendSuccess(res, result.rows);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function createCategory(req, res) {
  try {
    const { name, code, description } = req.body;
    if (!name) return sendError(res, 'Category name is required', 400);

    const catCode = code ? code.trim().toUpperCase() : 'CAT-' + name.substring(0, 4).toUpperCase();
    const result = await db.query(
      `INSERT INTO categories (name, code, description) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), catCode, description || null]
    );

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'MASTERS',
      recordId: result.rows[0].id,
      newValues: { type: 'CATEGORY', name },
      req
    });

    return sendSuccess(res, result.rows[0], 'Category created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const result = await db.query(`
      UPDATE categories
      SET 
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `, [name ? name.trim() : null, code ? code.trim().toUpperCase() : null, description, isActive, id]);

    if (result.rows.length === 0) return sendError(res, 'Category not found', 404);
    return sendSuccess(res, result.rows[0], 'Category updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const prodCheck = await db.query('SELECT id FROM products WHERE category_id = $1 LIMIT 1', [id]);
    if (prodCheck.rows.length > 0) {
      await db.query('UPDATE categories SET is_active = false WHERE id = $1', [id]);
      return sendSuccess(res, null, 'Category is attached to products and was marked Inactive.');
    }
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    return sendSuccess(res, null, 'Category deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// ==========================================
// UNITS
// ==========================================
async function getUnits(req, res) {
  try {
    const result = await db.query('SELECT * FROM units ORDER BY name ASC');
    return sendSuccess(res, result.rows);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function createUnit(req, res) {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return sendError(res, 'Unit name and code (e.g. PCS, KG) are required', 400);

    const result = await db.query(
      `INSERT INTO units (name, code, description) VALUES ($1, $2, $3) RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), description || null]
    );

    return sendSuccess(res, result.rows[0], 'Unit created', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const result = await db.query(`
      UPDATE units
      SET 
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `, [name ? name.trim() : null, code ? code.trim().toUpperCase() : null, description, isActive, id]);

    if (result.rows.length === 0) return sendError(res, 'Unit not found', 404);
    return sendSuccess(res, result.rows[0], 'Unit updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function deleteUnit(req, res) {
  try {
    const { id } = req.params;
    const prodCheck = await db.query('SELECT id FROM products WHERE unit_id = $1 LIMIT 1', [id]);
    if (prodCheck.rows.length > 0) {
      await db.query('UPDATE units SET is_active = false WHERE id = $1', [id]);
      return sendSuccess(res, null, 'Unit is used in products, marked Inactive.');
    }
    await db.query('DELETE FROM units WHERE id = $1', [id]);
    return sendSuccess(res, null, 'Unit deleted');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// ==========================================
// STORES / WAREHOUSES
// ==========================================
async function getStores(req, res) {
  try {
    const result = await db.query(`
      SELECT s.*, COUNT(DISTINCT u.id) as staff_count
      FROM stores s
      LEFT JOIN users u ON s.id = u.store_id
      GROUP BY s.id
      ORDER BY s.name ASC;
    `);
    return sendSuccess(res, result.rows);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function createStore(req, res) {
  try {
    const { code, name, address, city, state, pincode, contactPerson, phone, email } = req.body;
    if (!name) return sendError(res, 'Store name is required', 400);

    const storeCount = await db.query('SELECT COUNT(*) FROM stores');
    if (parseInt(storeCount.rows[0].count, 10) >= 1) {
      return sendError(res, 'Only one central warehouse/store is supported in the system. You can update the existing warehouse details.', 400);
    }

    let cleanPhone = null;
    if (phone) {
      cleanPhone = phone.trim().replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        return sendError(res, 'Phone number must be exactly 10 digits without any alphabets or special characters.', 400);
      }
    }

    const storeCode = code ? code.trim().toUpperCase() : 'STR-' + Date.now().toString().slice(-4);

    const result = await db.query(`
      INSERT INTO stores 
        (code, name, address, city, state, pincode, contact_person, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [
      storeCode,
      name.trim(),
      address || null,
      city || null,
      state || null,
      pincode || null,
      contactPerson || null,
      cleanPhone,
      email || null
    ]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'MASTERS',
      recordId: result.rows[0].id,
      newValues: { type: 'STORE', name },
      req
    });

    return sendSuccess(res, result.rows[0], 'Store created successfully', 201);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function updateStore(req, res) {
  try {
    const { id } = req.params;
    const { name, address, city, state, pincode, contactPerson, phone, email, isActive } = req.body;

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

    const result = await db.query(`
      UPDATE stores
      SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        pincode = COALESCE($5, pincode),
        contact_person = COALESCE($6, contact_person),
        phone = COALESCE($7, phone),
        email = COALESCE($8, email),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `, [name, address, city, state, pincode, contactPerson, cleanPhone !== undefined ? cleanPhone : null, email, isActive, id]);

    if (result.rows.length === 0) return sendError(res, 'Store not found', 404);
    return sendSuccess(res, result.rows[0], 'Store updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

async function deleteStore(req, res) {
  try {
    return sendError(res, 'The central warehouse/store cannot be deleted as the system requires exactly one central warehouse.', 400);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,

  getStores,
  createStore,
  updateStore,
  deleteStore
};

