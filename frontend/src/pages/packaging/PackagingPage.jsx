import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Boxes,
  Clock,
  CheckCircle,
  Truck,
  Search,
  Package,
  ShieldCheck,
  Scale,
  Edit,
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function PackagingPage() {
  const { user, hasPermission } = useAuth();
  const { success, error } = useNotification();

  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [packagingStatusFilter, setPackagingStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  // Packaging Action Modal
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modal Form State
  const [formData, setFormData] = useState({
    packagingStatus: 'PACKAGING_STARTED',
    packageCount: 1,
    weightKg: 1.0,
    dimensions: '30x20x15 cm',
    packagingMaterial: 'Corrugated Box & Bubble Wrap',
    trackingNumber: '',
    carrierName: 'Delhivery / BlueDart Express',
    remarks: 'Securely packaged for transit',
  });

  const fetchPackagingData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/packaging', {
        page,
        limit,
        search,
        packagingStatus: packagingStatusFilter,
      });
      if (res.success) {
        setOrders(res.data);
        setTotal(res.meta?.total || 0);
        if (res.meta?.summary) {
          setSummary(res.meta.summary);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to load packaging orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackagingData();
  }, [page, search, packagingStatusFilter]);

  const openPackagingModal = async (order) => {
    setActiveOrder(order);
    try {
      const res = await api.get(`/packaging/${order.order_id}`);
      if (res.success) {
        setOrderDetails(res.data);
        const pkg = res.data.packaging;
        setFormData({
          packagingStatus: pkg?.packaging_status || 'PACKAGING_STARTED',
          packageCount: pkg?.package_count || 1,
          weightKg: pkg?.weight_kg || 1.5,
          dimensions: pkg?.dimensions || '30x20x15 cm',
          packagingMaterial: pkg?.packaging_material || 'Corrugated Box & Bubble Wrap',
          trackingNumber: pkg?.tracking_number || '',
          carrierName: pkg?.carrier_name || 'Delhivery Express',
          remarks: pkg?.remarks || '',
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      error('Failed to load order line items');
    }
  };

  const handlePackagingSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      setIsSaving(true);
      const res = await api.put(`/packaging/${activeOrder.order_id}`, formData);
      if (res.success) {
        success(res.message || 'Packaging details updated successfully!');
        setIsModalOpen(false);
        fetchPackagingData();
      }
    } catch (err) {
      error(err.message || 'Failed to update packaging record');
    } finally {
      setIsSaving(false);
    }
  };

  const columns = [
    {
      header: 'Order #',
      accessor: 'order_number',
      render: (row) => (
        <Link
          to={`/orders/${row.order_id}`}
          className="font-mono font-semibold text-brand-600 hover:text-brand-700 hover:underline"
        >
          {row.order_number}
        </Link>
      ),
    },
    {
      header: 'Customer',
      accessor: 'customer_name',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.customer_name}</div>
          <div className="text-[11px] text-slate-500">{row.customer_city || row.customer_phone}</div>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      accessor: 'store_name',
      render: (row) => <span className="text-slate-600">{row.store_name || 'Main Warehouse'}</span>,
    },
    {
      header: 'Items / Qty',
      render: (row) => (
        <span className="font-mono text-slate-600">
          {row.total_items} items ({row.total_quantity} pcs)
        </span>
      ),
    },
    {
      header: 'Packaging Status',
      accessor: 'packaging_status',
      render: (row) => <Badge variant={row.packaging_status} size="sm" />,
    },
    {
      header: 'Weight / Boxes',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {row.package_count || 1} box | {row.weight_kg ? `${row.weight_kg} kg` : '-'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission('packaging.update') ? (
            <button
              onClick={() => openPackagingModal(row)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 font-semibold text-xs transition shadow-xs"
            >
              <Boxes className="w-3.5 h-3.5" />
              Process Package
            </button>
          ) : (
            <Link
              to={`/orders/${row.order_id}`}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Boxes className="w-5 h-5 text-brand-600" />
          Store Packaging Area
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Fulfillment workflow: Order &rarr; Packaging Started &rarr; Quality Check &rarr; Packed &rarr; Ready for Dispatch
        </p>
      </div>

      {/* Packaging Pipeline Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <button
          onClick={() => setPackagingStatusFilter('WAITING_FOR_PACKAGING')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition ${
            packagingStatusFilter === 'WAITING_FOR_PACKAGING'
              ? 'bg-amber-50 border-amber-300 shadow-xs ring-1 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">Waiting</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary?.waiting_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">Orders ready to pick</div>
        </button>

        <button
          onClick={() => setPackagingStatusFilter('PACKAGING_STARTED')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition ${
            packagingStatusFilter === 'PACKAGING_STARTED'
              ? 'bg-brand-50 border-brand-300 shadow-xs ring-1 ring-brand-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-700">In Progress</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary?.in_progress_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">Being packed now</div>
        </button>

        <button
          onClick={() => setPackagingStatusFilter('QUALITY_CHECK')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition ${
            packagingStatusFilter === 'QUALITY_CHECK'
              ? 'bg-purple-50 border-purple-300 shadow-xs ring-1 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-purple-700">Quality Check</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary?.quality_check_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">Awaiting inspection</div>
        </button>

        <button
          onClick={() => setPackagingStatusFilter('PACKED')}
          className={`p-3 sm:p-3.5 rounded-2xl border text-left transition ${
            packagingStatusFilter === 'PACKED'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs ring-1 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Packed</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary?.packed_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">Sealed & weighted</div>
        </button>

        <button
          onClick={() => setPackagingStatusFilter('READY_FOR_DISPATCH')}
          className={`col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl border text-left transition ${
            packagingStatusFilter === 'READY_FOR_DISPATCH'
              ? 'bg-teal-50 border-teal-300 shadow-xs ring-1 ring-teal-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">Ready Dispatch</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
            {summary?.ready_for_dispatch_count || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">Ready for courier pickup</div>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={orders}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search order #, customer, tracking..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No orders found in packaging area"
        filterComponents={
          <div className="flex items-center gap-2">
            <select
              value={packagingStatusFilter}
              onChange={(e) => {
                setPackagingStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Packaging Stages</option>
              <option value="WAITING_FOR_PACKAGING">Waiting for Packaging</option>
              <option value="PACKAGING_STARTED">Packaging Started</option>
              <option value="QUALITY_CHECK">Quality Check</option>
              <option value="PACKED">Packed</option>
              <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
            </select>
          </div>
        }
      />

      {/* Process Packaging Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Process Packaging: Order #${activeOrder?.order_number}`}
        maxWidth="max-w-2xl"
      >
        {orderDetails && (
          <form onSubmit={handlePackagingSubmit} className="space-y-5">
            {/* Products Picklist Verification Box */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-brand-600" />
                Line Items to Pack
              </span>

              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {orderDetails.items?.map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-900">{item.product_name}</span>
                      <span className="text-slate-500 ml-2 font-mono text-[11px]">({item.product_sku})</span>
                    </div>
                    <span className="font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Packaging Workflow Status Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Workflow Stage *
              </label>
              <select
                value={formData.packagingStatus}
                onChange={(e) => setFormData({ ...formData, packagingStatus: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium shadow-xs"
              >
                <option value="WAITING_FOR_PACKAGING">WAITING_FOR_PACKAGING (Pending Pick)</option>
                <option value="PACKAGING_STARTED">PACKAGING_STARTED (Boxing Items)</option>
                <option value="QUALITY_CHECK">QUALITY_CHECK (Under QC Inspection)</option>
                <option value="PACKED">PACKED (Sealed & Verified)</option>
                <option value="READY_FOR_DISPATCH">READY_FOR_DISPATCH (Handover to Courier)</option>
              </select>
            </div>

            {/* Package Details (Boxes, Weight, Dimensions, Materials) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Number of Boxes *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.packageCount}
                  onChange={(e) => setFormData({ ...formData, packageCount: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Total Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Dimensions (L x W x H)
                </label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="30x20x15 cm"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Carrier / Courier Partner
                </label>
                <input
                  type="text"
                  value={formData.carrierName}
                  onChange={(e) => setFormData({ ...formData, carrierName: e.target.value })}
                  placeholder="Delhivery / BlueDart / FedEx"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Tracking / Consignment AWB #
                </label>
                <input
                  type="text"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="AWB123456789"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Store Packaging Remarks
              </label>
              <textarea
                rows={2}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Packaging notes, seal numbers..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-medium text-white shadow-xs disabled:opacity-50 transition"
              >
                {isSaving ? 'Saving Packaging Details...' : 'Save & Update Packaging'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
