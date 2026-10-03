import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import {
  ShoppingCart,
  Boxes,
  Users,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Plus,
  Warehouse,
  BarChart3,
  ShieldCheck,
  UserCheck,
  UserX,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await api.get('/dashboard/stats');
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const handleApproveUser = async (u) => {
    try {
      setApprovingId(u.id);
      const res = await api.put(`/users/${u.id}/approve`);
      success(res.message || `User "${u.name}" has been verified & approved!`);
      setData((prev) => {
        if (!prev) return prev;
        const updatedList = (prev.pendingApprovals || []).filter((p) => p.id !== u.id);
        const newCount = Math.max(0, (prev.pendingApprovalsCount || 1) - 1);
        return {
          ...prev,
          pendingApprovals: updatedList,
          pendingApprovalsCount: newCount,
          summary: {
            ...prev.summary,
            pendingApprovalsCount: newCount
          }
        };
      });
    } catch (err) {
      error(err.message || 'Failed to approve user');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectUser = async (u) => {
    if (!window.confirm(`Are you sure you want to reject registration for "${u.name}" (${u.email})?`)) return;
    try {
      setRejectingId(u.id);
      const res = await api.put(`/users/${u.id}/reject`, { reason: 'Registration rejected by administrator' });
      success(res.message || `User "${u.name}" registration rejected.`);
      setData((prev) => {
        if (!prev) return prev;
        const updatedList = (prev.pendingApprovals || []).filter((p) => p.id !== u.id);
        const newCount = Math.max(0, (prev.pendingApprovalsCount || 1) - 1);
        return {
          ...prev,
          pendingApprovals: updatedList,
          pendingApprovalsCount: newCount,
          summary: {
            ...prev.summary,
            pendingApprovalsCount: newCount
          }
        };
      });
    } catch (err) {
      error(err.message || 'Failed to reject user');
    } finally {
      setRejectingId(null);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatActivityDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate();
    const month = d.toLocaleDateString('en-GB', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
    return `${day} ${month}, ${time}`;
  };

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-14 bg-white rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  const {
    summary,
    ordersByStatus,
    monthlySales,
    recentOrders,
    salesTeamLeaderboard,
    packagingSummary,
    pendingApprovals = [],
    pendingApprovalsCount = 0
  } = data;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const maxRevenue = Math.max(...(monthlySales?.map((m) => parseFloat(m.total_revenue)) || [1]), 1000);

  // Daily Quick Actions matching screenshot 2x4 grid
  const quickActions = [
    { label: 'Sales Orders', path: '/orders', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600' },
    { label: 'Create Order', path: '/orders/create', icon: Plus, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Packaging Area', path: '/packaging', icon: Boxes, color: 'bg-purple-50 text-purple-600' },
    { label: 'Customers', path: '/masters/customers', icon: Users, color: 'bg-teal-50 text-teal-600' },
    { label: 'Products Master', path: '/masters/products', icon: Package, color: 'bg-amber-50 text-amber-600' },
    { label: 'Stores & Warehouse', path: '/masters/stores', icon: Warehouse, color: 'bg-cyan-50 text-cyan-600' },
    { label: 'Analytics Reports', path: '/reports', icon: BarChart3, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'User Matrix (RBAC)', path: '/users/roles', icon: ShieldCheck, color: 'bg-rose-50 text-rose-600' },
  ];

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Header Greeting Section matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, {user?.name || 'Administrator'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {getFormattedDate()}
          </p>
        </div>

        {user?.storeName && (
          <span className="text-xs text-slate-500 font-medium">
            Assigned: <strong className="text-slate-800">{user.storeName}</strong>
          </span>
        )}
      </div>

      {/* Super Admin: User Verification Banner if any */}
      {user?.role === 'super_admin' && pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Pending User Registrations ({pendingApprovalsCount})
                </h3>
                <p className="text-xs text-amber-700">Review newly registered team members</p>
              </div>
            </div>
            <Link to="/users" className="text-xs font-semibold text-amber-800 hover:underline">
              View All Users &rarr;
            </Link>
          </div>

          <div className="divide-y divide-amber-200/40">
            {pendingApprovals.map((u) => (
              <div key={u.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{u.name}</span>{' '}
                  <span className="text-slate-500 font-mono text-[11px]">({u.email})</span>
                  <span className="ml-2 text-[10px] text-amber-800 font-medium bg-amber-100 px-2 py-0.5 rounded-full">
                    {u.role_display_name || u.role_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveUser(u)}
                    disabled={approvingId === u.id}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                  >
                    {approvingId === u.id ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectUser(u)}
                    disabled={rejectingId === u.id}
                    className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-medium transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. "At a glance" Section matching screenshot */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold text-slate-500 tracking-wide">
          At a glance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Active orders */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:border-slate-300">
            <span className="text-xs font-medium text-slate-500">Active orders</span>
            <div className="text-3xl font-extrabold text-blue-600 tracking-tight mt-2.5">
              {summary.totalOrders || 0}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Orders in progress</p>
          </div>

          {/* Card 2: Delayed / Pending */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:border-slate-300">
            <span className="text-xs font-medium text-slate-500">Delayed orders</span>
            <div className="text-3xl font-extrabold text-rose-600 tracking-tight mt-2.5">
              {summary.pendingOrders || 0}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Past target schedule</p>
          </div>

          {/* Card 3: In Packaging */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:border-slate-300">
            <span className="text-xs font-medium text-slate-500">In packaging</span>
            <div className="text-3xl font-extrabold text-purple-600 tracking-tight mt-2.5">
              {summary.packagingOrders || 0}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Not yet closed & packed</p>
          </div>

          {/* Card 4: Ready for dispatch / completed */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs transition hover:border-slate-300">
            <span className="text-xs font-medium text-slate-500">Ready for dispatch</span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight mt-2.5">
              {summary.packedOrders || 0}
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Waiting for courier pickup</p>
          </div>
        </div>
      </section>

      {/* 3. "Daily" / Quick Actions Section matching screenshot */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-semibold text-slate-500 tracking-wide">
          Daily
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                to={action.path}
                className="bg-white rounded-xl border border-slate-200/90 p-3.5 flex items-center justify-between hover:border-slate-300 hover:shadow-xs transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${action.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 transition">
                    {action.label}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. "Recent activity" Section matching screenshot */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent activity</h2>
            <Link to="/orders" className="text-xs font-semibold text-brand-600 hover:underline">
              View all orders &rarr;
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            The latest documents created across the order management system.
          </p>
        </div>

        {/* Activity rows separated by dividers matching screenshot */}
        <div className="divide-y divide-slate-100">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/60 -mx-3 px-3 rounded-lg transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {ord.order_number}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs font-semibold text-slate-700">Sales order</span>
                    <Badge variant={ord.order_status} size="sm">
                      {ord.order_status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Customer: <strong className="text-slate-700">{ord.customer_name}</strong> &bull; Total: <strong className="text-slate-700">{formatCurrency(ord.grand_total)}</strong>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 font-mono">
                  {formatActivityDate(ord.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent documents recorded.
            </div>
          )}
        </div>
      </section>

      {/* 5. Analytics & Revenue Trend (Clean Light SaaS style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend SVG */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-600" />
                Monthly Revenue Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Sales fulfillment volume across recent months</p>
            </div>
            <span className="text-xs font-semibold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
              Total: {formatCurrency(summary.totalSales)}
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 sm:gap-3 pt-4 px-1 sm:px-2 overflow-x-auto custom-scrollbar">
            {monthlySales && monthlySales.length > 0 ? (
              monthlySales.map((item, idx) => {
                const heightPercent = Math.max(14, Math.round((parseFloat(item.total_revenue) / maxRevenue) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">
                      {formatCurrency(item.total_revenue)}
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full max-w-[36px] rounded-t-lg bg-brand-500 group-hover:bg-brand-600 transition-all duration-200 shadow-2xs"
                    />
                    <span className="text-[11px] font-medium text-slate-500 font-mono mt-1 text-center truncate max-w-[60px]">
                      {item.month}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No monthly sales recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Orders by Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-indigo-600" />
              Fulfillment Status
            </h3>
            <p className="text-xs text-slate-400 mb-4">Pipeline distribution</p>

            <div className="space-y-3">
              {ordersByStatus && ordersByStatus.map((st, idx) => {
                const total = summary.totalOrders || 1;
                const percentage = Math.round((st.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{st.name}</span>
                      <span className="font-mono text-slate-500 font-semibold">
                        {st.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%`, backgroundColor: st.color || '#2563eb' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Total Customers</span>
            <span className="text-slate-800 font-bold font-mono">{summary.totalCustomers}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
