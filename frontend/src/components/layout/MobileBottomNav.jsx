import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  Boxes,
  Users,
  Menu,
  BarChart3
} from 'lucide-react';

export function MobileBottomNav({ onToggleSidebar }) {
  const { hasPermission, hasRole } = useAuth();
  const location = useLocation();

  const canSeeSales = hasPermission('orders.read') || hasPermission('orders.create');
  const canCreateOrder = hasPermission('orders.create');
  const canSeePackaging = hasPermission('packaging.read');
  const canSeeCustomers = hasPermission('customers.read');

  // Build the 4 primary features dynamically based on user permissions
  // 1. Dashboard is always first
  const navItems = [
    {
      label: 'Home',
      to: '/dashboard',
      icon: LayoutDashboard,
      exact: true,
    }
  ];

  // 2. Second item: Sales Orders or Customers
  if (canSeeSales) {
    navItems.push({
      label: 'Orders',
      to: '/orders',
      icon: ShoppingCart,
      exact: false,
    });
  } else if (canSeeCustomers) {
    navItems.push({
      label: 'Clients',
      to: '/masters/customers',
      icon: Users,
      exact: false,
    });
  }

  // 3. Center Highlight / Third item: Create Order or Packaging
  if (canCreateOrder) {
    navItems.push({
      label: 'Create',
      to: '/orders/create',
      icon: Plus,
      isAction: true,
      exact: true,
    });
  } else if (canSeePackaging) {
    navItems.push({
      label: 'Packing',
      to: '/packaging',
      icon: Boxes,
      exact: false,
    });
  }

  // 4. Fourth item: Packaging, Analytics, or Customers
  if (canCreateOrder && canSeePackaging) {
    navItems.push({
      label: 'Packing',
      to: '/packaging',
      icon: Boxes,
      exact: false,
    });
  } else if (navItems.length < 4 && canSeeCustomers) {
    navItems.push({
      label: 'Clients',
      to: '/masters/customers',
      icon: Users,
      exact: false,
    });
  } else if (navItems.length < 4) {
    navItems.push({
      label: 'Analytics',
      to: '/reports',
      icon: BarChart3,
      exact: false,
    });
  }

  // Cap at 4 main features before the "More / Hamburger" trigger
  const primaryFour = navItems.slice(0, 4);

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-3 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-40 lg:hidden"
    >
      {/* Authentic Frosted Glass Floating Dock */}
      <div className="glass-dock rounded-2xl px-2 py-1.5 flex items-center justify-around">
        {primaryFour.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          if (item.isAction) {
            // Special highlighted center action button
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center justify-center -top-3 p-1 transition-transform active:scale-90`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/35 border-2 border-white ring-1 ring-blue-500/20">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-slate-800 mt-0.5 tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
                  {item.label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-150 active:scale-95 group ${
                isActive
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-700 hover:text-slate-900 font-medium'
              }`}
            >
              {/* Subtle active frosted pill */}
              {isActive && (
                <span className="absolute inset-0 bg-white/50 border border-white/80 rounded-xl shadow-xs pointer-events-none" />
              )}
              
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[2] group-hover:scale-105'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-blue-600 ring-2 ring-white" />
                )}
              </div>

              <span className="text-[10px] mt-1 tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                {item.label}
              </span>
            </NavLink>
          );
        })}

        {/* 5. More / Hamburger Menu Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Open Full Menu"
          className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl text-slate-700 hover:text-slate-900 font-medium transition-all duration-150 active:scale-95 group"
        >
          <div className="relative">
            <Menu className="w-5 h-5 stroke-[2] group-hover:scale-105 transition-transform" />
          </div>
          <span className="text-[10px] mt-1 tracking-tight drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
            More
          </span>
        </button>
      </div>
    </nav>
  );
}


