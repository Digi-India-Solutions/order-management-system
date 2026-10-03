import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Receipt, Plus, Edit, Trash2, Percent } from 'lucide-react';

export function TaxesPage() {
  const { success, error } = useNotification();
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [formData, setFormData] = useState({ name: '', rate: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/masters/taxes');
      if (res.success) setTaxes(res.data);
    } catch (err) {
      error(err.message || 'Failed to load tax slabs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const openCreateModal = () => {
    setEditingTax(null);
    setFormData({ name: '', rate: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (t) => {
    setEditingTax(t);
    setFormData({ name: t.name, rate: t.rate, description: t.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.rate === '') return error('Name and Rate are required.');

    try {
      setIsSaving(true);
      if (editingTax) {
        await api.put(`/masters/taxes/${editingTax.id}`, formData);
        success('Tax slab updated');
      } else {
        await api.post('/masters/taxes', formData);
        success('Tax slab created');
      }
      setIsModalOpen(false);
      fetchTaxes();
    } catch (err) {
      error(err.message || 'Failed to save tax slab');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete tax "${t.name}"?`)) return;
    try {
      await api.delete(`/masters/taxes/${t.id}`);
      success('Tax slab deleted');
      fetchTaxes();
    } catch (err) {
      error(err.message || 'Failed to delete tax slab');
    }
  };

  const columns = [
    {
      header: 'Tax Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      header: 'Tax Rate (%)',
      accessor: 'rate',
      render: (row) => (
        <span className="font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">
          {parseFloat(row.rate).toFixed(2)}%
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => <span className="text-xs text-slate-500">{row.description || '-'}</span>,
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-4 h-4" />
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
            <Receipt className="w-6 h-6 text-brand-600" />
            Tax Master (GST Slabs)
          </h1>
          <p className="text-xs text-slate-500 mt-1">Configure GST and sales tax percentages</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Tax Slab
        </button>
      </div>

      <DataTable columns={columns} data={taxes} isLoading={loading} emptyMessage="No tax slabs found" />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTax ? `Edit Tax Slab: ${editingTax.name}` : 'New Tax Slab'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Tax Slab Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. GST 18%"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Percentage Rate (%) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              placeholder="18.00"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Applies to standard manufactured goods..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
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
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-medium text-white shadow-xs disabled:opacity-50 transition"
            >
              {isSaving ? 'Saving...' : 'Save Tax Slab'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
