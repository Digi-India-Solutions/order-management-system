import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  Building,
  User,
  Calculator,
  Save,
  CheckCircle,
  Package,
  CreditCard,
  Lock,
  Tag,
  Warehouse
} from 'lucide-react';

export function CreateOrderPage() {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [salesPeople, setSalesPeople] = useState([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState(
    user?.role === 'sales_person' ? user.id : ''
  );

  useEffect(() => {
    if (user?.role === 'sales_person' && user?.id) {
      setSelectedSalesPersonId(user.id);
    } else if (user?.id && !selectedSalesPersonId) {
      setSelectedSalesPersonId(user.id);
    }
  }, [user]);

  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderStatus, setOrderStatus] = useState('Pending'); // Feature 5: Default Order Status = Pending
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [remarks, setRemarks] = useState('');

  // Feature 2 & 3: Partial Payment State
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentNote, setPaymentNote] = useState('');

  // Dynamic Line Items with Feature 1: Editable Selling Price
  const [items, setItems] = useState([
    {
      productId: '',
      quantity: 1,
      originalPrice: 0,
      sellingPrice: 0,
      discountPercent: 0,
      taxRate: 0,
      lineTotal: 0,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch initial master data
  useEffect(() => {
    async function loadMasters() {
      try {
        const [custRes, prodRes, storeRes, userRes] = await Promise.allSettled([
          api.get('/customers', { limit: 500 }),
          api.get('/products', { limit: 500, status: 'active' }),
          api.get('/masters/stores'),
          api.get('/users/sales-reps'),
        ]);

        if (custRes.status === 'fulfilled' && custRes.value?.success) {
          setCustomers(custRes.value.data || []);
        }
        if (prodRes.status === 'fulfilled' && prodRes.value?.success) {
          setProducts(prodRes.value.data || []);
        }
        if (storeRes.status === 'fulfilled' && storeRes.value?.success) {
          const sData = storeRes.value.data || [];
          setStores(sData);
          if (sData.length > 0) setSelectedStoreId(sData[0].id);
        }
        if (userRes.status === 'fulfilled' && userRes.value?.success) {
          setSalesPeople(userRes.value.data || []);
        }
      } catch (err) {
        console.error('Failed to load masters:', err);
      }
    }
    loadMasters();
  }, []);

  // When customer changes, prefill shipping address
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    const cust = customers.find((c) => String(c.id) === String(customerId));
    if (cust) {
      setDeliveryAddress(cust.shipping_address || cust.billing_address || '');
      setCity(cust.city || '');
      setState(cust.state || '');
      setPincode(cust.pincode || '');
      if (cust.assigned_sales_person_id && user?.role !== 'sales_person') {
        setSelectedSalesPersonId(cust.assigned_sales_person_id);
      }
    }
  };

  // Line item handlers
  const handleItemProductChange = (index, productId) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    const newItems = [...items];
    const originalPrice = prod ? parseFloat(prod.price) : 0;
    const qty = Math.max(1, parseInt(newItems[index].quantity, 10) || 1);

    newItems[index] = {
      ...newItems[index],
      productId,
      quantity: qty,
      originalPrice,
      sellingPrice: originalPrice, // Default selling price equals original price initially
      taxRate: 0,
    };
    calculateLineTotal(newItems, index);
  };

  const handleItemFieldChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    calculateLineTotal(newItems, index);
  };

  const calculateLineTotal = (itemsArray, index) => {
    const item = itemsArray[index];
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const price = Math.max(0, parseFloat(item.sellingPrice) || 0);
    const disc = Math.max(0, parseFloat(item.discountPercent) || 0);

    const raw = qty * price;
    const discAmt = (raw * disc) / 100;
    const afterDisc = raw - discAmt;
    const lineTotal = Math.round(afterDisc * 100) / 100;

    itemsArray[index].lineTotal = lineTotal;
    setItems(itemsArray);
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        originalPrice: 0,
        sellingPrice: 0,
        discountPercent: 0,
        taxRate: 0,
        lineTotal: 0,
      },
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Grand summary calculations based on selling price
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach((item) => {
      const qty = parseInt(item.quantity, 10) || 0;
      const price = parseFloat(item.sellingPrice) || 0;
      const disc = parseFloat(item.discountPercent) || 0;

      const raw = qty * price;
      const discAmt = (raw * disc) / 100;

      subtotal += raw;
      totalDiscount += discAmt;
    });

    const grandTotal = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);
    return { subtotal, totalDiscount, grandTotal };
  };

  const { subtotal, totalDiscount, grandTotal } = calculateTotals();

  // Partial Payment calculations
  const parsedPaid = Math.max(0, parseFloat(paidAmount) || 0);
  const pendingAmount = Math.max(0, Math.round((grandTotal - parsedPaid) * 100) / 100);

  const getDerivedPaymentStatus = () => {
    if (parsedPaid >= grandTotal && grandTotal > 0) return 'Paid';
    if (parsedPaid > 0) return 'Partially Paid';
    return 'Pending';
  };
  const derivedPaymentStatus = getDerivedPaymentStatus();

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      error('Please select a customer.');
      return;
    }

    const currentCustomer = customers.find((c) => String(c.id) === String(selectedCustomerId));
    if (currentCustomer?.approval_status === 'REJECTED') {
      error('This customer was rejected and cannot place orders.');
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      error('Please add at least one valid product line item.');
      return;
    }

    // Validate that paid amount does not exceed grand total
    if (parsedPaid > grandTotal) {
      error(`Paid amount (${formatCurrency(parsedPaid)}) cannot exceed total order amount (${formatCurrency(grandTotal)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/orders', {
        customerId: parseInt(selectedCustomerId, 10),
        orderDate,
        salesPersonId: selectedSalesPersonId ? parseInt(selectedSalesPersonId, 10) : null,
        storeId: selectedStoreId ? parseInt(selectedStoreId, 10) : null,
        items: validItems.map((i) => ({
          productId: parseInt(i.productId, 10),
          quantity: parseInt(i.quantity, 10),
          originalPrice: parseFloat(i.originalPrice || 0),
          sellingPrice: parseFloat(i.sellingPrice || 0),
          discountPercent: parseFloat(i.discountPercent || 0),
          taxRate: parseFloat(i.taxRate || 0),
        })),
        paidAmount: parsedPaid,
        paymentMode: parsedPaid > 0 ? paymentMode : null,
        paymentNote: paymentNote || '',
        orderStatus: user?.role === 'sales_person' ? 'Pending' : (orderStatus || 'Pending'),
        deliveryAddress,
        city,
        state,
        pincode,
        remarks,
      });

      if (res.success) {
        success(res.message || 'Sales order created successfully!');
        navigate(`/orders/${res.data.id}`);
      }
    } catch (err) {
      error(err.message || 'Failed to create sales order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Sales Order</h1>
            <p className="text-xs text-slate-500 mt-0.5">Order number will be automatically generated</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Fulfillment Store */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                Customer & Logistics Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Customer (All Available) *
                    </label>
                    <Link
                      to="/masters/customers"
                      className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium transition"
                    >
                      <Plus className="w-3 h-3" /> Add Customer
                    </Link>
                  </div>
                  <select
                    required
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                  >
                    <option value="">-- Select Customer (All Customers) --</option>
                    {customers.map((c) => {
                      const isRejected = c.approval_status === 'REJECTED';
                      return (
                        <option
                          key={c.id}
                          value={c.id}
                          disabled={isRejected}
                          className={isRejected ? 'text-rose-600' : 'text-slate-900'}
                        >
                          {c.name} ({c.customer_code}) {c.company_name ? `- ${c.company_name}` : ''}
                          {isRejected ? ' ❌ [Rejected]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Fulfillment Warehouse
                  </label>
                  <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-brand-600 shrink-0" />
                      <span className="font-medium text-slate-900">{stores[0]?.name || 'Central Warehouse & Store'}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                      {stores[0]?.code || 'WH-MAIN'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Order Date
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                  />
                </div>

                {/* Feature 6: Auto Assigned Sales Person */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Assigned Sales Person</span>
                    {user?.role === 'sales_person' && (
                      <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Auto-assigned to you
                      </span>
                    )}
                  </label>

                  {user?.role === 'sales_person' ? (
                    <div className="w-full p-2 bg-slate-50 border border-emerald-200 rounded-xl text-xs text-slate-900 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 font-medium">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                          {user?.name?.charAt(0) || 'S'}
                        </div>
                        <span>{user?.name}</span>
                        <span className="text-xs text-slate-500">({user?.email})</span>
                      </div>
                      <Badge variant="sales_person" size="sm">Sales Rep</Badge>
                    </div>
                  ) : (
                    <select
                      value={selectedSalesPersonId}
                      onChange={(e) => setSelectedSalesPersonId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    >
                      <option value="">-- Select Sales Rep --</option>
                      {salesPeople.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {sp.name} ({sp.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Complete shipping address..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Pincode"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 1: Line Items Table with Editable Selling Price */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Product Line Items
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Original master catalog prices remain unchanged. Selling prices are editable per order.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-brand-600 border border-slate-200 transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line Item
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="p-3 min-w-[200px]">Product *</th>
                      <th className="p-3 w-28 text-right">Original Price</th>
                      <th className="p-3 w-32 text-right">Selling Price (₹) *</th>
                      <th className="p-3 w-20 text-center">Qty *</th>
                      <th className="p-3 w-20 text-center">Disc %</th>
                      <th className="p-3 w-28 text-right">Total (₹)</th>
                      <th className="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-2.5">
                          <select
                            required
                            value={item.productId}
                            onChange={(e) => handleItemProductChange(idx, e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-xs"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku}) - Original: ₹{p.price} [Stock: {p.stock_quantity}]
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Master Catalog Price (Read Only) */}
                        <td className="p-2.5 text-right font-mono text-slate-500">
                          {item.productId ? (
                            <div>
                              <span className="text-slate-700 font-semibold">{formatCurrency(item.originalPrice || 0)}</span>
                              <div className="text-[10px] text-slate-400 font-sans">Catalog Price</div>
                            </div>
                          ) : '—'}
                        </td>

                        {/* Editable Selling Price at Order Level */}
                        <td className="p-2.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-brand-600 font-mono font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              required
                              value={item.sellingPrice}
                              onChange={(e) => handleItemFieldChange(idx, 'sellingPrice', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 bg-brand-50/30 border border-brand-300 rounded-lg text-xs text-slate-900 font-mono text-right focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-semibold"
                              placeholder="0.00"
                              title="Editable selling price for this specific order"
                            />
                          </div>
                        </td>

                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemFieldChange(idx, 'quantity', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-center focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-xs"
                            placeholder="Qty"
                          />
                        </td>

                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPercent}
                            onChange={(e) => handleItemFieldChange(idx, 'discountPercent', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-mono text-center focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-xs"
                          />
                        </td>

                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(item.lineTotal)}
                        </td>

                        <td className="p-2.5 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment & Invoice Summary Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-brand-600" />
                Order & Payment Summary
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal (Gross)</span>
                  <span className="font-mono text-slate-800 font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Discount Total</span>
                  <span className="font-mono text-emerald-600 font-medium">- {formatCurrency(totalDiscount)}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-slate-900">Order Total</span>
                  <span className="text-xl font-bold font-mono text-brand-600">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Feature 2, 3: Partial Payment Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3.5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-brand-600" />
                      Payment Section
                    </span>
                    <Badge variant={derivedPaymentStatus} size="sm" />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                      Paid Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > grandTotal) {
                            error(`Paid amount cannot exceed total order amount of ${formatCurrency(grandTotal)}`);
                            setPaidAmount(grandTotal);
                          } else {
                            setPaidAmount(e.target.value);
                          }
                        }}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-bold shadow-xs"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter 0 for pending payment, or record partial/full payment received.
                    </p>
                  </div>

                  {parsedPaid > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                          Payment Mode *
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-1">
                          Payment Note / Reference (Optional)
                        </label>
                        <input
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="e.g. UTR / Txn ID, Cheque #..."
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Summary Metrics */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Order Total:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Paid Amount:</span>
                      <span className="font-mono font-bold text-emerald-600">{formatCurrency(parsedPaid)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Pending Amount:</span>
                      <span className="font-mono font-bold text-amber-600">{formatCurrency(pendingAmount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 items-center pt-1 border-t border-slate-200">
                      <span>Payment Status:</span>
                      <span className="font-semibold text-slate-900">{derivedPaymentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Feature 5: Default Order Status = Pending */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Order Status (Default: Pending)
                  </label>
                  {user?.role === 'sales_person' ? (
                    <select
                      value="Pending"
                      disabled
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-amber-700 font-medium cursor-not-allowed focus:outline-none"
                    >
                      <option value="Pending">Pending</option>
                    </select>
                  ) : (
                    <select
                      value={orderStatus}
                      onChange={(e) => setOrderStatus(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                    >
                      <option value="Pending">Pending (Default)</option>
                      <option value="Confirmed">Confirmed</option>
                    </select>
                  )}
                  <p className="text-[10px] text-slate-500 mt-1">
                    {user?.role === 'sales_person'
                      ? 'Orders created by Sales Person are assigned Pending status only.'
                      : 'Order Status and Payment Status are separate fields.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Remarks / Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Instructions, payment terms..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-xs disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Creating Order...' : 'Create Sales Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
