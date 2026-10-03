import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  ShieldCheck,
  Building,
  UserCheck,
  Lock,
  Mail,
  Phone,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Check,
  RotateCcw,
  Search,
  Sliders
} from 'lucide-react';
import { EmailOtpVerification } from '../../components/common/EmailOtpVerification';

export function UsersListPage() {
  const { user: currentUser, hasPermission, hasRole } = useAuth();
  const { success, error } = useNotification();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Aux
  const [roles, setRoles] = useState([]);
  const [stores, setStores] = useState([]);

  // Create / Edit Modal & Email OTP Verification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    storeId: '',
    isActive: true,
  });

  // Reset Password Modal
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Individual User Permissions Matrix Modal
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [targetPermUser, setTargetPermUser] = useState(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [permData, setPermData] = useState(null);
  const [selectedPermIds, setSelectedPermIds] = useState(new Set());

  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        page,
        limit,
        search,
        roleId: roleFilter,
        status: statusFilter,
        approvalStatus: approvalFilter,
      });
      if (res.success) {
        setUsers(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter, approvalFilter]);

  const handleApprove = async (u) => {
    try {
      const res = await api.put(`/users/${u.id}/approve`);
      success(res.message || `User "${u.name}" has been verified & approved!`);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to approve user');
    }
  };

  const handleReject = async (u) => {
    if (!window.confirm(`Are you sure you want to reject registration for "${u.name}"?`)) return;
    try {
      const res = await api.put(`/users/${u.id}/reject`, { reason: 'Rejected by administrator' });
      success(res.message || `User "${u.name}" registration rejected.`);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to reject user');
    }
  };

  // Open User Permissions Matrix Modal
  const openPermissionsModal = async (u) => {
    try {
      setTargetPermUser(u);
      setIsPermModalOpen(true);
      setPermLoading(true);
      setPermSearch('');
      const res = await api.get(`/users/${u.id}/permissions`);
      if (res.success) {
        setPermData(res.data);
        setSelectedPermIds(new Set(res.data.effectivePermissionIds || []));
      }
    } catch (err) {
      error(err.message || 'Failed to load user permissions');
      setIsPermModalOpen(false);
    } finally {
      setPermLoading(false);
    }
  };

  const toggleUserPerm = (pId) => {
    if (targetPermUser?.role_name === 'super_admin') return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(pId)) next.delete(pId);
      else next.add(pId);
      return next;
    });
  };

  const toggleAllInModule = (modulePerms, check) => {
    if (targetPermUser?.role_name === 'super_admin') return;
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      modulePerms.forEach((p) => {
        if (check) next.add(p.id);
        else next.delete(p.id);
      });
      return next;
    });
  };

  const handleSaveUserPermissions = async () => {
    if (!targetPermUser) return;
    try {
      setPermSaving(true);
      const res = await api.put(`/users/${targetPermUser.id}/permissions`, {
        permissionIds: Array.from(selectedPermIds),
      });
      success(res.message || 'Individual permissions saved successfully!');
      setIsPermModalOpen(false);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to update user permissions');
    } finally {
      setPermSaving(false);
    }
  };

  const handleResetToRole = async () => {
    if (!targetPermUser) return;
    try {
      setPermSaving(true);
      const res = await api.put(`/users/${targetPermUser.id}/permissions`, {
        resetToRole: true,
      });
      success(res.message || 'Reset to role default permissions successfully!');
      const pRes = await api.get(`/users/${targetPermUser.id}/permissions`);
      if (pRes.success) {
        setPermData(pRes.data);
        setSelectedPermIds(new Set(pRes.data.effectivePermissionIds || []));
      }
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to reset user permissions');
    } finally {
      setPermSaving(false);
    }
  };

  useEffect(() => {
    async function loadAux() {
      try {
        const [rolesRes, storesRes] = await Promise.all([
          api.get('/roles'),
          api.get('/masters/stores'),
        ]);
        if (rolesRes.success) setRoles(rolesRes.data);
        if (storesRes.success) setStores(storesRes.data);
      } catch (err) {
        console.error(err);
      }
    }
    loadAux();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setIsEmailVerified(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      roleId: roles.find((r) => r.name === 'sales_person')?.id || roles[0]?.id || '',
      storeId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setIsEmailVerified(true);
    setFormData({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      roleId: u.role_id,
      storeId: u.store_id || '',
      isActive: u.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.roleId) {
      error('Name, email, and role are required.');
      return;
    }

    if (!editingUser && !formData.password) {
      error('Password is required for new users.');
      return;
    }

    if (!editingUser && !isEmailVerified) {
      error('Please verify the user email with OTP before creating the account.');
      return;
    }

    const cleanPhone = (formData.phone || '').trim().replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      error('Phone number must be exactly 10 digits (numbers only).');
      return;
    }

    try {
      setIsSaving(true);
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          name: formData.name,
          phone: cleanPhone || null,
          roleId: parseInt(formData.roleId, 10),
          storeId: formData.storeId ? parseInt(formData.storeId, 10) : null,
          isActive: formData.isActive,
        });
        success('User updated successfully');
      } else {
        await api.post('/users', {
          name: formData.name,
          email: formData.email,
          phone: cleanPhone || null,
          password: formData.password,
          roleId: parseInt(formData.roleId, 10),
          storeId: formData.storeId ? parseInt(formData.storeId, 10) : null,
          isActive: formData.isActive,
        });
        success('User created successfully');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to save user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSaving(true);
      await api.post(`/users/${resetTargetUser.id}/reset-password`, { newPassword });
      success(`Password reset for ${resetTargetUser.name}`);
      setIsResetModalOpen(false);
      setNewPassword('');
    } catch (err) {
      error(err.message || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendVerification = async (u) => {
    try {
      const res = await api.post(`/users/${u.id}/resend-verification`);
      if (res.data?.devVerificationUrl && navigator.clipboard) {
        await navigator.clipboard.writeText(res.data.devVerificationUrl);
        success(`Verification link sent! Link copied to clipboard.`);
      } else {
        success(res.message || `Verification link sent to ${u.email}`);
      }
    } catch (err) {
      error(err.message || 'Failed to send verification link');
    }
  };

  const handleDelete = async (u) => {
    if (u.role_name === 'super_admin') {
      error('Super Admin accounts cannot be deleted.');
      return;
    }
    if (u.id === currentUser?.id) {
      error('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete user "${u.name}" (${u.email})? This action cannot be undone.`)) return;
    try {
      const res = await api.delete(`/users/${u.id}`);
      success(res.message || `User "${u.name}" has been permanently deleted.`);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      header: 'User',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 flex items-center gap-2">
            {row.name}
            {row.id === currentUser?.id && (
              <span className="text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded border border-brand-200 font-semibold">
                You
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 font-mono">{row.email}</div>
        </div>
      ),
    },
    {
      header: 'Role & Permissions',
      render: (row) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant={row.role_name} size="sm">
            {row.role_display_name || row.role_name}
          </Badge>
          {row.has_custom_permissions ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" /> Custom Matrix
            </span>
          ) : (
            <span className="text-[10px] text-slate-400">Role Defaults</span>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Store',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.store_name ? `${row.store_name}` : 'Corporate / All'}
        </span>
      ),
    },
    {
      header: 'Phone',
      accessor: 'phone',
      render: (row) => <span className="font-mono text-xs text-slate-600">{row.phone || '-'}</span>,
    },
    {
      header: 'Email Verified',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.email_verified ? 'verified' : 'unverified'} size="sm">
            {row.email_verified ? 'Verified' : 'Unverified'}
          </Badge>
          {!row.email_verified && (
            <button
              onClick={() => handleResendVerification(row)}
              className="p-1 rounded text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition"
              title="Resend Verification Link Email"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => <Badge variant={row.is_active ? 'active' : 'inactive'} size="sm" />,
    },
    {
      header: 'Approval',
      render: (row) => (
        <Badge
          variant={
            row.approval_status === 'APPROVED'
              ? 'approved'
              : row.approval_status === 'PENDING'
              ? 'pending_approval'
              : 'rejected'
          }
          size="sm"
        >
          {row.approval_status === 'APPROVED'
            ? 'Approved'
            : row.approval_status === 'PENDING'
            ? 'Pending'
            : 'Rejected'}
        </Badge>
      ),
    },
    {
      header: 'Last Login',
      render: (row) => (
        <span className="text-[11px] text-slate-500 font-mono">
          {row.last_login ? new Date(row.last_login).toLocaleDateString('en-GB') : 'Never'}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => {
        // Protection: Admin cannot modify Super Admin
        const isSuperAdminTarget = row.role_name === 'super_admin';
        const canModify = currentUser?.role === 'super_admin' || !isSuperAdminTarget;
        const isPending = row.approval_status === 'PENDING';
        const canApprove = ['super_admin', 'admin'].includes(currentUser?.role);

        return (
          <div className="flex items-center justify-end gap-1.5">
            {isPending && canApprove && (
              <>
                <button
                  onClick={() => handleApprove(row)}
                  className="p-1.5 rounded-lg text-emerald-600 hover:text-white hover:bg-emerald-600 transition"
                  title="Verify & Approve User"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleReject(row)}
                  className="p-1.5 rounded-lg text-rose-600 hover:text-white hover:bg-rose-600 transition"
                  title="Reject Registration"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}

            {currentUser?.role === 'super_admin' && (
              <button
                onClick={() => openPermissionsModal(row)}
                className={`p-1.5 rounded-lg transition ${
                  row.has_custom_permissions
                    ? 'text-emerald-600 hover:text-white hover:bg-emerald-600'
                    : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
                }`}
                title={`Manage Custom Permissions Matrix for ${row.name}`}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            {canModify && hasPermission('users.update') && (
              <>
                <button
                  onClick={() => openEditModal(row)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  title="Edit User"
                >
                  <Edit className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setResetTargetUser(row);
                    setNewPassword('');
                    setIsResetModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                  title="Reset Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </>
            )}

            {canModify && hasPermission('users.delete') && row.id !== currentUser?.id && (
              <button
                onClick={() => handleDelete(row)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Permanently Delete User"
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
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            System accounts, role-based authorizations, and store assignments
          </p>
        </div>

        {hasPermission('users.create') && (
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search user name, email, phone..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No users found"
        filterComponents={
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Active Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={approvalFilter}
              onChange={(e) => {
                setApprovalFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Approvals</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        }
      />

      {/* User Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="User name"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Email Address *
                </label>
                {isEmailVerified && !editingUser && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> OTP Verified
                  </span>
                )}
              </div>
              <input
                type="email"
                required
                disabled={!!editingUser}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setIsEmailVerified(false);
                }}
                placeholder="user@oms.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 disabled:opacity-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              {!editingUser && formData.email && formData.email.trim() && (
                <EmailOtpVerification
                  email={formData.email}
                  name={formData.name || 'User'}
                  purpose="USER_VERIFICATION"
                  isVerified={isEmailVerified}
                  onVerificationChange={setIsEmailVerified}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Phone Number (10 Digits)
              </label>
              <input
                type="tel"
                maxLength={10}
                value={formData.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setFormData({ ...formData, phone: digits });
                }}
                placeholder="9800000000 (10 digits)"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {formData.phone ? `${formData.phone.length}/10 digits (numbers only)` : 'Optional, exactly 10 digits if provided'}
              </span>
            </div>

            {!editingUser && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                System Role *
              </label>
              <select
                required
                value={formData.roleId}
                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                {roles
                  .filter((r) => currentUser?.role === 'super_admin' || r.name !== 'super_admin')
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                Assigned Store / Hub
              </label>
              <select
                value={formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                <option value="">-- Corporate / All Stores --</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="userIsActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 bg-white border-slate-300"
            />
            <label htmlFor="userIsActive" className="text-xs font-medium text-slate-700 cursor-pointer">
              Account Active & Authorized to login
            </label>
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
              {isSaving ? 'Saving...' : 'Save User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Reset Password Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={`Reset Password for ${resetTargetUser?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-medium text-white disabled:opacity-50 transition shadow-xs"
            >
              {isSaving ? 'Resetting...' : 'Set New Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Individual User Permissions Matrix Modal */}
      <Modal
        isOpen={isPermModalOpen}
        onClose={() => setIsPermModalOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span>Individual Permissions: {targetPermUser?.name}</span>
          </div>
        }
        maxWidth="max-w-4xl"
      >
        {permLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading permissions matrix for {targetPermUser?.name}...
          </div>
        ) : (
          <div className="space-y-5">
            {/* User Meta Card & Override Status */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">{targetPermUser?.name}</span>
                  <Badge variant={targetPermUser?.role_name} size="sm">
                    {targetPermUser?.role_display_name || targetPermUser?.role_name}
                  </Badge>
                  {targetPermUser?.store_name && (
                    <span className="text-xs text-slate-500">({targetPermUser?.store_name})</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">{targetPermUser?.email}</div>
              </div>

              <div className="flex items-center gap-2">
                {permData?.hasCustomPermissions ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Custom Matrix Active
                    </span>
                    <button
                      type="button"
                      onClick={handleResetToRole}
                      disabled={permSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 transition disabled:opacity-50 shadow-xs"
                      title="Discard individual overrides and revert to Role defaults"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      Reset to Role Default
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    Inherited from Role ({targetPermUser?.role_display_name || targetPermUser?.role_name})
                  </span>
                )}
              </div>
            </div>

            {/* Notice */}
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-800 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-brand-600" />
              <div>
                Here you can customize specific permissions for <strong>{targetPermUser?.name}</strong> even though their role is <em>{targetPermUser?.role_display_name || targetPermUser?.role_name}</em>. Any changes saved here apply strictly to this user.
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="Search permissions by code, module, or description (e.g. orders.create, report)..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              />
            </div>

            {/* Modules Grid */}
            <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {(() => {
                const allPerms = permData?.allPermissions || [];
                const filtered = allPerms.filter((p) => {
                  if (!permSearch.trim()) return true;
                  const q = permSearch.toLowerCase();
                  return (
                    p.code?.toLowerCase().includes(q) ||
                    p.module?.toLowerCase().includes(q) ||
                    p.description?.toLowerCase().includes(q)
                  );
                });

                // Group by module
                const grouped = filtered.reduce((acc, p) => {
                  if (!acc[p.module]) acc[p.module] = [];
                  acc[p.module].push(p);
                  return acc;
                }, {});

                if (Object.keys(grouped).length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No permissions match your search query "{permSearch}".
                    </div>
                  );
                }

                return Object.entries(grouped).map(([moduleName, perms]) => {
                  const selectedCount = perms.filter((p) => selectedPermIds.has(p.id)).length;
                  const isAllSelected = selectedCount === perms.length;

                  return (
                    <div key={moduleName} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {moduleName}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {selectedCount} / {perms.length} granted
                          </span>
                        </div>

                        {targetPermUser?.role_name !== 'super_admin' && (
                          <button
                            type="button"
                            onClick={() => toggleAllInModule(perms, !isAllSelected)}
                            className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition"
                          >
                            {isAllSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {perms.map((p) => {
                          const isChecked = targetPermUser?.role_name === 'super_admin' || selectedPermIds.has(p.id);
                          const isDisabled = targetPermUser?.role_name === 'super_admin';

                          return (
                            <div
                              key={p.id}
                              onClick={() => !isDisabled && toggleUserPerm(p.id)}
                              className={`flex items-start gap-3 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-brand-50/60 border-brand-300 text-slate-900'
                                  : 'bg-slate-50/50 border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-white'
                              } ${isDisabled ? 'opacity-80 cursor-default' : ''}`}
                            >
                              <div
                                className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition ${
                                  isChecked
                                    ? 'bg-brand-600 border-brand-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-mono font-semibold text-slate-800 truncate">
                                  {p.code}
                                </div>
                                <div className="text-[11px] text-slate-500 leading-tight">
                                  {p.description}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500">
                Total Granted: <strong className="text-brand-600 font-mono">{selectedPermIds.size}</strong> permissions
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  disabled={permSaving || targetPermUser?.role_name === 'super_admin'}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-xs font-medium text-white shadow-xs disabled:opacity-50 transition"
                >
                  {permSaving ? 'Saving Matrix...' : `Save Custom Permissions (${selectedPermIds.size})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
