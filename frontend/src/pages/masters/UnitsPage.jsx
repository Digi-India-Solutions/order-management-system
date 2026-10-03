import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Ruler, Plus, Edit, Trash2 } from 'lucide-react';

export function UnitsPage() {
  const { success, error } = useNotification();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/masters/units');
      if (res.success) setUnits(res.data);
    } catch (err) {
      error(err.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const openCreateModal = () => {
    setEditingUnit(null);
    setFormData({ name: '', code: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUnit(u);
    setFormData({ name: u.name, code: u.code, description: u.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return error('Name and Code are required.');

    try {
      setIsSaving(true);
      if (editingUnit) {
        await api.put(`/masters/units/${editingUnit.id}`, formData);
        success('Unit updated');
      } else {
        await api.post('/masters/units', formData);
        success('Unit created');
      }
      setIsModalOpen(false);
      fetchUnits();
    } catch (err) {
      error(err.message || 'Failed to save unit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete unit "${u.name}"?`)) return;
    try {
      await api.delete(`/masters/units/${u.id}`);
      success('Unit deleted');
      fetchUnits();
    } catch (err) {
      error(err.message || 'Failed to delete unit');
    }
  };

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => <span className="font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100">{row.code}</span>,
    },
    {
      header: 'Unit Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => <span className="text-xs text-slate-500">{row.description || '-'}</span>,
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
            <Ruler className="w-6 h-6 text-brand-600" />
            Unit Master (UOM)
          </h1>
          <p className="text-xs text-slate-500 mt-1">Units of Measurement (e.g. PCS, KG, BOX, MTR, LTR)</p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      <DataTable columns={columns} data={units} isLoading={loading} emptyMessage="No units defined" />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnit ? `Edit Unit: ${editingUnit.name}` : 'New Unit of Measurement'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Unit Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Pieces / Kilograms"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Short Code *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="PCS, KG, BOX"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
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
              placeholder="Unit notes..."
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
              {isSaving ? 'Saving...' : 'Save Unit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
