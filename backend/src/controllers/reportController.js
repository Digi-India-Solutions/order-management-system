const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// 1. Sales Performance Report
async function getSalesReport(req, res) {
  try {
    const { startDate, endDate, customerId, salesPersonId } = req.query;

    let whereClauses = [];
    let params = [];
    let idx = 1;

    if (startDate) {
      whereClauses.push(`so.order_date >= $${idx}`);
      params.push(startDate);
      idx++;
    }

    if (endDate) {
      whereClauses.push(`so.order_date <= $${idx}`);
      params.push(endDate);
      idx++;
    }

    if (customerId) {
      whereClauses.push(`so.customer_id = $${idx}`);
      params.push(customerId);
      idx++;
    }

    if (salesPersonId) {
      whereClauses.push(`so.sales_person_id = $${idx}`);
      params.push(salesPersonId);
      idx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        so.id, so.order_number, so.order_date, so.order_status, so.payment_status,
        so.subtotal, so.discount_total, so.tax_total, so.grand_total,
        c.name as customer_name, c.customer_code,
        u.name as sales_person_name,
        s.name as store_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_person_id = u.id
      LEFT JOIN stores s ON so.store_id = s.id
      ${whereSql}
      ORDER BY so.order_date DESC, so.id DESC;
    `;

    const result = await db.query(query, params);

    // Aggregate totals
    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    result.rows.forEach(r => {
      totalRevenue += parseFloat(r.grand_total || 0);
      totalDiscount += parseFloat(r.discount_total || 0);
      totalTax += parseFloat(r.tax_total || 0);
    });

    return sendSuccess(res, {
      orders: result.rows,
      totals: {
        count: result.rows.length,
        totalRevenue,
        totalDiscount,
        totalTax,
        avgOrderValue: result.rows.length > 0 ? totalRevenue / result.rows.length : 0
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// 2. Inventory & Stock Status Report
async function getInventoryReport(req, res) {
  try {
    const query = `
      SELECT 
        p.id, p.sku, p.name, p.price, p.stock_quantity, p.min_stock_alert,
        c.name as category_name,
        u.code as unit_code,
        (p.price * p.stock_quantity) as total_valuation,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.min_stock_alert THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status,
        COALESCE(SUM(soi.quantity), 0) as total_units_ordered
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN sales_order_items soi ON p.id = soi.product_id
      GROUP BY p.id, c.name, u.code
      ORDER BY p.stock_quantity ASC;
    `;

    const result = await db.query(query);

    let totalValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    result.rows.forEach(r => {
      totalValuation += parseFloat(r.total_valuation || 0);
      if (r.stock_status === 'LOW_STOCK') lowStockCount++;
      if (r.stock_status === 'OUT_OF_STOCK') outOfStockCount++;
    });

    return sendSuccess(res, {
      inventory: result.rows,
      summary: {
        totalValuation,
        totalProducts: result.rows.length,
        lowStockCount,
        outOfStockCount
      }
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

// 3. Sales Team Performance Report
async function getTeamPerformanceReport(req, res) {
  try {
    const query = `
      SELECT 
        u.id, u.name, u.email, u.phone,
        COUNT(DISTINCT c.id) as assigned_customers,
        COUNT(DISTINCT so.id) as orders_count,
        COALESCE(SUM(so.grand_total), 0) as total_sales,
        COALESCE(AVG(so.grand_total), 0) as avg_order_value,
        COUNT(DISTINCT so.id) FILTER (WHERE UPPER(so.order_status) = 'DELIVERED') as completed_orders
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id AND r.name IN ('sales_person', 'sales_manager')
      LEFT JOIN customers c ON u.id = c.assigned_sales_person_id
      LEFT JOIN sales_orders so ON u.id = so.sales_person_id
      GROUP BY u.id, u.name, u.email, u.phone
      ORDER BY total_sales DESC;
    `;

    const result = await db.query(query);
    return sendSuccess(res, result.rows);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getSalesReport,
  getInventoryReport,
  getTeamPerformanceReport
};
