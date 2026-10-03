import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  Ruler,
  Warehouse,
  ShoppingCart,
  Boxes,
  BarChart3,
  UserCheck,
  ShieldCheck,
  History,
  X,
  PlusCircle,
  ChevronDown
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }) {
  const { hasPermission, hasRole } = useAuth();
  const [openSections, setOpenSections] = useState({
    orders: true,
    masters: true,
    access: true
  });

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${
      isActive
        ? 'bg-brand-50 text-brand-600 font-bold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
    }`;

  // Permissions checks
  const canSeeMasters = hasPermission('masters.manage') || hasPermission('customers.read') || hasPermission('products.read');
  const canSeeSales = hasPermission('orders.read') || hasPermission('orders.create');
  const canSeePackaging = hasPermission('packaging.read');
  const canSeeReports = hasPermission('reports.read');
  const canSeeUserManagement = hasRole('super_admin');
  const canSeeAudit = hasRole('super_admin');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container matching screenshot */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 shadow-2xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200/90">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              OM
            </div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              OrderFlow <span className="text-brand-600">OMS</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {/* Main Dashboard item */}
          <div>
            <NavLink to="/dashboard" onClick={onClose} className={navLinkClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
          </div>

          {/* Orders & Sales Section */}
          {canSeeSales && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Orders & Sales
              </div>
              <div className="mt-1 space-y-0.5">
                <NavLink to="/orders" onClick={onClose} className={navLinkClass}>
                  <ShoppingCart className="w-4 h-4" />
                  <span>Sales Orders</span>
                </NavLink>

                {hasPermission('orders.create') && (
                  <NavLink to="/orders/create" onClick={onClose} className={navLinkClass}>
                    <PlusCircle className="w-4 h-4 text-brand-600" />
                    <span>Create Order</span>
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* Fulfillment Section */}
          {canSeePackaging && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Fulfillment & Dispatch
              </div>
              <div className="mt-1 space-y-0.5">
                <NavLink to="/packaging" onClick={onClose} className={navLinkClass}>
                  <Boxes className="w-4 h-4 text-purple-600" />
                  <span>Packaging Area</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Masters Section */}
          {canSeeMasters && (
            <div>
              <button
                onClick={() => toggleSection('masters')}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition"
              >
                <span>Stores & Masters</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openSections.masters ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openSections.masters && (
                <div className="mt-1 space-y-0.5">
                  {hasPermission('customers.read') && (
                    <NavLink to="/masters/customers" onClick={onClose} className={navLinkClass}>
                      <Users className="w-4 h-4" />
                      <span>Customers</span>
                    </NavLink>
                  )}

                  {hasPermission('products.read') && (
                    <NavLink to="/masters/products" onClick={onClose} className={navLinkClass}>
                      <Package className="w-4 h-4" />
                      <span>Products</span>
                    </NavLink>
                  )}

                  {hasPermission('masters.manage') && (
                    <>
                      <NavLink to="/masters/categories" onClick={onClose} className={navLinkClass}>
                        <Layers className="w-4 h-4" />
                        <span>Categories</span>
                      </NavLink>

                      <NavLink to="/masters/units" onClick={onClose} className={navLinkClass}>
                        <Ruler className="w-4 h-4" />
                        <span>Units</span>
                      </NavLink>

                      <NavLink to="/masters/stores" onClick={onClose} className={navLinkClass}>
                        <Warehouse className="w-4 h-4" />
                        <span>Warehouse & Stores</span>
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics Reports */}
          {canSeeReports && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reports & Analytics
              </div>
              <div className="mt-1 space-y-0.5">
                <NavLink to="/reports" onClick={onClose} className={navLinkClass}>
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Analytics Reports</span>
                </NavLink>
              </div>
            </div>
          )}

          {/* Access Control & Users */}
          {canSeeUserManagement && (
            <div>
              <button
                onClick={() => toggleSection('access')}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition"
              >
                <span>Access & Security</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openSections.access ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openSections.access && (
                <div className="mt-1 space-y-0.5">
                  <NavLink to="/users" onClick={onClose} className={navLinkClass}>
                    <UserCheck className="w-4 h-4" />
                    <span>User Management</span>
                  </NavLink>

                  <NavLink to="/users/roles" onClick={onClose} className={navLinkClass}>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Roles & Permissions</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Audit Logs */}
          {canSeeAudit && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                System
              </div>
              <div className="mt-1 space-y-0.5">
                <NavLink to="/audit-logs" onClick={onClose} className={navLinkClass}>
                  <History className="w-4 h-4 text-slate-500" />
                  <span>Audit Logs</span>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 font-mono text-center bg-slate-50/50">
          OrderFlow OMS &bull; v1.0.0
        </div>
      </aside>
    </>
  );
}
