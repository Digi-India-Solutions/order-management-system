import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ShieldCheck, Check, Save, Info, AlertTriangle, Users, Search, RotateCcw, Sliders } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export function RolesPermissionsPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const { success, error } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: 'roles' (Role Default Matrix) or 'users' (Individual Person Overrides)
  const initialMode = searchParams.get('mode') === 'users' ? 'users' : 'roles';
  const initialUserId = searchParams.get('userId');
  const [viewMode, setViewMode] = useState(initialMode);

  // Common data
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Role Matrix State
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermIds, setRolePermIds] = useState(new Set());

  // User Matrix State
  const [usersList, setUsersList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userPermIds, setUserPermIds] = useState(new Set());
  const [userPermMeta, setUserPermMeta] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

  // Filter inside the permission matrix
  const [permSearch, setPermSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes, usersRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
        api.get('/users?limit=100'),
      ]);

      if (rolesRes.success && permsRes.success) {
        setRoles(rolesRes.data);
        setPermissions(permsRes.data);
        if (rolesRes.data.length > 0) {
          selectRole(rolesRes.data[0]);
        }
      }

      if (usersRes.success && usersRes.data) {
        setUsersList(usersRes.data);
        if (initialUserId) {
          const found = usersRes.data.find((u) => String(u.id) === String(initialUserId));
          if (found) {
            selectUser(found);
            setViewMode('users');
          } else if (usersRes.data.length > 0) {
            selectUser(usersRes.data[0]);
          }
        } else if (usersRes.data.length > 0) {
          selectUser(usersRes.data[0]);
        }
      }
    } catch (err) {
      error(err.message || 'Failed to load roles and permissions matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectRole = (role) => {
    setSelectedRole(role);
    const permIds = new Set(role.permissions?.map((p) => p.id) || []);
    setRolePermIds(permIds);
  };

  const selectUser = async (u) => {
    setSelectedUser(u);
    try {
      setUserLoading(true);
      const res = await api.get(`/users/${u.id}/permissions`);
      if (res.success) {
        setUserPermMeta(res.data);
        setUserPermIds(new Set(res.data.effectivePermissionIds || []));
      }
    } catch (err) {
      error(err.message || 'Failed to fetch user permissions');
    } finally {
      setUserLoading(false);
    }
  };

  // Toggle permission for role
  const toggleRolePermission = (permId) => {
    if (selectedRole?.name === 'super_admin') return;
    setRolePermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  // Toggle permission for individual user
  const toggleUserPermission = (permId) => {
    if (selectedUser?.role_name === 'super_admin') return;
    setUserPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  // Toggle all permissions in a module
  const toggleAllInModule = (perms, check) => {
    if (viewMode === 'roles') {
      if (selectedRole?.name === 'super_admin') return;
      setRolePermIds((prev) => {
        const next = new Set(prev);
        perms.forEach((p) => (check ? next.add(p.id) : next.delete(p.id)));
        return next;
      });
    } else {
      if (selectedUser?.role_name === 'super_admin') return;
      setUserPermIds((prev) => {
        const next = new Set(prev);
        perms.forEach((p) => (check ? next.add(p.id) : next.delete(p.id)));
        return next;
      });
    }
  };

  // Save role permissions
  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    if (selectedRole.name === 'super_admin') {
      error('Super Admin role always possesses unrestricted access.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissionIds: Array.from(rolePermIds),
      });
      success(res.message || 'Role permissions updated successfully!');
      await fetchData();
      await refreshUser();
    } catch (err) {
      error(err.message || 'Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  // Save individual user permissions
  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    if (selectedUser.role_name === 'super_admin') {
      error('Super Admin always possesses unrestricted access.');
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(`/users/${selectedUser.id}/permissions`, {
        permissionIds: Array.from(userPermIds),
      });
      success(res.message || `Custom permissions saved for ${selectedUser.name}!`);
      // Update local user state
      setUsersList((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, has_custom_permissions: true } : u))
      );
      await selectUser(selectedUser);
      await refreshUser();
    } catch (err) {
      error(err.message || 'Failed to update user permissions');
    } finally {
      setSaving(false);
    }
  };

  // Reset user permissions to role defaults
  const handleResetUserToRole = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      const res = await api.put(`/users/${selectedUser.id}/permissions`, {
        resetToRole: true,
      });
      success(res.message || `Permissions reset to role defaults for ${selectedUser.name}!`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, has_custom_permissions: false } : u))
      );
      await selectUser(selectedUser);
      await refreshUser();
    } catch (err) {
      error(err.message || 'Failed to reset user permissions');
    } finally {
      setSaving(false);
    }
  };

  // Filtered permissions list
  const activePermIds = viewMode === 'roles' ? rolePermIds : userPermIds;
  const filteredPermissions = permissions.filter((p) => {
    if (!permSearch.trim()) return true;
    const q = permSearch.toLowerCase();
    return (
      p.code?.toLowerCase().includes(q) ||
      p.module?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  // Group permissions by module
  const groupedPermissions = filteredPermissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  // Filtered users list
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      !userSearch.trim() ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !userRoleFilter || u.role_name === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 animate-pulse">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading permissions matrix...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            Roles & Permissions Matrix (RBAC & PBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure default permissions per Role or assign customized permission sets to individual persons
          </p>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-2xl shadow-xs w-full sm:w-auto">
          <button
            onClick={() => {
              setViewMode('roles');
              setSearchParams({ mode: 'roles' });
            }}
            className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewMode === 'roles'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Role Default Matrix
          </button>
          <button
            onClick={() => {
              setViewMode('users');
              setSearchParams({ mode: 'users' });
            }}
            className={`flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewMode === 'users'
                ? 'bg-white text-brand-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Individual Person Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: ROLES OR USERS SELECTION */}
        <div className="space-y-3">
          {viewMode === 'roles' ? (
            /* Roles Selector */
            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
                System Roles ({roles.length})
              </span>
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => selectRole(r)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-brand-50/70 border-brand-300 shadow-xs ring-1 ring-brand-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 text-sm">{r.display_name}</div>
                      <Badge variant={r.name} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>{r.user_count || 0} active users</span>
                      <span className="text-brand-600 font-semibold">
                        {r.name === 'super_admin' ? 'All (Bypass)' : `${r.permissions?.length || 0} perms`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Users Selector (with search & role filter) */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Users ({filteredUsers.length})
                </span>
                <span className="text-[11px] text-brand-600 font-semibold">Individual Overrides</span>
              </div>

              {/* Search User */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search user by name or email..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                />
              </div>

              {/* Role filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
              >
                <option value="">All Roles</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.display_name}
                  </option>
                ))}
              </select>

              {/* Users list */}
              <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">No users found.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => selectUser(u)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-brand-50/70 border-brand-300 shadow-xs ring-1 ring-brand-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="font-semibold text-slate-900 text-xs truncate">{u.name}</div>
                          <Badge variant={u.role_name} size="sm">
                            {u.role_name}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{u.email}</div>

                        <div className="mt-2 flex items-center justify-between text-[10px]">
                          {u.has_custom_permissions ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <ShieldCheck className="w-3 h-3" /> Custom Matrix
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium">Role Defaults</span>
                          )}
                          <span className="text-slate-500">{u.store_name || 'All'}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PERMISSIONS MATRIX */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              {viewMode === 'roles' ? (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Role Permissions: <span className="text-brand-600">{selectedRole?.display_name}</span>
                    </h3>
                    <Badge variant={selectedRole?.name} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{selectedRole?.name}</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Custom Permissions: <span className="text-brand-600">{selectedUser?.name}</span>
                    </h3>
                    <Badge variant={selectedUser?.role_name} size="sm">
                      {selectedUser?.role_display_name || selectedUser?.role_name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-mono">{selectedUser?.email}</span>
                    <span className="text-slate-300">•</span>
                    {userPermMeta?.hasCustomPermissions ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Custom Overrides Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inherited from Role
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Actions for Header */}
            <div className="flex items-center gap-2">
              {viewMode === 'users' && userPermMeta?.hasCustomPermissions && (
                <button
                  type="button"
                  onClick={handleResetUserToRole}
                  disabled={saving || userLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 transition disabled:opacity-50 shadow-xs"
                  title="Remove individual overrides and revert to Role defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Reset to Role Default
                </button>
              )}

              {currentUser?.role === 'super_admin' && (
                <button
                  onClick={viewMode === 'roles' ? handleSaveRolePermissions : handleSaveUserPermissions}
                  disabled={
                    saving ||
                    userLoading ||
                    (viewMode === 'roles' && selectedRole?.name === 'super_admin') ||
                    (viewMode === 'users' && selectedUser?.role_name === 'super_admin')
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-xs disabled:opacity-50 transition"
                >
                  <Save className="w-4 h-4" />
                  {saving
                    ? 'Saving...'
                    : viewMode === 'roles'
                    ? 'Save Role Permissions'
                    : `Save Individual Permissions (${userPermIds.size})`}
                </button>
              )}
            </div>
          </div>

          {/* Super Admin Notice */}
          {((viewMode === 'roles' && selectedRole?.name === 'super_admin') ||
            (viewMode === 'users' && selectedUser?.role_name === 'super_admin')) && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
              Super Admin role always possesses unrestricted access across all modules in the OMS system.
            </div>
          )}

          {/* Search permissions filter */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Search permissions by code or description (e.g. orders.create, export, delete)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            />
          </div>

          {/* Grouped Modules */}
          {userLoading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading user permissions...
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                const isSuperAdmin =
                  (viewMode === 'roles' && selectedRole?.name === 'super_admin') ||
                  (viewMode === 'users' && selectedUser?.role_name === 'super_admin');
                const selectedCount = perms.filter((p) => isSuperAdmin || activePermIds.has(p.id)).length;
                const isAllSelected = selectedCount === perms.length;

                return (
                  <div key={moduleName} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {moduleName} MODULE
                        </span>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {selectedCount} / {perms.length} granted
                        </span>
                      </div>

                      {!isSuperAdmin && currentUser?.role === 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => toggleAllInModule(perms, !isAllSelected)}
                          className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 transition"
                        >
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {perms.map((p) => {
                        const isChecked = isSuperAdmin || activePermIds.has(p.id);
                        const isDisabled = isSuperAdmin || currentUser?.role !== 'super_admin';

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isDisabled) return;
                              if (viewMode === 'roles') toggleRolePermission(p.id);
                              else toggleUserPermission(p.id);
                            }}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                              isChecked
                                ? 'bg-brand-50/60 border-brand-300 text-slate-900'
                                : 'bg-slate-50/40 border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-white'
                            } ${isDisabled ? 'cursor-default opacity-85' : ''}`}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition ${
                                isChecked
                                  ? 'bg-brand-600 border-brand-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-semibold font-mono text-slate-800 truncate">{p.code}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{p.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
