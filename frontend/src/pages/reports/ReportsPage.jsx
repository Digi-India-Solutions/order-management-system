import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  Package,
  TrendingUp,
  Users,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';

export function ReportsPage() {
  const { error } = useNotification();
  const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'inventory', 'team'

  // Sales Report state
  const [salesData, setSalesData] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Inventory Report state
  const [inventoryData, setInventoryData] = useState(null);

  // Team Report state
  const [teamData, setTeamData] = useState([]);

  const [loading, setLoading] = useState(true);

  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/sales', { startDate, endDate });
      if (res.success) setSalesData(res.data);
    } catch (err) {
      error('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/inventory');
      if (res.success) setInventoryData(res.data);
    } catch (err) {
      error('Failed to load inventory report');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamReport = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reports/team-performance');
      if (res.success) setTeamData(res.data);
    } catch (err) {
      error('Failed to load team performance report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales') fetchSalesReport();
    if (activeTab === 'inventory') fetchInventoryReport();
    if (activeTab === 'team') fetchTeamReport();
  }, [activeTab]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const exportSalesToCsv = () => {
    if (!salesData?.orders || salesData.orders.length === 0) return;

    const headers = ['Order Number', 'Date', 'Customer', 'Sales Person', 'Status', 'Payment', 'Subtotal', 'Grand Total'];
    const rows = salesData.orders.map((o) => [
      o.order_number,
      o.order_date,
      `"${o.customer_name}"`,
      `"${o.sales_person_name || 'Unassigned'}"`,
      o.order_status,
      o.payment_status,
      o.subtotal,
      o.grand_total,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16 print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sales trends, warehouse inventory movement, and sales team productivity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print Report
          </button>

          {activeTab === 'sales' && (
            <button
              onClick={exportSalesToCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-medium text-white shadow-xs transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 print:hidden">
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'sales'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Sales & Fulfillment Report
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'inventory'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Inventory & Valuation Report
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 text-sm font-semibold transition border-b-2 ${
            activeTab === 'team'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Sales Team Performance
        </button>
      </div>

      {/* 1. SALES REPORT TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4 text-xs print:hidden">
            <span className="font-semibold text-slate-700">Date Range Filter:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              onClick={fetchSalesReport}
              className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 font-medium text-white shadow-xs transition"
            >
              Apply Filter
            </button>
          </div>

          {/* Sales Summary Cards */}
          {salesData?.totals && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Total Sales Revenue</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(salesData.totals.totalRevenue)}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Orders Processed</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {salesData.totals.count} Orders
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Avg Order Value</span>
                <div className="text-2xl font-bold font-mono text-brand-600 mt-1">
                  {formatCurrency(salesData.totals.avgOrderValue)}
                </div>
              </div>
            </div>
          )}

          {/* Sales Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Sales Person</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Subtotal</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData?.orders?.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-brand-600">{ord.order_number}</td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {ord.order_date ? new Date(ord.order_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">{ord.customer_name}</td>
                      <td className="p-3.5 text-slate-600">{ord.sales_person_name || 'Unassigned'}</td>
                      <td className="p-3.5">
                        <Badge variant={ord.order_status} size="sm" />
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-700">{formatCurrency(ord.subtotal)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(ord.grand_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVENTORY REPORT TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {inventoryData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Total Stock Valuation</span>
                <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(inventoryData.summary.totalValuation)}
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Catalog SKUs</span>
                <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
                  {inventoryData.summary.totalProducts} Items
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Low Stock SKUs</span>
                <div className="text-2xl font-bold font-mono text-amber-600 mt-1">
                  {inventoryData.summary.lowStockCount} Items
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs uppercase font-semibold text-slate-500">Out of Stock</span>
                <div className="text-2xl font-bold font-mono text-rose-600 mt-1">
                  {inventoryData.summary.outOfStockCount} Items
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Unit Price</th>
                    <th className="p-3.5 text-center">Stock Quantity</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryData?.inventory?.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-mono font-bold text-brand-600">{p.sku}</td>
                      <td className="p-3.5 font-medium text-slate-900">{p.name}</td>
                      <td className="p-3.5 text-slate-600">{p.category_name}</td>
                      <td className="p-3.5 text-right font-mono text-slate-700">{formatCurrency(p.price)}</td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                        {p.stock_quantity} {p.unit_code}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge
                          variant={
                            p.stock_status === 'IN_STOCK'
                              ? 'PACKED'
                              : p.stock_status === 'LOW_STOCK'
                              ? 'PENDING'
                              : 'CANCELLED'
                          }
                          size="sm"
                        >
                          {p.stock_status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.total_valuation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. TEAM REPORT TAB */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3.5"># Rank</th>
                    <th className="p-3.5">Sales Representative</th>
                    <th className="p-3.5">Contact Email</th>
                    <th className="p-3.5 text-center">Assigned Clients</th>
                    <th className="p-3.5 text-center">Orders Closed</th>
                    <th className="p-3.5 text-right">Avg Order Size</th>
                    <th className="p-3.5 text-right">Total Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teamData.map((rep, idx) => (
                    <tr key={rep.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold font-mono text-brand-600">#{idx + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">{rep.name}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{rep.email}</td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-800">{rep.assigned_customers}</td>
                      <td className="p-3.5 text-center font-mono font-semibold text-slate-800">{rep.orders_count}</td>
                      <td className="p-3.5 text-right font-mono text-slate-700">{formatCurrency(rep.avg_order_value)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(rep.total_sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
