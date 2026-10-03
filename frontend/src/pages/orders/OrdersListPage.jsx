import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Calendar,
  Filter,
  CheckCircle,
  FileText
} from 'lucide-react';

export function OrdersListPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useNotification();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Status update modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', {
        page,
        limit,
        search,
        status: statusFilter,
        paymentStatus: paymentFilter,
      });
      if (res.success) {
        setOrders(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, search, statusFilter, paymentFilter]);

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !newStatus) return;

    try {
      setIsUpdatingStatus(true);
      const res = await api.put(`/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        remarks: statusRemarks,
      });
      success(res.message || 'Status updated successfully');
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to update order status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Are you sure you want to delete order ${order.order_number}?`)) {
      return;
    }
    try {
      const res = await api.delete(`/orders/${order.id}`);
      success(res.message || 'Order deleted');
      fetchOrders();
    } catch (err) {
      error(err.message || 'Failed to delete order');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const columns = [
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (row) => (
        <Link
          to={`/orders/${row.id}`}
          className="font-mono font-bold text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          {row.order_number}
        </Link>
      ),
    },
    {
      header: 'Date',
      accessor: 'order_date',
      render: (row) => (
        <span className="font-mono text-slate-300 text-xs">
          {row.order_date ? new Date(row.order_date).toLocaleDateString('en-GB') : '-'}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      render: (row) => (
        <div>
          <div className="font-medium text-white">{row.customer_name}</div>
          <div className="text-[11px] text-slate-400">{row.customer_phone || row.customer_email}</div>
        </div>
      ),
    },
    {
      header: 'Sales Person',
      accessor: 'sales_person_name',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-400/80" />
          <span className="text-slate-200 font-medium">{row.sales_person_name || 'Unassigned'}</span>
        </div>
      ),
    },
    {
      header: 'Total',
      accessor: 'grand_total',
      className: 'text-right',
      render: (row) => (
        <span className="font-mono font-bold text-slate-900">{formatCurrency(row.grand_total)}</span>
      ),
    },
    {
      header: 'Paid',
      accessor: 'paid_amount',
      className: 'text-right',
      render: (row) => (
        <span className="font-mono font-semibold text-emerald-700">
          {formatCurrency(row.paid_amount || 0)}
        </span>
      ),
    },
    {
      header: 'Pending',
      accessor: 'pending_amount',
      className: 'text-right',
      render: (row) => (
        <span className={`font-mono font-semibold ${parseFloat(row.pending_amount) > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
          {formatCurrency(row.pending_amount !== undefined ? row.pending_amount : (row.grand_total - (row.paid_amount || 0)))}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'payment_status',
      render: (row) => <Badge variant={row.payment_status} size="sm" />,
    },
    {
      header: 'Order Status',
      accessor: 'order_status',
      render: (row) => <Badge variant={row.order_status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/orders/${row.id}`}
            title="View Order Details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {hasPermission('orders.update') && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                const s = String(row.order_status || '').toLowerCase();
                setNewStatus(s.includes('confirm') ? 'Confirmed' : 'Pending');
                setStatusRemarks('');
              }}
              title="Update Order Status"
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {hasPermission('orders.delete') && (
            <button
              onClick={() => handleDelete(row)}
              title="Delete Order"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
            Sales Orders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage client orders, track fulfillment statuses, and streamline dispatch
          </p>
        </div>

        {hasPermission('orders.create') && (
          <Link
            to="/orders/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create Sales Order
          </Link>
        )}
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={orders}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search order #, customer, phone..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No sales orders found matching criteria"
        filterComponents={
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="PACKAGING">Packaging</option>
              <option value="PACKED">Packed</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="flex-1 sm:flex-initial px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        }
      />

      {/* Quick Status Update Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Update Order Status: ${selectedOrder?.order_number}`}
        maxWidth="max-w-md"
      >
        {selectedOrder && (
          <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                New Order Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs font-medium"
              >
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Remarks / Notes
              </label>
              <textarea
                rows={3}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Reason for change or tracking details..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 placeholder-slate-400 shadow-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-semibold text-white shadow-xs disabled:opacity-50 transition"
              >
                {isUpdatingStatus ? 'Saving...' : 'Update Status'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
