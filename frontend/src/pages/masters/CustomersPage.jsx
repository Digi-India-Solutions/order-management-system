import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Users, Plus, Edit, Trash2, Phone, Mail, Building, MapPin, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { EmailOtpVerification } from '../../components/common/EmailOtpVerification';

export function CustomersPage() {
  const { hasPermission, user } = useAuth();
  const { success, error } = useNotification();

  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal & Email OTP Verification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [formData, setFormData] = useState({
    customerCode: '',
    name: '',
    companyName: '',
    email: '',
    phone: '',
    billingAddress: '',
    shippingAddress: '',
    city: '',
    state: '',
    pincode: '',
    assignedSalesPersonId: '',
  });
  const [salesPeople, setSalesPeople] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        page,
        limit,
        search,
        status: statusFilter,
        approvalStatus: approvalStatusFilter || undefined,
      });
      if (res.success) {
        setCustomers(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter, approvalStatusFilter]);

  const handleApproveCustomer = async (id, status) => {
    try {
      const res = await api.put(`/customers/${id}/approve`, { status });
      success(res.message || `Customer ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      fetchCustomers();
    } catch (err) {
      error(err.message || `Failed to ${status.toLowerCase()} customer`);
    }
  };

  useEffect(() => {
    async function loadSalesPeople() {
      try {
        const res = await api.get('/users/sales-reps');
        if (res.success) {
          setSalesPeople(res.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadSalesPeople();
  }, []);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setIsEmailVerified(false);
    setFormData({
      customerCode: '',
      name: '',
      companyName: '',
      email: '',
      phone: '',
      billingAddress: '',
      shippingAddress: '',
      city: '',
      state: '',
      pincode: '',
      assignedSalesPersonId: user?.role === 'sales_person' ? user.id : '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cust) => {
    setEditingCustomer(cust);
    setIsEmailVerified(!!cust.email_verified);
    setFormData({
      customerCode: cust.customer_code,
      name: cust.name,
      companyName: cust.company_name || '',
      email: cust.email || '',
      phone: cust.phone || '',
      billingAddress: cust.billing_address || '',
      shippingAddress: cust.shipping_address || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
      assignedSalesPersonId: cust.assigned_sales_person_id || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      error('Customer Name is mandatory.');
      return;
    }

    if (!formData.companyName || !formData.companyName.trim()) {
      error('Company / Organization is mandatory.');
      return;
    }

    const cleanPhone = (formData.phone || '').trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      error('Phone number must be exactly 10 digits without any alphabets or symbols.');
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      error('Email Address is mandatory.');
      return;
    }

    if (!isEmailVerified) {
      error('Please verify the customer email address with OTP before saving.');
      return;
    }

    if (!formData.assignedSalesPersonId) {
      error('Assigned Sales Rep is mandatory. Please select a sales person.');
      return;
    }

    if (!formData.shippingAddress || !formData.shippingAddress.trim()) {
      error('Shipping / Delivery Address is mandatory.');
      return;
    }

    if (!formData.city || !formData.city.trim()) {
      error('City is mandatory.');
      return;
    }

    if (!formData.state || !formData.state.trim()) {
      error('State is mandatory.');
      return;
    }

    if (!formData.pincode || !formData.pincode.trim()) {
      error('Pincode is mandatory.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        phone: cleanPhone,
        billingAddress: formData.shippingAddress, // Keep billing synced with delivery
      };
      if (editingCustomer) {
        const res = await api.put(`/customers/${editingCustomer.id}`, payload);
        success(res.message || 'Customer updated successfully');
      } else {
        const res = await api.post('/customers', payload);
        success(res.message || 'Customer created successfully');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      error(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cust) => {
    if (!window.confirm(`Are you sure you want to delete ${cust.name}?`)) return;
    try {
      const res = await api.delete(`/customers/${cust.id}`);
      success(res.message || 'Customer deleted');
      fetchCustomers();
    } catch (err) {
      error(err.message || 'Failed to delete customer');
    }
  };

  const columns = [
    {
      header: 'Code',
      accessor: 'customer_code',
      render: (row) => <span className="font-mono font-semibold text-brand-600">{row.customer_code}</span>,
    },
    {
      header: 'Customer Details',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          {row.company_name && <div className="text-xs text-slate-500">{row.company_name}</div>}
        </div>
      ),
    },
    {
      header: 'Contact Info',
      render: (row) => (
        <div className="space-y-0.5 text-xs">
          <div className="text-slate-700 font-mono">{row.phone}</div>
          {row.email && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="truncate max-w-[150px]">{row.email}</span>
              {row.email_verified ? (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  ✓ Verified
                </span>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Unverified
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Location',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {[row.city, row.state].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      header: 'Sales Rep',
      accessor: 'sales_person_name',
      render: (row) => <span className="text-xs text-slate-600">{row.sales_person_name || 'Unassigned'}</span>,
    },
    {
      header: 'Approval',
      accessor: 'approval_status',
      render: (row) => {
        const appStatus = row.approval_status || 'APPROVED';
        if (appStatus === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" /> Pending Admin
            </span>
          );
        }
        if (appStatus === 'REJECTED') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-3 h-3" /> Rejected
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => <Badge variant={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => {
        const isSuperOrAdmin = user?.role === 'super_admin' || user?.role === 'admin';
        const isPending = row.approval_status === 'PENDING';

        return (
          <div className="flex items-center justify-end gap-1.5">
            {isSuperOrAdmin && isPending && (
              <>
                <button
                  onClick={() => handleApproveCustomer(row.id, 'APPROVED')}
                  className="p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 transition"
                  title="Approve Customer (Activate for Orders)"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleApproveCustomer(row.id, 'REJECTED')}
                  className="p-1.5 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 transition"
                  title="Reject Customer"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}

            {hasPermission('customers.update') && (
              <button
                onClick={() => openEditModal(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Edit Customer"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {hasPermission('customers.delete') && (
              <button
                onClick={() => handleDelete(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Delete Customer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            Customer Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain customer database and sales assignments
          </p>
        </div>

        {hasPermission('customers.create') && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        )}
      </div>

      {/* Approval Status Quick Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All Customers', val: '' },
          { label: 'Pending Approval', val: 'PENDING' },
          { label: 'Approved', val: 'APPROVED' },
          { label: 'Rejected', val: 'REJECTED' }
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => {
              setApprovalStatusFilter(tab.val);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              approvalStatusFilter === tab.val
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={customers}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search customer, code, phone, email..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No customers found"
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Create New Customer'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enterprise Ltd / Contact Person"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Company / Organization *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Corporate Entity"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number (10 Digits) *
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={formData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: digits });
                }}
                placeholder="9876543210 (10 digits)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {formData.phone ? `${formData.phone.length}/10 digits (numbers only)` : 'Must be exactly 10 digits'}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address *
                </label>
                {isEmailVerified && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OTP Verified
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setIsEmailVerified(false);
                }}
                placeholder="procurement@company.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              {formData.email && formData.email.trim() && (
                <EmailOtpVerification
                  email={formData.email}
                  name={formData.name || 'Customer'}
                  purpose="CUSTOMER_VERIFICATION"
                  isVerified={isEmailVerified}
                  onVerificationChange={setIsEmailVerified}
                />
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Assigned Sales Rep (Sales Person Only) *
              </label>
              <select
                required
                value={formData.assignedSalesPersonId}
                onChange={(e) => setFormData({ ...formData, assignedSalesPersonId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                <option value="">-- Select Sales Person * --</option>
                {salesPeople
                  .filter((sp) => (sp.role_name === 'sales_person' || sp.role === 'sales_person' || (!sp.role_name && !sp.role)))
                  .map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} ({sp.email})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Shipping / Delivery Address *
            </label>
            <textarea
              required
              rows={2}
              value={formData.shippingAddress}
              onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
              placeholder="Warehouse / Delivery address..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                City *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                State *
              </label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Pincode *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => {
                  const cleanPin = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData({ ...formData, pincode: cleanPin });
                }}
                placeholder="400001"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
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
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-medium text-white shadow-xs disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
