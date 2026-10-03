# Production-Ready Order Management System (OMS)

A full-stack, enterprise-grade Order Management System built with PostgreSQL, Express.js, React.js (Vite), and Node.js with strict Role-Based Access Control (RBAC), Nodemailer OTP email verification, and dedicated store packaging workflows.

---

## 🚀 Live Services

- **Frontend Application (Vite + React + Tailwind CSS)**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend REST API (Node.js + Express.js)**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 👥 Pre-Seeded User Accounts & Roles

All seeded accounts use password: `Admin@123`

| Role | Email | Password | Permissions & Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@oms.com` | `Admin@123` | Full system access, RBAC permission matrix configuration, all masters, all orders, user management. |
| **Admin** | `admin@oms.com` | `Admin@123` | Operational administrative access, manage users, masters, orders, packaging. (Cannot modify Super Admin) |
| **Sales Manager** | `salesmanager@oms.com` | `Admin@123` | Team performance reports, assign orders to sales reps, view all sales orders. |
| **Sales Person** | `salesperson@oms.com` | `Admin@123` | Create sales orders, view assigned customers and own orders. |
| **Store Manager** | `storemanager@oms.com` | `Admin@123` | Dedicated Packaging Area, manage fulfillment stages, package dimensions, weights, quality signoffs. |

*Quick test credential buttons are provided on the Login page for one-click access.*

---

## 🔒 Authentication & Strict Email Validation Flow

1. **Email Validation**:
   - RFC 5322 compliance check rejecting consecutive dots (`test..test@gmail.com`), missing TLDs (`abc@`, `abc@domain`), and invalid characters.
2. **Secure OTP Verification**:
   - Cryptographically random 6-digit OTP generated.
   - Hashed using `bcrypt` before storage in PostgreSQL (`email_verification_otps`).
   - 5-minute expiry with attempt tracking (max 5 attempts).
   - Real email dispatched using **Nodemailer** with prominent console logs for development visibility.
   - Account activation (`email_verified = true`) strictly locked until OTP verification succeeds.
3. **Session & Security**:
   - JWT tokens signed with expiration.
   - Rate limiting on authentication and OTP endpoints (`express-rate-limit`).
   - Helmet security headers and parameterized SQL queries preventing SQL injection.

---

## 📦 Key System Modules

### 1. Dashboard
- Role-specific KPI metrics: Total Orders, Total Revenue, Pending Orders, Confirmed, Packaging, Packed, Delivered, Cancelled.
- Pure responsive SVG bar chart visualizing monthly sales trend across the last 6 months.
- Pipeline status breakdown and Sales Team Leaderboard.

### 2. Master Section
- **Customers Master**: Code (`CUST-XXXX`), billing/shipping addresses, GSTIN, contact details, assigned sales rep.
- **Product Master**: SKU, name, category, tax slab, unit of measure, base price, real-time stock levels, low-stock threshold alerts.
- **Category Master**: Hierarchical product categories.
- **Unit Master (UOM)**: Pieces (PCS), Kilograms (KG), Boxes (BOX), Meters (MTR), Liters (LTR).
- **Warehouse / Store Master**: Physical fulfillment centers with contact person and staff assignments.
- **Tax Master**: GST tax slabs (0%, 5%, 12%, 18%, 28%).

### 3. Sales Order Module
- Auto-generated sequential order numbering (`SO-YYYY-XXXX`).
- Multi-line dynamic product selector with live calculations (Quantity × Unit Price - Discount + GST = Line Total).
- Real-time invoice summary calculation.
- Lifecycle history timeline tracking every status change, author, and timestamp.
- Full printable invoice view (`window.print()`).

### 4. Dedicated Packaging Area
- Dedicated store fulfillment queue for Store Managers:
  $$\text{Pending Pick} \rightarrow \text{Packaging Started} \rightarrow \text{Quality Check} \rightarrow \text{Packed} \rightarrow \text{Ready for Dispatch}$$
- Package tracking details: box count, weight (kg), dimensions, packaging materials, courier partner, tracking/consignment number, quality inspection signoff.
- Automatic synchronization with parent sales order status.

### 5. Role-Based Access Control (RBAC)
- Enforced on **both** backend Express middleware (`requireRole`, `requirePermission`) and frontend React navigation & route guards (`ProtectedRoute`, dynamic sidebar rendering).
- Super Admin interactive permission matrix to toggle granular permissions per role.

### 6. Executive Reports & Audit Trail
- **Sales Report**: Filterable by date range, customer, and sales representative with **CSV export**.
- **Inventory & Valuation Report**: Total inventory valuation, low stock warnings, out-of-stock items.
- **Sales Team Performance**: Ranking leaderboard, average order size, closed orders count.
- **Security Audit Logs**: Immutable activity log capturing user, action, module, record ID, IP address, and JSON before/after snapshots.

---

## 🛠️ Tech Stack Architecture

- **Frontend**: React 18, Vite 6, Tailwind CSS, Lucide Icons, Fetch API Client.
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`), Nodemailer, JWT (`jsonwebtoken`), bcryptjs.
- **Database**: PostgreSQL 18 (`oms_db`).
