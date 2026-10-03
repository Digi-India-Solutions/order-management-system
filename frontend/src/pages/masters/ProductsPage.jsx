import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Package, Plus, Edit, Trash2, AlertTriangle, Layers, Tag } from 'lucide-react';

export function ProductsPage() {
  const { user, hasPermission, hasRole } = useAuth();
  const { success, error } = useNotification();

  const canCreate = hasRole(['super_admin', 'store_manager']) || hasPermission('products.create');
  const canUpdate = hasRole(['super_admin', 'store_manager']) || hasPermission('products.update');
  const canDelete = hasRole('super_admin') || hasPermission('products.delete');

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Aux masters for dropdowns
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    categoryId: '',
    unitId: '',
    price: 0,
    stockQuantity: 10,
    minStockAlert: 5,
    description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        page,
        limit,
        search,
        categoryId: categoryFilter,
        lowStock: lowStockFilter ? 'true' : '',
      });
      if (res.success) {
        setProducts(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, categoryFilter, lowStockFilter]);

  useEffect(() => {
    async function loadAux() {
      try {
        const [catRes, unitRes] = await Promise.all([
          api.get('/masters/categories'),
          api.get('/masters/units'),
        ]);
        if (catRes.success) setCategories(catRes.data);
        if (unitRes.success) setUnits(unitRes.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, []);

  const openCreateModal = () => {
    if (!canCreate) {
      error('You do not have permission to add products.');
      return;
    }
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      categoryId: categories[0]?.id || '',
      unitId: units[0]?.id || '',
      price: '',
      stockQuantity: 10,
      minStockAlert: 5,
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    if (!canUpdate) {
      error('You do not have permission to edit products.');
      return;
    }
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      categoryId: prod.category_id || '',
      unitId: prod.unit_id || '',
      price: prod.price,
      stockQuantity: prod.stock_quantity,
      minStockAlert: prod.min_stock_alert,
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.price === '') {
      error('Name and Price are required.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingProduct) {
        const res = await api.put(`/products/${editingProduct.id}`, formData);
        success(res.message || 'Product updated successfully');
      } else {
        const res = await api.post('/products', formData);
        success(res.message || 'Product created successfully');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      error(err.message || 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (prod) => {
    if (!canDelete) {
      error('Only Super Admin can delete products.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete product "${prod.name}"?`)) return;
    try {
      const res = await api.delete(`/products/${prod.id}`);
      success(res.message || 'Product deleted');
      fetchProducts();
    } catch (err) {
      error(err.message || 'Failed to delete product');
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
      header: 'SKU / Code',
      accessor: 'sku',
      render: (row) => <span className="font-mono font-semibold text-brand-600">{row.sku}</span>,
    },
    {
      header: 'Product Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.name}</div>
          {row.description && (
            <div className="text-xs text-slate-500 truncate max-w-xs">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      accessor: 'category_name',
      render: (row) => (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {row.category_name || 'General'}
        </span>
      ),
    },
    {
      header: 'Price (₹)',
      accessor: 'price',
      render: (row) => <span className="font-mono font-bold text-slate-900">{formatCurrency(row.price)}</span>,
    },
    {
      header: 'Stock Level',
      render: (row) => {
        const isLow = row.stock_quantity <= row.min_stock_alert;
        return (
          <div className="flex items-center gap-1.5 font-mono">
            <span className={`font-semibold ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
              {row.stock_quantity} {row.unit_code || 'PCS'}
            </span>
            {isLow && (
              <span title="Low stock threshold reached" className="text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        );
      },
    },
    ...((canUpdate || canDelete)
      ? [
          {
            header: 'Actions',
            className: 'text-right',
            render: (row) => (
              <div className="flex items-center justify-end gap-1.5">
                {canUpdate && (
                  <button
                    onClick={() => openEditModal(row)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Edit Product"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => handleDelete(row)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Product Master
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Product catalog, inventory stock alerts, and catalog pricing
          </p>
        </div>

        {canCreate && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={products}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search product SKU, name..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No products found"
        filterComponents={
          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setLowStockFilter(!lowStockFilter);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                lowStockFilter
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-xs'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock Only
            </button>
          </div>
        }
      />

      {/* Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Add New Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Product SKU / Code
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Auto-generated if left empty"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Product title"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Unit of Measure
              </label>
              <select
                value={formData.unitId}
                onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                <option value="">-- Select Unit --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Base Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Min Stock Alert Level
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockAlert}
                onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Description / Specifications
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Technical specs, grade, dimensions..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
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
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

