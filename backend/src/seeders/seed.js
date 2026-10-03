const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  const client = await pool.connect();
  console.log('--- Starting OMS Database Seeding ---');

  try {
    await client.query('BEGIN');

    // 1. Roles
    const rolesData = [
      { name: 'super_admin', display_name: 'Super Admin', description: 'Full access to the entire system and configurations' },
      { name: 'admin', display_name: 'Admin', description: 'Administrative access to manage operations, masters, and users' },
      { name: 'sales_manager', display_name: 'Sales Manager', description: 'Manages sales team, orders, assignments and performance' },
      { name: 'sales_person', display_name: 'Sales Person', description: 'Creates orders, manages assigned clients and tracks order progress' },
      { name: 'store_manager', display_name: 'Store Manager', description: 'Manages warehouse fulfillment, packaging workflows and stock' }
    ];

    const roleMap = {};
    for (const r of rolesData) {
      const res = await client.query(`
        INSERT INTO roles (name, display_name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name, description = EXCLUDED.description
        RETURNING id, name;
      `, [r.name, r.display_name, r.description]);
      roleMap[res.rows[0].name] = res.rows[0].id;
    }
    console.log('Roles seeded:', Object.keys(roleMap));

    // 2. Permissions
    const permissionsData = [
      // Users
      { code: 'users.create', module: 'USERS', description: 'Create new users' },
      { code: 'users.read', module: 'USERS', description: 'View users list and profiles' },
      { code: 'users.update', module: 'USERS', description: 'Edit existing users' },
      { code: 'users.delete', module: 'USERS', description: 'Deactivate or delete users' },
      { code: 'roles.manage', module: 'ROLES', description: 'Manage roles and role permissions' },

      // Customers
      { code: 'customers.create', module: 'CUSTOMERS', description: 'Create customers' },
      { code: 'customers.read', module: 'CUSTOMERS', description: 'View customer directory' },
      { code: 'customers.update', module: 'CUSTOMERS', description: 'Update customer details' },
      { code: 'customers.delete', module: 'CUSTOMERS', description: 'Delete customers' },

      // Products & Masters
      { code: 'products.create', module: 'PRODUCTS', description: 'Add new products' },
      { code: 'products.read', module: 'PRODUCTS', description: 'View product catalog' },
      { code: 'products.update', module: 'PRODUCTS', description: 'Update product specifications' },
      { code: 'products.delete', module: 'PRODUCTS', description: 'Delete products' },
      { code: 'masters.manage', module: 'MASTERS', description: 'Manage Categories, Units, Stores and Taxes' },

      // Orders
      { code: 'orders.create', module: 'ORDERS', description: 'Create new sales orders' },
      { code: 'orders.read', module: 'ORDERS', description: 'View assigned or own sales orders' },
      { code: 'orders.read_all', module: 'ORDERS', description: 'View all system sales orders' },
      { code: 'orders.update', module: 'ORDERS', description: 'Update sales orders' },
      { code: 'orders.delete', module: 'ORDERS', description: 'Cancel or delete orders' },
      { code: 'orders.assign', module: 'ORDERS', description: 'Assign orders to sales persons' },

      // Packaging
      { code: 'packaging.read', module: 'PACKAGING', description: 'View packaging area and orders' },
      { code: 'packaging.update', module: 'PACKAGING', description: 'Process packages and update packing status' },

      // Reports & Audit
      { code: 'reports.read', module: 'REPORTS', description: 'View sales, performance and store reports' },
      { code: 'audit.read', module: 'AUDIT', description: 'View security and system audit logs' }
    ];

    const permMap = {};
    for (const p of permissionsData) {
      const res = await client.query(`
        INSERT INTO permissions (code, module, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (code) DO UPDATE SET module = EXCLUDED.module, description = EXCLUDED.description
        RETURNING id, code;
      `, [p.code, p.module, p.description]);
      permMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log(`Permissions seeded (${Object.keys(permMap).length} total)`);

    // 3. Assign Role Permissions
    // Super Admin: gets all permissions
    for (const code of Object.keys(permMap)) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [roleMap.super_admin, permMap[code]]);
    }

    // Admin (Operations & Day-to-Day Activity Manager)
    const adminPerms = [
      'customers.create', 'customers.read', 'customers.update', 'customers.delete',
      'products.create', 'products.read', 'products.update', 'products.delete',
      'masters.manage',
      'orders.create', 'orders.read', 'orders.read_all', 'orders.update', 'orders.delete', 'orders.assign',
      'packaging.read', 'packaging.update',
      'reports.read'
    ];
    for (const code of adminPerms) {
      if (permMap[code]) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleMap.admin, permMap[code]]);
      }
    }

    // Sales Manager
    const smPerms = [
      'customers.create', 'customers.read', 'customers.update',
      'products.read',
      'orders.create', 'orders.read', 'orders.read_all', 'orders.update', 'orders.assign',
      'reports.read'
    ];
    for (const code of smPerms) {
      if (permMap[code]) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleMap.sales_manager, permMap[code]]);
      }
    }

    // Sales Person
    const spPerms = [
      'customers.create', 'customers.read',
      'products.read',
      'orders.create', 'orders.read', 'orders.update'
    ];
    for (const code of spPerms) {
      if (permMap[code]) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleMap.sales_person, permMap[code]]);
      }
    }

    // Store Manager
    const storePerms = [
      'products.create', 'products.read', 'products.update',
      'orders.read', 'orders.read_all',
      'packaging.read', 'packaging.update',
      'reports.read'
    ];
    for (const code of storePerms) {
      if (permMap[code]) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [roleMap.store_manager, permMap[code]]);
      }
    }

    // 4. Stores / Warehouses
    const storesData = [
      { code: 'WH-MUM', name: 'Central Warehouse Mumbai', address: 'Plot 42, MIDC Industrial Area', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', contact: 'Rajesh Sharma', phone: '+91 98200 11223', email: 'mumbai.wh@oms.com' },
      { code: 'WH-DEL', name: 'North Hub Delhi NCR', address: 'Sector 62, Logistics Park', city: 'Noida', state: 'Uttar Pradesh', pincode: '201309', contact: 'Amit Verma', phone: '+91 98110 33445', email: 'delhi.wh@oms.com' },
      { code: 'WH-BLR', name: 'South Fulfillment Bangalore', address: 'Electronic City Phase 2', city: 'Bangalore', state: 'Karnataka', pincode: '560100', contact: 'Karthik Rao', phone: '+91 98450 55667', email: 'blr.wh@oms.com' }
    ];

    const storeMap = {};
    for (const s of storesData) {
      const res = await client.query(`
        INSERT INTO stores (code, name, address, city, state, pincode, contact_person, phone, email)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, code;
      `, [s.code, s.name, s.address, s.city, s.state, s.pincode, s.contact, s.phone, s.email]);
      storeMap[res.rows[0].code] = res.rows[0].id;
    }
    console.log('Stores seeded');

    // 5. Default Users (Password: Admin@123)
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('Admin@123', salt);

    const usersData = [
      { name: 'Mohit Super Admin', email: 'superadmin@oms.com', phone: '+91 98000 00001', role: 'super_admin', store: null },
      { name: 'Anita Desai (Admin)', email: 'admin@oms.com', phone: '+91 98000 00002', role: 'admin', store: null },
      { name: 'Vikram Mehta (Sales Mgr)', email: 'salesmanager@oms.com', phone: '+91 98000 00003', role: 'sales_manager', store: null },
      { name: 'Rohan Gupta (Sales Person)', email: 'salesperson@oms.com', phone: '+91 98000 00004', role: 'sales_person', store: null },
      { name: 'Pooja Nair (Store Mgr)', email: 'storemanager@oms.com', phone: '+91 98000 00005', role: 'store_manager', store: storeMap['WH-MUM'] }
    ];

    const userMap = {};
    for (const u of usersData) {
      const res = await client.query(`
        INSERT INTO users (name, email, phone, password_hash, role_id, store_id, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true, true)
        ON CONFLICT (email) DO UPDATE SET role_id = EXCLUDED.role_id, email_verified = true, is_active = true
        RETURNING id, email;
      `, [u.name, u.email, u.phone, defaultPasswordHash, roleMap[u.role], u.store]);
      userMap[res.rows[0].email] = res.rows[0].id;
    }
    console.log('Default users seeded with Admin@123');

    // 6. Categories
    const categoriesData = [
      { name: 'Industrial Hardware', code: 'CAT-IND', description: 'Fasteners, valves, and precision parts' },
      { name: 'Electronics & Sensors', code: 'CAT-ELEC', description: 'Sensors, microcontrollers, and displays' },
      { name: 'Packaging Materials', code: 'CAT-PKG', description: 'Corrugated boxes, tapes, and cushioning' },
      { name: 'Safety Equipment', code: 'CAT-SAFE', description: 'PPE kits, safety helmets, and gloves' }
    ];
    const catMap = {};
    for (const c of categoriesData) {
      const res = await client.query(`
        INSERT INTO categories (name, code, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
        RETURNING id, code;
      `, [c.name, c.code, c.description]);
      catMap[res.rows[0].code] = res.rows[0].id;
    }

    // 7. Units
    const unitsData = [
      { name: 'Pieces', code: 'PCS', description: 'Single unit piece' },
      { name: 'Box', code: 'BOX', description: 'Box package containing multiple units' },
      { name: 'Kilogram', code: 'KG', description: 'Weight in kilograms' },
      { name: 'Meter', code: 'MTR', description: 'Length in meters' },
      { name: 'Set', code: 'SET', description: 'Assembled kit / set' }
    ];
    const unitMap = {};
    for (const un of unitsData) {
      const res = await client.query(`
        INSERT INTO units (name, code, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
        RETURNING id, code;
      `, [un.name, un.code, un.description]);
      unitMap[res.rows[0].code] = res.rows[0].id;
    }

    // 8. Taxes
    const taxesData = [
      { name: 'GST 0%', rate: 0.00, description: 'Exempt items' },
      { name: 'GST 5%', rate: 5.00, description: 'Basic goods' },
      { name: 'GST 12%', rate: 12.00, description: 'Standard rate lower tier' },
      { name: 'GST 18%', rate: 18.00, description: 'Standard GST rate' },
      { name: 'GST 28%', rate: 28.00, description: 'Luxury and specialized machinery' }
    ];
    const taxMap = {};
    for (const t of taxesData) {
      const res = await client.query(`
        INSERT INTO taxes (name, rate, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO UPDATE SET rate = EXCLUDED.rate
        RETURNING id, name;
      `, [t.name, t.rate, t.description]);
      taxMap[res.rows[0].name] = res.rows[0].id;
    }

    // 9. Products
    const productsData = [
      { sku: 'PRD-IND-01', name: 'Precision Ball Bearing 6205-2RS', cat: 'CAT-IND', unit: 'PCS', tax: 'GST 18%', price: 450.00, stock: 250, min: 20 },
      { sku: 'PRD-IND-02', name: 'Stainless Steel Flange Valve 2"', cat: 'CAT-IND', unit: 'PCS', tax: 'GST 18%', price: 1850.00, stock: 45, min: 10 },
      { sku: 'PRD-ELEC-01', name: 'Digital Temperature & Humidity Sensor probe', cat: 'CAT-ELEC', unit: 'PCS', tax: 'GST 18%', price: 1200.00, stock: 120, min: 15 },
      { sku: 'PRD-ELEC-02', name: 'Opto-Isolated 8-Channel Relay Module', cat: 'CAT-ELEC', unit: 'PCS', tax: 'GST 18%', price: 850.00, stock: 80, min: 10 },
      { sku: 'PRD-PKG-01', name: 'Heavy Duty 5-Ply Corrugated Box (Pack of 50)', cat: 'CAT-PKG', unit: 'BOX', tax: 'GST 12%', price: 1500.00, stock: 95, min: 20 },
      { sku: 'PRD-PKG-02', name: 'Reinforced Self-Adhesive Packing Tape 50m', cat: 'CAT-PKG', unit: 'PCS', tax: 'GST 18%', price: 180.00, stock: 400, min: 50 },
      { sku: 'PRD-SAFE-01', name: 'Industrial Hard Hat Helmet with Visor', cat: 'CAT-SAFE', unit: 'PCS', tax: 'GST 12%', price: 620.00, stock: 150, min: 25 },
      { sku: 'PRD-SAFE-02', name: 'High-Grip Nitrile Protective Gloves (Pair)', cat: 'CAT-SAFE', unit: 'PCS', tax: 'GST 5%', price: 140.00, stock: 500, min: 80 }
    ];
    const productMap = {};
    for (const pr of productsData) {
      const res = await client.query(`
        INSERT INTO products (sku, name, category_id, unit_id, tax_id, price, stock_quantity, min_stock_alert)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, stock_quantity = EXCLUDED.stock_quantity
        RETURNING id, sku, price;
      `, [pr.sku, pr.name, catMap[pr.cat], unitMap[pr.unit], taxMap[pr.tax], pr.price, pr.stock, pr.min]);
      productMap[res.rows[0].sku] = res.rows[0];
    }

    // 10. Customers
    const customersData = [
      { code: 'CUST-001', name: 'Apex Automation Ltd', company: 'Apex Group', email: 'procurement@apexauto.in', phone: '+91 99881 12233', gstin: '27AAACA1234A1Z5', city: 'Pune', state: 'Maharashtra', pincode: '411014' },
      { code: 'CUST-002', name: 'NexGen Robotics India', company: 'NexGen Tech', email: 'orders@nexgenrobotics.com', phone: '+91 98772 23344', gstin: '29AAACN5678B1Z2', city: 'Bangalore', state: 'Karnataka', pincode: '560068' },
      { code: 'CUST-003', name: 'Vanguard Engineering Works', company: 'Vanguard Corp', email: 'supply@vanguardeng.in', phone: '+91 97663 34455', gstin: '07AAACV9012C1Z8', city: 'Gurgaon', state: 'Haryana', pincode: '122001' },
      { code: 'CUST-004', name: 'Zenith Logistics & Fleet', company: 'Zenith Express', email: 'admin@zenithlog.com', phone: '+91 96554 45566', gstin: '24AAACZ3456D1Z1', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' }
    ];
    const customerMap = {};
    for (const cu of customersData) {
      const res = await client.query(`
        INSERT INTO customers (customer_code, name, company_name, email, phone, gstin, city, state, pincode, assigned_sales_person_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (customer_code) DO UPDATE SET phone = EXCLUDED.phone
        RETURNING id, customer_code;
      `, [cu.code, cu.name, cu.company, cu.email, cu.phone, cu.gstin, cu.city, cu.state, cu.pincode, userMap['salesperson@oms.com']]);
      customerMap[res.rows[0].customer_code] = res.rows[0].id;
    }

    // 11. Initial Sample Sales Orders
    const ordersSeed = [
      {
        order_number: 'SO-2026-0001',
        customer_id: customerMap['CUST-001'],
        sales_person_id: userMap['salesperson@oms.com'],
        store_id: storeMap['WH-MUM'],
        subtotal: 13500.00,
        discount_total: 500.00,
        tax_total: 2340.00,
        grand_total: 15340.00,
        payment_status: 'PAID',
        order_status: 'PACKAGING',
        delivery_address: 'Plot 18, Hinjewadi Phase 1, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411057',
        remarks: 'Priority dispatch for manufacturing line setup'
      },
      {
        order_number: 'SO-2026-0002',
        customer_id: customerMap['CUST-002'],
        sales_person_id: userMap['salesperson@oms.com'],
        store_id: storeMap['WH-BLR'],
        subtotal: 24500.00,
        discount_total: 1000.00,
        tax_total: 4230.00,
        grand_total: 27730.00,
        payment_status: 'PARTIAL',
        order_status: 'CONFIRMED',
        delivery_address: '7th Floor, Block B, Outer Ring Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560103',
        remarks: 'Delivery scheduled before Friday'
      },
      {
        order_number: 'SO-2026-0003',
        customer_id: customerMap['CUST-003'],
        sales_person_id: userMap['salesmanager@oms.com'],
        store_id: storeMap['WH-DEL'],
        subtotal: 37000.00,
        discount_total: 2000.00,
        tax_total: 6300.00,
        grand_total: 41300.00,
        payment_status: 'PAID',
        order_status: 'PACKED',
        delivery_address: 'Industrial Plot 99, Udyog Vihar Phase 4',
        city: 'Gurgaon',
        state: 'Haryana',
        pincode: '122015',
        remarks: 'Handle with care: optical sensors included'
      },
      {
        order_number: 'SO-2026-0004',
        customer_id: customerMap['CUST-004'],
        sales_person_id: userMap['salesperson@oms.com'],
        store_id: storeMap['WH-MUM'],
        subtotal: 9200.00,
        discount_total: 200.00,
        tax_total: 1620.00,
        grand_total: 10620.00,
        payment_status: 'UNPAID',
        order_status: 'PENDING',
        delivery_address: 'GIDC Industrial Estate, Odhav',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '382415',
        remarks: 'Awaiting PO confirmation copy'
      }
    ];

    for (const o of ordersSeed) {
      const orderRes = await client.query(`
        INSERT INTO sales_orders 
          (order_number, customer_id, sales_person_id, store_id, subtotal, discount_total, tax_total, grand_total, payment_status, order_status, delivery_address, city, state, pincode, remarks, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (order_number) DO NOTHING
        RETURNING id, order_number, order_status, store_id;
      `, [
        o.order_number, o.customer_id, o.sales_person_id, o.store_id, o.subtotal, o.discount_total,
        o.tax_total, o.grand_total, o.payment_status, o.order_status, o.delivery_address,
        o.city, o.state, o.pincode, o.remarks, userMap['salesperson@oms.com']
      ]);

      if (orderRes.rows.length > 0) {
        const orderId = orderRes.rows[0].id;
        const status = orderRes.rows[0].order_status;

        // Insert items
        await client.query(`
          INSERT INTO sales_order_items (order_id, product_id, quantity, unit_price, discount_percent, discount_amount, tax_rate, tax_amount, line_total)
          VALUES 
            ($1, $2, 10, 450.00, 5.0, 225.00, 18.0, 769.50, 5044.50),
            ($1, $3, 4, 1850.00, 0.0, 0.00, 18.0, 1332.00, 8732.00)
        `, [orderId, productMap['PRD-IND-01'].id, productMap['PRD-IND-02'].id]);

        // Insert history
        await client.query(`
          INSERT INTO order_status_history (order_id, previous_status, new_status, changed_by, remarks)
          VALUES ($1, 'DRAFT', $2, $3, 'Initial order processing')
        `, [orderId, status, userMap['superadmin@oms.com']]);

        // If packaging stage or packed
        if (status === 'PACKAGING' || status === 'PACKED') {
          const packStatus = status === 'PACKED' ? 'PACKED' : 'PACKAGING_STARTED';
          await client.query(`
            INSERT INTO packaging 
              (order_id, store_id, packaging_status, assigned_to, package_count, weight_kg, dimensions, packaging_material, quality_checked, quality_checker_name, remarks)
            VALUES ($1, $2, $3, $4, 2, 8.50, '40x30x25 cm', 'Bubble wrap & Corrugated Carton', true, 'Inspector Ramesh', 'Packaging verified and sealed')
            ON CONFLICT (order_id) DO NOTHING;
          `, [orderId, o.store_id, packStatus, userMap['storemanager@oms.com']]);
        }
      }
    }

    // 12. Initial Audit Logs
    await client.query(`
      INSERT INTO audit_logs (user_id, user_name, role, action, module, record_id, new_values)
      VALUES 
        ($1, 'System Seeder', 'SYSTEM', 'SYSTEM_INITIALIZE', 'SYSTEM', '1', '{"message": "Database successfully seeded with default enterprise configuration"}'),
        ($2, 'Mohit Super Admin', 'super_admin', 'CREATE', 'ORDERS', 'SO-2026-0001', '{"order_number": "SO-2026-0001", "grand_total": 15340.00}')
    `, [userMap['superadmin@oms.com'], userMap['superadmin@oms.com']]);

    await client.query('COMMIT');
    console.log('✅ OMS Database seeding successfully completed!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
