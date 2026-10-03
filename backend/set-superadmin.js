const bcrypt = require('bcryptjs');
const db = require('./src/config/db');

async function setSuperAdmin() {
  const hash = await bcrypt.hash('798214', 10);
  const result = await db.query(
    'UPDATE users SET role_id = 1, name = $1, password_hash = $2, email_verified = true, is_active = true, updated_at = CURRENT_TIMESTAMP WHERE email = $3 RETURNING id, name, email, role_id, is_active, email_verified',
    ['Mohit (Super Admin)', hash, 'mohitpoewal12@gmail.com']
  );
  console.log('Super Admin successfully updated:');
  console.log(result.rows[0]);
  process.exit(0);
}

setSuperAdmin().catch(err => {
  console.error('Error updating Super Admin:', err);
  process.exit(1);
});
