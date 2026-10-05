import React from 'react';

export function Badge({ children, variant = 'default', size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  }[size] || 'px-2.5 py-1 text-xs';

  const variantMap = {
    // Order Statuses
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/80',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200/80',
    PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    PACKAGING: 'bg-purple-50 text-purple-700 border-purple-200/80',
    PACKED: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    DISPATCHED: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
    DELIVERED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200/80',
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',

    // Packaging specific statuses
    WAITING_FOR_PACKAGING: 'bg-amber-50 text-amber-700 border-amber-200/80',
    PACKAGING_STARTED: 'bg-purple-50 text-purple-700 border-purple-200/80',
    QUALITY_CHECK: 'bg-blue-50 text-blue-700 border-blue-200/80',
    READY_FOR_DISPATCH: 'bg-teal-50 text-teal-700 border-teal-200/80',

    // Payment Statuses
    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200/80',
    'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-200/80',
    'PARTIALLY PAID': 'bg-amber-50 text-amber-700 border-amber-200/80',
    'partially paid': 'bg-amber-50 text-amber-700 border-amber-200/80',
    UNPAID: 'bg-rose-50 text-rose-700 border-rose-200/80',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',

    // Roles
    super_admin: 'bg-purple-50 text-purple-700 border-purple-200/80',
    admin: 'bg-blue-50 text-blue-700 border-blue-200/80',
    sales_manager: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    sales_person: 'bg-amber-50 text-amber-700 border-amber-200/80',
    store_manager: 'bg-cyan-50 text-cyan-700 border-cyan-200/80',

    // Active status
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    unverified: 'bg-amber-50 text-amber-700 border-amber-200/80',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200/80',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200/80',

    // Base variants
    primary: 'bg-blue-50 text-blue-700 border-blue-200/80',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
    default: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const key = String(variant || '').toLowerCase();
  const directKey = String(variant || '');
  const upperKey = String(variant || '').toUpperCase();
  const classes = variantMap[directKey] || variantMap[upperKey] || variantMap[key] || variantMap.default;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses} ${classes}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {children || variant}
    </span>
  );
}
