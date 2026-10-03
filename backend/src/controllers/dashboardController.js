const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/apiResponse');

async function getDashboardStats(req, res) {
  try {
    const userRole = req.user.roleName;
    const userId = req.user.id;
    const storeId = req.user.storeId;

    let baseOrderWhere = '';
    let params = [];

    if (userRole === 'sales_person') {
      baseOrderWhere = 'WHERE so.sales_person_id = $1';
      params.push(userId);
    } else if (userRole === 'store_manager' && storeId) {
      baseOrderWhere = 'WHERE (so.store_id = $1 OR so.store_id IS NULL)';
      params.push(storeId);
    }

    // 1. Order Status Counts & Total Sales
    const statusCountsSql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(so.grand_total), 0) as total_sales,
        COUNT(*) FILTER (WHERE so.order_status = 'PENDING') as pending_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'CONFIRMED') as confirmed_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'PROCESSING') as processing_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'PACKAGING') as packaging_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'PACKED') as packed_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'DISPATCHED') as dispatched_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'DELIVERED') as delivered_orders,
        COUNT(*) FILTER (WHERE so.order_status = 'CANCELLED') as cancelled_orders
      FROM sales_orders so
      ${baseOrderWhere};
    `;
    const statusCountsRes = await db.query(statusCountsSql, params);
    const summary = statusCountsRes.rows[0];

    // 2. Total Customers & Total Products
    let customerCount = 0;
    if (userRole === 'sales_person') {
      const custRes = await db.query('SELECT COUNT(*) FROM customers WHERE assigned_sales_person_id = $1', [userId]);
      customerCount = parseInt(custRes.rows[0].count, 10);
    } else {
      const custRes = await db.query('SELECT COUNT(*) FROM customers WHERE is_active = true');
      customerCount = parseInt(custRes.rows[0].count, 10);
    }

    const prodCountRes = await db.query('SELECT COUNT(*) FROM products WHERE is_active = true');
    const totalProducts = parseInt(prodCountRes.rows[0].count, 10);

    // Low stock count
    const lowStockRes = await db.query('SELECT COUNT(*) FROM products WHERE stock_quantity <= min_stock_alert AND is_active = true');
    const lowStockCount = parseInt(lowStockRes.rows[0].count, 10);

    // 3. Monthly Sales (Last 6 months)
    let monthlySalesSql = `
      SELECT 
        TO_CHAR(so.order_date, 'Mon YYYY') as month,
        DATE_TRUNC('month', so.order_date) as month_date,
        COUNT(so.id) as orders_count,
        COALESCE(SUM(so.grand_total), 0) as total_revenue
      FROM sales_orders so
      ${baseOrderWhere ? baseOrderWhere + ' AND' : 'WHERE'} so.order_date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY month, month_date
      ORDER BY month_date ASC;
    `;
    const monthlyRes = await db.query(monthlySalesSql, params);

    // 4. Orders By Status Chart Data
    const ordersByStatus = [
      { name: 'Pending', count: parseInt(summary.pending_orders, 10), color: '#F59E0B' },
      { name: 'Confirmed', count: parseInt(summary.confirmed_orders, 10), color: '#3B82F6' },
      { name: 'Processing', count: parseInt(summary.processing_orders, 10), color: '#8B5CF6' },
      { name: 'Packaging', count: parseInt(summary.packaging_orders, 10), color: '#EC4899' },
      { name: 'Packed', count: parseInt(summary.packed_orders, 10), color: '#10B981' },
      { name: 'Dispatched', count: parseInt(summary.dispatched_orders, 10), color: '#06B6D4' },
      { name: 'Delivered', count: parseInt(summary.delivered_orders, 10), color: '#059669' },
      { name: 'Cancelled', count: parseInt(summary.cancelled_orders, 10), color: '#EF4444' }
    ];

    // 5. Recent Orders (Top 5)
    let recentOrdersSql = `
      SELECT 
        so.id, so.order_number, so.order_date, so.grand_total, so.order_status, so.payment_status,
        c.name as customer_name,
        u.name as sales_person_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN users u ON so.sales_person_id = u.id
      ${baseOrderWhere}
      ORDER BY so.id DESC
      LIMIT 5;
    `;
    const recentOrdersRes = await db.query(recentOrdersSql, params);

    // 6. Sales Team Leaderboard (For Super Admin, Admin, Sales Manager)
    let salesTeamLeaderboard = [];
    if (['super_admin', 'admin', 'sales_manager'].includes(userRole)) {
      const teamSql = `
        SELECT 
          u.id, u.name, u.email,
          COUNT(so.id) as orders_count,
          COALESCE(SUM(so.grand_total), 0) as total_sales
        FROM users u
        INNER JOIN roles r ON u.role_id = r.id AND r.name IN ('sales_person', 'sales_manager')
        LEFT JOIN sales_orders so ON u.id = so.sales_person_id
        GROUP BY u.id, u.name, u.email
        ORDER BY total_sales DESC
        LIMIT 5;
      `;
      const teamRes = await db.query(teamSql);
      salesTeamLeaderboard = teamRes.rows;
    }

    // 7. Store / Packaging status summary (For Store Manager, Super Admin, Admin)
    let packagingSummary = null;
    if (['store_manager', 'super_admin', 'admin'].includes(userRole)) {
      const pkgSql = `
        SELECT 
          COUNT(*) FILTER (WHERE packaging_status = 'WAITING_FOR_PACKAGING') as waiting,
          COUNT(*) FILTER (WHERE packaging_status = 'PACKAGING_STARTED') as in_progress,
          COUNT(*) FILTER (WHERE packaging_status = 'QUALITY_CHECK') as quality_check,
          COUNT(*) FILTER (WHERE packaging_status = 'PACKED') as packed,
          COUNT(*) FILTER (WHERE packaging_status = 'READY_FOR_DISPATCH') as ready_for_dispatch
        FROM packaging;
      `;
      const pkgRes = await db.query(pkgSql);
      packagingSummary = pkgRes.rows[0];
    }

    // 8. Pending User Approvals (Only for Super Admin)
    let pendingApprovals = [];
    let pendingApprovalsCount = 0;
    if (userRole === 'super_admin') {
      const pendingUsersRes = await db.query(`
        SELECT 
          u.id, u.name, u.email, u.phone, u.created_at, u.approval_status, u.email_verified,
          r.name AS role_name, r.display_name AS role_display_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.approval_status = 'PENDING'
        ORDER BY u.id DESC
        LIMIT 10;
      `);
      pendingApprovals = pendingUsersRes.rows;

      const countPendingRes = await db.query(`SELECT COUNT(*) FROM users WHERE approval_status = 'PENDING'`);
      pendingApprovalsCount = parseInt(countPendingRes.rows[0].count, 10);
    }

    return sendSuccess(res, {
      role: userRole,
      summary: {
        totalOrders: parseInt(summary.total_orders, 10),
        totalSales: parseFloat(summary.total_sales),
        totalCustomers: customerCount,
        totalProducts,
        lowStockCount,
        pendingApprovalsCount,
        pendingOrders: parseInt(summary.pending_orders, 10),
        confirmedOrders: parseInt(summary.confirmed_orders, 10),
        processingOrders: parseInt(summary.processing_orders, 10),
        packagingOrders: parseInt(summary.packaging_orders, 10),
        packedOrders: parseInt(summary.packed_orders, 10),
        dispatchedOrders: parseInt(summary.dispatched_orders, 10),
        deliveredOrders: parseInt(summary.delivered_orders, 10),
        cancelledOrders: parseInt(summary.cancelled_orders, 10)
      },
      ordersByStatus,
      monthlySales: monthlyRes.rows,
      recentOrders: recentOrdersRes.rows,
      salesTeamLeaderboard,
      packagingSummary,
      pendingApprovals,
      pendingApprovalsCount
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return sendError(res, error.message, 500);
  }
}

module.exports = {
  getDashboardStats
};
