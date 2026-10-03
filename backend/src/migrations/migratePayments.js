const { pool } = require('../config/db');

async function migratePayments() {
  console.log('Running payment and editable price migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add columns to sales_orders
    await client.query(`
      ALTER TABLE sales_orders 
      ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50);
    `);

    // 2. Add original_price to sales_order_items
    await client.query(`
      ALTER TABLE sales_order_items 
      ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2);
    `);

    // 3. Create order_payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_payments (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES sales_orders(id) ON DELETE CASCADE,
        amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
        payment_mode VARCHAR(50) NOT NULL,
        payment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        received_by INT REFERENCES users(id) ON DELETE SET NULL,
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_order_payments_order ON order_payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_payments_date ON order_payments(payment_date);
    `);

    // 4. Update sales_order_items original_price if null
    await client.query(`
      UPDATE sales_order_items soi
      SET original_price = COALESCE(p.price, soi.unit_price)
      FROM products p
      WHERE soi.product_id = p.id AND soi.original_price IS NULL;

      UPDATE sales_order_items
      SET original_price = unit_price
      WHERE original_price IS NULL;
    `);

    // 5. Update existing orders paid_amount / pending_amount / payment_status
    // Harmonize payment_status to 'Paid', 'Partially Paid', 'Pending'
    await client.query(`
      UPDATE sales_orders
      SET 
        paid_amount = CASE 
          WHEN payment_status IN ('PAID', 'Paid') THEN grand_total
          WHEN payment_status IN ('PARTIAL', 'Partially Paid') THEN ROUND(grand_total / 2, 2)
          ELSE 0.00
        END,
        pending_amount = CASE
          WHEN payment_status IN ('PAID', 'Paid') THEN 0.00
          WHEN payment_status IN ('PARTIAL', 'Partially Paid') THEN (grand_total - ROUND(grand_total / 2, 2))
          ELSE grand_total
        END,
        payment_status = CASE
          WHEN payment_status IN ('PAID', 'Paid') THEN 'Paid'
          WHEN payment_status IN ('PARTIAL', 'Partially Paid') THEN 'Partially Paid'
          ELSE 'Pending'
        END,
        payment_mode = COALESCE(payment_mode, 'UPI')
      WHERE pending_amount = 0 AND paid_amount = 0 AND grand_total > 0;
    `);

    await client.query('COMMIT');
    console.log('Payment schema migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  migratePayments();
}

module.exports = migratePayments;
