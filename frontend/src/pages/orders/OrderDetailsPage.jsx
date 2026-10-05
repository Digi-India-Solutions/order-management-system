import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Printer,
  Edit,
  Clock,
  Boxes,
  Truck,
  Building,
  User,
  CheckCircle2,
  RefreshCw,
  FileText,
  Calendar,
  AlertCircle,
  CreditCard,
  PlusCircle,
  Receipt,
  Tag,
  Check
} from 'lucide-react';

export function OrderDetailsPage() {
  const { id } = useParams();
  const { hasPermission, user } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status & Delivery Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNote, setPaymentNote] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      if (res.success) {
        setOrder(res.data);
        const upper = String(res.data.order_status || 'PENDING').toUpperCase();
        setNewStatus(upper);
        setCarrierName(res.data.packaging?.carrier_name || '');
        setTrackingNumber(res.data.packaging?.tracking_number || '');
        setDeliveredAt(res.data.delivered_at ? new Date(res.data.delivered_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
        setDeliveryNotes(res.data.delivery_notes || '');
        const pending = parseFloat(res.data.pending_amount !== undefined ? res.data.pending_amount : (res.data.grand_total - (res.data.paid_amount || 0)));
        setPaymentAmount(pending > 0 ? String(pending) : '');
      }
    } catch (err) {
      error(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const openDeliveryModal = (targetStatus = 'DELIVERED') => {
    setNewStatus(targetStatus);
    setStatusRemarks('');
    setCarrierName(order?.packaging?.carrier_name || '');
    setTrackingNumber(order?.packaging?.tracking_number || '');
    setDeliveredAt(order?.delivered_at ? new Date(order.delivered_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setDeliveryNotes(order?.delivery_notes || '');
    setIsStatusModalOpen(true);
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      setIsUpdatingStatus(true);
      const res = await api.put(`/orders/${id}/status`, {
        status: newStatus,
        remarks: statusRemarks,
        carrierName: carrierName || undefined,
        trackingNumber: trackingNumber || undefined,
        deliveredAt: newStatus === 'DELIVERED' ? (deliveredAt ? new Date(deliveredAt).toISOString() : new Date().toISOString()) : undefined,
        deliveryNotes: deliveryNotes || undefined,
      });
      success(res.message || 'Order status updated successfully');
      setIsStatusModalOpen(false);
      fetchOrder();
    } catch (err) {
      error(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const parsedAmt = parseFloat(paymentAmount);
    const pending = parseFloat(order.pending_amount !== undefined ? order.pending_amount : (order.grand_total - (order.paid_amount || 0)));

    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      error('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (parsedAmt > pending) {
      error(`Payment amount cannot exceed pending amount of ${formatCurrency(pending)}.`);
      return;
    }

    try {
      setIsRecordingPayment(true);
      const res = await api.post(`/orders/${id}/payments`, {
        amount: parsedAmt,
        paymentMode,
        paymentDate: paymentDate || new Date().toISOString(),
        note: paymentNote,
      });

      if (res.success) {
        success(res.message || 'Payment recorded successfully!');
        setIsPaymentModalOpen(false);
        setPaymentNote('');
        fetchOrder();
      }
    } catch (err) {
      error(err.message || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 animate-pulse">
        <div className="w-12 h-12 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto mb-3" />
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center text-slate-400">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        Order not found
      </div>
    );
  }

  const pendingAmt = parseFloat(order.pending_amount !== undefined ? order.pending_amount : (order.grand_total - (order.paid_amount || 0)));
  const paidAmt = parseFloat(order.paid_amount || 0);
  const totalAmt = parseFloat(order.grand_total || 0);

  return (
    <div className="space-y-6 pb-16 print:p-0 print:space-y-4">
      {/* Top action header (hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                {order.order_number}
              </h1>
              <Badge variant={order.order_status} size="md">
                Order: {order.order_status}
              </Badge>
              <Badge variant={order.payment_status} size="md">
                Payment: {order.payment_status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {new Date(order.created_at).toLocaleString('en-GB')} by {order.created_by_name || 'System'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Record payment button if pending amount > 0 */}
          {pendingAmt > 0 && hasPermission('orders.update') && (
            <button
              onClick={() => {
                setPaymentAmount(String(pendingAmt));
                setIsPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-medium text-white shadow-xs transition"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print Invoice
          </button>

          {hasPermission('orders.update') && (
            <>
              <button
                onClick={() => openDeliveryModal('DELIVERED')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition ${
                  String(order.order_status).toUpperCase() === 'DELIVERED'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                {String(order.order_status).toUpperCase() === 'DELIVERED' ? 'Delivery Details' : 'Mark as Delivered'}
              </button>

              <button
                onClick={() => openDeliveryModal(String(order.order_status || 'PENDING').toUpperCase())}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-medium text-white shadow-xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Update Status
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-8 print:border-none print:bg-white print:text-black">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-6 print:border-slate-300">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                OM
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 print:text-black">
                ORDER<span className="text-brand-600">FLOW</span> PRO
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 print:text-slate-600">Enterprise Order & Fulfillment Systems</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-xs uppercase font-semibold text-slate-500 print:text-slate-600">SALES ORDER INVOICE</div>
            <div className="text-lg font-mono font-bold text-slate-900 print:text-black">{order.order_number}</div>
            <div className="text-xs text-slate-600 font-mono print:text-slate-700">
              Date: {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '-'}
            </div>
            {order.store_name && (
              <div className="text-xs text-slate-500 print:text-slate-600">Warehouse: {order.store_name}</div>
            )}
          </div>
        </div>

        {/* Feature 8: Customer & Billing / Shipping Details + Sales Person */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 print:bg-slate-50 print:border-slate-200 shadow-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500 print:text-slate-600 block mb-1">
              Customer Details
            </span>
            <div className="text-sm font-bold text-slate-900 print:text-black">{order.customer_name}</div>
            {order.company_name && <div className="text-slate-700 print:text-slate-700">{order.company_name}</div>}
            <div className="text-slate-500 print:text-slate-600">Phone: {order.customer_phone || '-'}</div>
            <div className="text-slate-500 print:text-slate-600">Email: {order.customer_email || '-'}</div>
            {order.customer_gstin && (
              <div className="text-slate-500 print:text-slate-600">GSTIN: {order.customer_gstin}</div>
            )}
          </div>

          <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50 border border-slate-200 print:bg-slate-50 print:border-slate-200 shadow-xs">
            <span className="font-semibold uppercase tracking-wider text-slate-500 print:text-slate-600 block mb-1">
              Shipping & Sales Representation
            </span>
            <div className="text-slate-700 print:text-slate-800 leading-relaxed">
              {order.delivery_address || 'No specific shipping address provided.'}
            </div>
            {(order.city || order.state || order.pincode) && (
              <div className="text-slate-500 print:text-slate-600">
                {[order.city, order.state, order.pincode].filter(Boolean).join(', ')}
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 print:text-slate-600">Assigned Sales Person:</span>
              <span className="text-brand-700 print:text-black font-semibold bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                {order.sales_person_name || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        {/* Feature 1 & 8: Line Items Table with Original Price and Selling Price */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 print:text-black">
            <thead className="bg-slate-50 uppercase font-semibold text-slate-500 print:bg-slate-100 print:text-slate-700 border-b border-slate-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Product Description</th>
                <th className="p-3 text-center">SKU</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Original Price</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-center">Disc %</th>
                <th className="p-3 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {order.items?.map((item, idx) => {
                const orig = parseFloat(item.original_price || item.master_product_price || item.unit_price);
                const selling = parseFloat(item.unit_price);
                const isPriceEdited = orig !== selling;

                return (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-medium text-slate-900 print:text-black">
                      <div>{item.product_name}</div>
                      {isPriceEdited && (
                        <div className="text-[10px] text-amber-600 font-normal">
                          Custom order price applied
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500">{item.product_sku}</td>
                    <td className="p-3 text-center font-mono font-semibold">{item.quantity}</td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      {formatCurrency(orig)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 print:text-black">
                      <span className={isPriceEdited ? 'text-brand-600 font-semibold' : ''}>
                        {formatCurrency(selling)}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono">{item.discount_percent}%</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 print:text-black">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculations / Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-100 pt-6 print:border-slate-300">
          <div className="max-w-md text-xs text-slate-500 space-y-1.5 print:text-slate-600">
            <span className="font-semibold uppercase tracking-wider text-slate-700 block mb-1">Remarks & Notes</span>
            <p>{order.remarks || 'Standard enterprise delivery terms apply.'}</p>
          </div>

          <div className="w-full sm:w-80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 print:text-slate-700">
              <span>Gross Subtotal</span>
              <span className="font-mono text-slate-800 print:text-black">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-500 print:text-slate-700">
              <span>Discount</span>
              <span className="font-mono text-emerald-600">- {formatCurrency(order.discount_total)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100 print:border-slate-300 flex justify-between items-baseline font-bold text-sm">
              <span className="text-slate-900 print:text-black">Grand Total</span>
              <span className="text-lg font-mono text-brand-600 print:text-black">
                {formatCurrency(order.grand_total)}
              </span>
            </div>

            {/* Payment Summary inside Invoice */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Paid:</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(paidAmt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Pending Balance:</span>
                <span className="font-mono font-bold text-amber-600">{formatCurrency(pendingAmt)}</span>
              </div>
              <div className="flex justify-between text-slate-600 items-center pt-1">
                <span>Payment Status:</span>
                <Badge variant={order.payment_status} size="sm" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature 4 & 8: Payment Details & Payment History Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Payment Details & Transaction History
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Track manual partial and full payments received via Cash, UPI, Bank Transfer, or Cheque
            </p>
          </div>

          {pendingAmt > 0 && hasPermission('orders.update') && (
            <button
              onClick={() => {
                setPaymentAmount(String(pendingAmt));
                setIsPaymentModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-medium text-white shadow-xs transition self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Record Partial / Full Payment
            </button>
          )}
        </div>

        {/* 4 Stat Overview Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-slate-500 block font-medium">Total Order Amount</span>
            <span className="text-lg font-bold font-mono text-slate-900">{formatCurrency(totalAmt)}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-slate-500 block font-medium">Total Paid Amount</span>
            <span className="text-lg font-bold font-mono text-emerald-600">{formatCurrency(paidAmt)}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-slate-500 block font-medium">Pending Balance</span>
            <span className={`text-lg font-bold font-mono ${pendingAmt > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
              {formatCurrency(pendingAmt)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 shadow-xs">
            <span className="text-slate-500 block font-medium">Payment Status</span>
            <div className="pt-0.5">
              <Badge variant={order.payment_status} size="sm" />
            </div>
            {order.payment_mode && (
              <span className="text-[11px] text-slate-500 block mt-0.5">Mode: {order.payment_mode}</span>
            )}
          </div>
        </div>

        {/* Payment History Table */}
        <div className="space-y-2 pt-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-brand-600" />
            Payment History ({order.payments?.length || 0} Records)
          </h4>

          {order.payments && order.payments.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Received By</th>
                    <th className="p-3">Note / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.payments.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-slate-50/60 transition">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="p-3 font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {p.payment_date ? new Date(p.payment_date).toLocaleString('en-GB') : '-'}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">
                        {p.received_by_name || 'System / Staff'}
                      </td>
                      <td className="p-3 text-slate-500 italic">
                        {p.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No payment transactions recorded yet. Pending balance is {formatCurrency(pendingAmt)}.
            </div>
          )}
        </div>
      </div>

      {/* Delivery & Logistics Information Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delivery & Logistics Information</h3>
              <p className="text-xs text-slate-500">Carrier dispatch, tracking details, and proof of delivery</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={order.order_status} size="md" />
            {hasPermission('orders.update') && (
              <button
                onClick={() => openDeliveryModal('DELIVERED')}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition"
              >
                {String(order.order_status).toUpperCase() === 'DELIVERED' ? 'Edit Delivery Info' : 'Update Delivery Status'}
              </button>
            )}
          </div>
        </div>

        {/* Milestone Banner */}
        {String(order.order_status).toUpperCase() === 'DELIVERED' ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <div className="font-bold text-sm text-emerald-950">
                Order Successfully Delivered
              </div>
              <div className="mt-0.5 text-emerald-800">
                Delivered on {order.delivered_at ? new Date(order.delivered_at).toLocaleString('en-GB') : 'Recorded'}.
              </div>
              {order.delivery_notes && (
                <div className="mt-1.5 font-medium bg-white/70 p-2 rounded-lg text-emerald-900 border border-emerald-200/60">
                  <span className="font-bold">Proof / Notes: </span>{order.delivery_notes}
                </div>
              )}
            </div>
          </div>
        ) : String(order.order_status).toUpperCase() === 'DISPATCHED' ? (
          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 flex items-start gap-3">
            <Truck className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div className="text-xs flex-1">
              <div className="font-bold text-sm text-cyan-950">Order Dispatched & In Transit</div>
              <div className="mt-0.5 text-cyan-800">Package has been handed over to courier for transit to customer address.</div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <span>Current fulfillment status: <strong>{order.order_status}</strong>. Package has not been marked delivered yet.</span>
            {hasPermission('orders.update') && (
              <button
                onClick={() => openDeliveryModal('DELIVERED')}
                className="underline font-semibold hover:text-amber-950 self-start sm:self-auto"
              >
                Mark Delivered Now &rarr;
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-slate-500 block mb-1">Carrier Partner</span>
            <span className="text-sm font-semibold text-slate-900">
              {order.packaging?.carrier_name || 'Standard Courier / Staff Handover'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-slate-500 block mb-1">Consignment / Tracking #</span>
            <span className="text-sm font-mono font-bold text-brand-600">
              {order.packaging?.tracking_number || 'Direct Delivery'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-slate-500 block mb-1">Delivery Destination</span>
            <span className="font-medium text-slate-800 block truncate" title={`${order.delivery_address || ''}, ${order.city || ''} ${order.pincode || ''}`}>
              {order.city ? `${order.city}, ${order.state || ''}` : (order.delivery_address || 'Customer Address')}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
            <span className="text-slate-500 block mb-1">Delivery Status / Time</span>
            <span className="font-mono text-slate-800 font-semibold">
              {order.delivered_at ? new Date(order.delivered_at).toLocaleString('en-GB') : (order.order_status === 'DELIVERED' ? 'Delivered' : 'Pending')}
            </span>
          </div>
        </div>
      </div>

      {/* Packaging & Logistics Status (If available) */}
      {order.packaging && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-brand-600" />
              Packaging Details
            </h3>
            <Badge variant={order.packaging.packaging_status} size="sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-slate-500 block mb-1">Package Count</span>
              <span className="text-base font-bold font-mono text-slate-900">{order.packaging.package_count || 1} Box(es)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-slate-500 block mb-1">Total Weight</span>
              <span className="text-base font-bold font-mono text-slate-900">{order.packaging.weight_kg || '0.00'} kg</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-xs">
              <span className="text-slate-500 block mb-1">Tracking Number</span>
              <span className="text-sm font-mono text-brand-600 font-semibold">{order.packaging.tracking_number || 'Pending'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Status History Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 print:hidden">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-600" />
          Order Lifecycle History
        </h3>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {order.history?.map((h, idx) => (
            <div key={h.id || idx} className="relative flex items-start gap-4">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-brand-500 bg-white" />
              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{h.changed_by_name || 'System'}</span>
                    <Badge variant={h.new_status} size="sm" />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {new Date(h.created_at).toLocaleString('en-GB')}
                  </span>
                </div>
                {h.remarks && <p className="mt-1 text-slate-600">{h.remarks}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for Order ${order.order_number}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Order Grand Total:</span>
              <span className="font-mono font-semibold text-slate-900">{formatCurrency(totalAmt)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Already Paid:</span>
              <span className="font-mono font-semibold text-emerald-600">{formatCurrency(paidAmt)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
              <span>Current Pending:</span>
              <span className="font-mono text-amber-600">{formatCurrency(pendingAmt)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
              <input
                type="number"
                min="1"
                max={pendingAmt}
                step="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount received"
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cannot exceed current pending balance of {formatCurrency(pendingAmt)}.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Payment Mode *
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Payment Note / Reference (Optional)
            </label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. UTR #, Cheque #, Cash receipt #..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRecordingPayment}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-medium text-white shadow-xs disabled:opacity-50 transition"
            >
              {isRecordingPayment ? 'Recording...' : 'Save Payment Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Status & Delivery Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          newStatus === 'DELIVERED'
            ? `Update Delivery Status: ${order.order_number}`
            : `Change Order Status: ${order.order_number}`
        }
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Order Fulfillment Status *
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-semibold shadow-xs"
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
            <p className="text-[11px] text-slate-500 mt-1">
              Note: Order Fulfillment Status is tracked independently from Payment Status.
            </p>
          </div>

          {/* Delivery & Tracking Information Section */}
          {(newStatus === 'DELIVERED' || newStatus === 'DISPATCHED') && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                <Truck className="w-4 h-4 text-emerald-600" />
                {newStatus === 'DELIVERED' ? 'Delivery Handover Details' : 'Dispatch & Courier Tracking'}
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
                    placeholder="e.g. Delhivery, BlueDart, DTDC, Local"
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
                  Delivery Notes / Proof of Delivery
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Received by customer, signed delivery receipt"
                  className="w-full p-2 bg-white border border-emerald-300/80 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Status Change Remarks / Notes
            </label>
            <textarea
              rows={2}
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
              placeholder="e.g. Verified and handed over to customer..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
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
              {isUpdatingStatus ? 'Saving...' : (newStatus === 'DELIVERED' ? 'Mark as Delivered' : 'Confirm Status Change')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
