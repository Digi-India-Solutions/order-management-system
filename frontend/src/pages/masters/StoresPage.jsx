import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Warehouse, Plus, Edit, Trash2, MapPin, Phone, Mail, User } from 'lucide-react';

export function StoresPage() {
  const { success, error } = useNotification();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    phone: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await api.get('/masters/stores');
      if (res.success) setStores(res.data);
    } catch (err) {
      error(err.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const openCreateModal = () => {
    setEditingStore(null);
    setFormData({
      code: '',
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      contactPerson: '',
      phone: '',
      email: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s) => {
    setEditingStore(s);
    setFormData({
      code: s.code,
      name: s.name,
      address: s.address || '',
      city: s.city || '',
      state: s.state || '',
      pincode: s.pincode || '',
      contactPerson: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return error('Store/Warehouse name is required.');

    const cleanPhone = (formData.phone || '').trim().replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      return error('Phone number must be exactly 10 digits (numbers only).');
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        phone: cleanPhone || null,
      };
      if (editingStore) {
        await api.put(`/masters/stores/${editingStore.id}`, payload);
        success('Store updated successfully');
      } else {
        await api.post('/masters/stores', payload);
        success('Store created successfully');
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (err) {
      error(err.message || 'Failed to save store');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete store "${s.name}"?`)) return;
    try {
      await api.delete(`/masters/stores/${s.id}`);
      success('Store deleted');
      fetchStores();
    } catch (err) {
      error(err.message || 'Failed to delete store');
    }
  };

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-brand-600">{row.code}</span>,
    },
    {
      header: 'Warehouse Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          <div className="text-xs text-slate-500">{row.address}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {[row.city, row.state, row.pincode].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      header: 'Contact Details',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-slate-800">{row.contact_person || '-'}</div>
          <div className="text-slate-500 font-mono">{row.phone}</div>
        </div>
      ),
    },
    {
      header: 'Assigned Staff',
      render: (row) => <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{row.staff_count || 0} members</span>,
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => <Badge variant={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => openEditModal(row)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
          >
            <Edit className="w-3.5 h-3.5 text-brand-600" />
            Edit Details
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-brand-600" />
            Central Warehouse & Store
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Single central warehouse and fulfillment hub for all orders and packaging
          </p>
        </div>

        {stores.length === 0 ? (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Setup Warehouse
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Single Warehouse Configured
          </div>
        )}
      </div>

      <DataTable columns={columns} data={stores} isLoading={loading} emptyMessage="No warehouse configured" />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStore ? `Edit Warehouse: ${editingStore.name}` : 'Setup Central Warehouse'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Store Code
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="WH-MUM"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Central Hub Mumbai"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Plot 42, Logistics Park"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Pincode
              </label>
              <input
                type="text"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: digits });
                }}
                placeholder="9876543210"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {formData.phone ? `${formData.phone.length}/10 digits` : 'Optional, 10 digits'}
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
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
              {isSaving ? 'Saving...' : 'Save Warehouse'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
