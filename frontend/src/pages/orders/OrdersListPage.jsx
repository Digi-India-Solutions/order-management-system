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
  FileText,
  Truck
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

  // Status & Delivery update modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
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

  const openStatusModal = (order, forceStatus = null) => {
    setSelectedOrder(order);
    const current = String(order.order_status || 'PENDING').toUpperCase();
    setNewStatus(forceStatus || current);
    setStatusRemarks('');
    setCarrierName(order.carrier_name || '');
    setTrackingNumber(order.tracking_number || '');
    setDeliveredAt(new Date().toISOString().slice(0, 16));
    setDeliveryNotes(order.delivery_notes || '');
  };

  const handleStatusChangeSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !newStatus) return;

    try {
      setIsUpdatingStatus(true);
      const res = await api.put(`/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        remarks: statusRemarks,
        carrierName: carrierName || undefined,
        trackingNumber: trackingNumber || undefined,
        deliveredAt: newStatus === 'DELIVERED' ? (deliveredAt ? new Date(deliveredAt).toISOString() : new Date().toISOString()) : undefined,
        deliveryNotes: deliveryNotes || undefined,
      });
      success(res.message || 'Order status updated successfully');
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
      render: (row) => (
        <div>
          <Badge variant={row.order_status} size="sm" />
          {row.tracking_number && (
            <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[120px]">
              {row.carrier_name ? `${row.carrier_name}: ` : ''}{row.tracking_number}
            </div>
          )}
        </div>
      ),
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
            <>
              <button
                onClick={() => openStatusModal(row, 'DELIVERED')}
                title="Update Delivery Status (Mark Delivered / In-Transit)"
                className={`p-1.5 rounded-lg transition ${
                  String(row.order_status).toUpperCase() === 'DELIVERED'
                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <Truck className="w-4 h-4" />
              </button>

              <button
                onClick={() => openStatusModal(row)}
                title="Update Order Status"
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
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

      {/* Quick Status & Delivery Update Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={
          newStatus === 'DELIVERED'
            ? `Update Delivery Status: ${selectedOrder?.order_number}`
            : `Update Order Status: ${selectedOrder?.order_number}`
        }
        maxWidth="max-w-lg"
      >
        {selectedOrder && (
          <form onSubmit={handleStatusChangeSubmit} className="space-y-4">
            {/* Current Order Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500 block">Customer</span>
                <span className="font-semibold text-slate-800">{selectedOrder.customer_name}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Current Status</span>
                <Badge variant={selectedOrder.order_status} size="sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Order Fulfillment Status *
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs font-semibold"
              >
                <option value="PENDING">PENDING — Waiting for confirmation</option>
                <option value="CONFIRMED">CONFIRMED — Order verified & approved</option>
                <option value="PROCESSING">PROCESSING — Order in process</option>
                <option value="PACKAGING">PACKAGING — Warehouse picking/packing</option>
                <option value="PACKED">PACKED — Boxed & ready</option>
                <option value="DISPATCHED">DISPATCHED — Handed over / Out for delivery</option>
                <option value="DELIVERED">DELIVERED — Successfully handed over to customer</option>
                <option value="CANCELLED">CANCELLED — Order cancelled</option>
              </select>
            </div>

            {/* Delivery & Logistics Details Section (shown when DISPATCHED or DELIVERED) */}
            {(newStatus === 'DELIVERED' || newStatus === 'DISPATCHED') && (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  {newStatus === 'DELIVERED' ? 'Delivery & Handover Information' : 'Dispatch & Courier Tracking'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Carrier / Courier Partner
                    </label>
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                      placeholder="e.g. Delhivery / BlueDart / Local Staff"
                      className="w-full p-2 bg-white border border-emerald-300/80 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {['Delhivery', 'BlueDart', 'DTDC', 'In-House'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCarrierName(c)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Tracking / AWB #
                    </label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="AWB / Consignment #"
                      className="w-full p-2 bg-white border border-emerald-300/80 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                </div>

                {newStatus === 'DELIVERED' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Delivered Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={deliveredAt}
                      onChange={(e) => setDeliveredAt(e.target.value)}
                      className="w-full p-2 bg-white border border-emerald-300/80 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Proof of Delivery / Delivery Notes
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="e.g. Received by Mr. Rajesh (Customer), OTP verified"
                    className="w-full p-2 bg-white border border-emerald-300/80 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Internal Remarks / Status Log
              </label>
              <textarea
                rows={2}
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                placeholder="Optional notes for order history timeline..."
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
                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs disabled:opacity-50 transition ${
                  newStatus === 'DELIVERED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {isUpdatingStatus ? 'Saving...' : (newStatus === 'DELIVERED' ? 'Mark as Delivered' : 'Save Status Change')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
