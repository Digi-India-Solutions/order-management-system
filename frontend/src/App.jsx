import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

// Main Application Pages
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { OrdersListPage } from './pages/orders/OrdersListPage';
import { CreateOrderPage } from './pages/orders/CreateOrderPage';
import { OrderDetailsPage } from './pages/orders/OrderDetailsPage';
import { PackagingPage } from './pages/packaging/PackagingPage';
import { CustomersPage } from './pages/masters/CustomersPage';
import { ProductsPage } from './pages/masters/ProductsPage';
import { CategoriesPage } from './pages/masters/CategoriesPage';
import { UnitsPage } from './pages/masters/UnitsPage';
import { StoresPage } from './pages/masters/StoresPage';
import { UsersListPage } from './pages/users/UsersListPage';
import { RolesPermissionsPage } from './pages/users/RolesPermissionsPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Enterprise Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Sales Order Module */}
              <Route
                path="orders"
                element={
                  <ProtectedRoute requiredPermission="orders.read">
                    <OrdersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders/create"
                element={
                  <ProtectedRoute requiredPermission="orders.create">
                    <CreateOrderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="orders/:id"
                element={
                  <ProtectedRoute requiredPermission="orders.read">
                    <OrderDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Dedicated Packaging Area */}
              <Route
                path="packaging"
                element={
                  <ProtectedRoute requiredPermission="packaging.read">
                    <PackagingPage />
                  </ProtectedRoute>
                }
              />

              {/* Master Section */}
              <Route
                path="masters/customers"
                element={
                  <ProtectedRoute requiredPermission="customers.read">
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="masters/products"
                element={
                  <ProtectedRoute requiredPermission="products.read">
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="masters/categories"
                element={
                  <ProtectedRoute requiredPermission="masters.manage">
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="masters/units"
                element={
                  <ProtectedRoute requiredPermission="masters.manage">
                    <UnitsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="masters/stores"
                element={
                  <ProtectedRoute requiredPermission="masters.manage">
                    <StoresPage />
                  </ProtectedRoute>
                }
              />

              {/* User & Role Management (Super Admin Exclusive) */}
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <UsersListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users/roles"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <RolesPermissionsPage />
                  </ProtectedRoute>
                }
              />

              {/* Reports (Operational Day-to-Day Analytics) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute requiredPermission="reports.read">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Audit Logs (Super Admin Exclusive) */}
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
