const db = require('../config/db');
const { logAudit } = require('../services/auditService');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// List products with category/stock filters, search and pagination
async function getProducts(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : null;
    const status = req.query.status;
    const lowStock = req.query.lowStock === 'true';

    let whereClauses = [];
    let params = [];
    let paramIdx = 1;

    if (search) {
      whereClauses.push(`(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (categoryId) {
      whereClauses.push(`p.category_id = $${paramIdx}`);
      params.push(categoryId);
      paramIdx++;
    }

    if (status === 'active') {
      whereClauses.push(`p.is_active = true`);
    } else if (status === 'inactive') {
      whereClauses.push(`p.is_active = false`);
    }

    if (lowStock) {
      whereClauses.push(`p.stock_quantity <= p.min_stock_alert`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.query(`SELECT COUNT(*) FROM products p ${whereSql}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        p.id, p.sku, p.name, p.category_id, p.unit_id, p.tax_id,
        p.price, p.stock_quantity, p.min_stock_alert, p.description, p.image_url,
        p.is_active, p.created_at, p.updated_at,
        c.name AS category_name,
        u.name AS unit_name, u.code AS unit_code,
        t.name AS tax_name, t.rate AS tax_rate
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;
    params.push(limit, offset);

    const result = await db.query(dataSql, params);

    return sendSuccess(res, result.rows, 'Products retrieved successfully', 200, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('getProducts error:', error);
    return sendError(res, error.message, 500);
  }
}

// Get single product
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        p.*,
        c.name AS category_name,
        u.name AS unit_name, u.code AS unit_code,
        t.name AS tax_name, t.rate AS tax_rate
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN taxes t ON p.tax_id = t.id
      WHERE p.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return sendError(res, 'Product not found', 404);
    }

    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// Create Product
async function createProduct(req, res) {
  try {
    const {
      sku,
      name,
      categoryId,
      unitId,
      taxId,
      price,
      stockQuantity,
      minStockAlert,
      description,
      imageUrl
    } = req.body;

    if (!name || price === undefined) {
      return sendError(res, 'Product name and price are required.', 400);
    }

    // Auto-generate SKU if not provided
    let productSku = sku ? sku.trim().toUpperCase() : null;
    if (!productSku) {
      const countRes = await db.query('SELECT COUNT(*) FROM products');
      const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
      productSku = `PRD-${String(nextNum).padStart(4, '0')}`;
    }

    const checkSku = await db.query('SELECT id FROM products WHERE sku = $1', [productSku]);
    if (checkSku.rows.length > 0) {
      return sendError(res, `Product with SKU "${productSku}" already exists.`, 400);
    }

    const insertRes = await db.query(`
      INSERT INTO products
        (sku, name, category_id, unit_id, tax_id, price, stock_quantity, min_stock_alert, description, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `, [
      productSku,
      name.trim(),
      categoryId || null,
      unitId || null,
      taxId || null,
      parseFloat(price),
      parseInt(stockQuantity || 0, 10),
      parseInt(minStockAlert || 5, 10),
      description || null,
      imageUrl || null
    ]);

    const product = insertRes.rows[0];

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'CREATE',
      module: 'PRODUCTS',
      recordId: product.id,
      newValues: { sku: product.sku, name: product.name, price: product.price },
      req
    });

    return sendSuccess(res, product, 'Product created successfully', 201);
  } catch (error) {
    console.error('createProduct error:', error);
    return sendError(res, error.message, 500);
  }
}

// Update Product
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      categoryId,
      unitId,
      taxId,
      price,
      stockQuantity,
      minStockAlert,
      description,
      imageUrl,
      isActive
    } = req.body;

    const existingRes = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return sendError(res, 'Product not found', 404);
    }

    const oldProduct = existingRes.rows[0];

    const updateRes = await db.query(`
      UPDATE products
      SET 
        name = COALESCE($1, name),
        category_id = COALESCE($2, category_id),
        unit_id = COALESCE($3, unit_id),
        tax_id = COALESCE($4, tax_id),
        price = COALESCE($5, price),
        stock_quantity = COALESCE($6, stock_quantity),
        min_stock_alert = COALESCE($7, min_stock_alert),
        description = COALESCE($8, description),
        image_url = COALESCE($9, image_url),
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *;
    `, [
      name ? name.trim() : null,
      categoryId || null,
      unitId || null,
      taxId || null,
      price !== undefined ? parseFloat(price) : null,
      stockQuantity !== undefined ? parseInt(stockQuantity, 10) : null,
      minStockAlert !== undefined ? parseInt(minStockAlert, 10) : null,
      description !== undefined ? description : null,
      imageUrl !== undefined ? imageUrl : null,
      isActive !== undefined ? isActive : null,
      id
    ]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'UPDATE',
      module: 'PRODUCTS',
      recordId: id,
      oldValues: { name: oldProduct.name, price: oldProduct.price, stock: oldProduct.stock_quantity },
      newValues: { name, price, stockQuantity },
      req
    });

    return sendSuccess(res, updateRes.rows[0], 'Product updated successfully');
  } catch (error) {
    console.error('updateProduct error:', error);
    return sendError(res, error.message, 500);
  }
}

// Delete Product
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    // Check if product is in sales order items
    const orderItemCheck = await db.query('SELECT id FROM sales_order_items WHERE product_id = $1 LIMIT 1', [id]);
    if (orderItemCheck.rows.length > 0) {
      await db.query('UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return sendSuccess(res, null, 'Product exists in sales orders, so its status was marked as Inactive.');
    }

    await db.query('DELETE FROM products WHERE id = $1', [id]);

    await logAudit({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.roleName,
      action: 'DELETE',
      module: 'PRODUCTS',
      recordId: id,
      req
    });

    return sendSuccess(res, null, 'Product deleted successfully');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
