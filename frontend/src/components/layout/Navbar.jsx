import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Building, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Badge } from '../common/Badge';

export function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/orders/create')) return 'Create Sales Order';
    if (path.startsWith('/orders')) return 'Sales Orders';
    if (path.startsWith('/packaging')) return 'Packaging & Fulfillment';
    if (path.startsWith('/masters/customers')) return 'Customers Master';
    if (path.startsWith('/masters/products')) return 'Products Master';
    if (path.startsWith('/masters/categories')) return 'Categories Master';
    if (path.startsWith('/masters/units')) return 'Units Master';
    if (path.startsWith('/masters/stores')) return 'Warehouse & Stores';
    if (path.startsWith('/reports')) return 'Analytics Reports';
    if (path.startsWith('/users/roles')) return 'Roles & Permissions Matrix';
    if (path.startsWith('/users')) return 'User Management';
    if (path.startsWith('/audit-logs')) return 'System Audit Logs';
    return 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-slate-200/90 bg-white px-3 sm:px-6 flex items-center justify-between shadow-2xs">
      {/* Left side: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Clean Breadcrumb Title */}
        <div className="flex items-center gap-2 text-slate-800 text-xs font-semibold min-w-0">
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-3.5 h-3.5" />
          </div>
          <span className="text-slate-900 font-bold truncate max-w-[130px] sm:max-w-[240px] md:max-w-none">
            {getBreadcrumbTitle()}
          </span>
        </div>
      </div>

      {/* Right side: Store Badge, User Avatar & Profile, Logout */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {user?.storeName && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-700">{user.storeName}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-3 border-l border-slate-200">
          {/* User Profile Pill */}
          <div className="flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-slate-50 transition cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {user?.name || 'Administrator'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize font-medium">
                {user?.roleDisplayName || user?.role || 'Admin'}
              </span>
            </div>

            <div className="hidden md:inline-flex">
              <Badge variant={user?.role} size="sm">
                {user?.roleDisplayName || user?.role}
              </Badge>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
