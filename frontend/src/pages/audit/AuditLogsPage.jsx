import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { DataTable } from '../../components/common/DataTable';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { History, ShieldAlert, Eye, Terminal } from 'lucide-react';

export function AuditLogsPage() {
  const { error } = useNotification();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Inspector modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-logs', {
        page,
        limit,
        search,
        module: moduleFilter,
        action: actionFilter,
      });
      if (res.success) {
        setLogs(res.data);
        setTotal(res.meta?.total || 0);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };
  console.log('logs:', logs);

  useEffect(() => {
    fetchLogs();
  }, [page, search, moduleFilter, actionFilter]);

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'created_at',
      render: (row) => (
        <span className="font-mono text-slate-500 text-xs">
          {new Date(row.created_at).toLocaleString('en-GB')}
        </span>
      ),
    },
    {
      header: 'User & Role',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.user_name || 'System'}</div>
          <div className="text-[11px] text-slate-500 font-mono capitalize">{row.role || 'System'}</div>
        </div>
      ),
    },
    {
      header: 'Module',
      accessor: 'module',
      render: (row) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          {row.module}
        </span>
      ),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => (
        <Badge
          variant={
            row.action.includes('CREATE')
              ? 'CONFIRMED'
              : row.action.includes('DELETE')
              ? 'CANCELLED'
              : row.action.includes('STATUS')
              ? 'PACKAGING'
              : 'DRAFT'
          }
          size="sm"
        >
          {row.action}
        </Badge>
      ),
    },
    {
      header: 'Details',
      className: 'text-right',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title="Inspect Payload"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-brand-600" />
          Security Audit Logs & Activity Trail
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Immutable event log of data changes, access events, and status updates
        </p>
      </div>

      <DataTable
        columns={columns}
        data={logs}
        total={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        searchPlaceholder="Search user, module, action..."
        searchValue={search}
        onSearchChange={setSearch}
        isLoading={loading}
        emptyMessage="No audit logs recorded matching filter"
        filterComponents={
          <div className="flex items-center gap-2">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-xs"
            >
              <option value="">All Modules</option>
              <option value="AUTH">AUTH</option>
              <option value="ORDERS">ORDERS</option>
              <option value="PACKAGING">PACKAGING</option>
              <option value="CUSTOMERS">CUSTOMERS</option>
              <option value="PRODUCTS">PRODUCTS</option>
              <option value="USERS">USERS</option>
              <option value="MASTERS">MASTERS</option>
            </select>
          </div>
        }
      />

      {/* Inspector Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Event Deep Inspection"
        maxWidth="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Event Timestamp:</span>
                <span className="text-slate-900 font-medium">{new Date(selectedLog.created_at).toLocaleString('en-GB')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Operator:</span>
                <span className="text-slate-900 font-medium">{selectedLog.user_name} ({selectedLog.role})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px] mb-0.5">Action / Target:</span>
                <span className="text-brand-600 font-bold">{selectedLog.action} on {selectedLog.module}</span>
              </div>
            </div>

            {selectedLog.old_values && (
              <div>
                <span className="text-slate-700 font-bold block mb-1">Previous Values:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-amber-300 border border-slate-800 overflow-x-auto text-xs">
                  {JSON.stringify(selectedLog.old_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_values && (
              <div>
                <span className="text-slate-700 font-bold block mb-1">New / Updated Values:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 border border-slate-800 overflow-x-auto text-xs">
                  {JSON.stringify(selectedLog.new_values, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.user_agent && (
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                <span>Client Environment: {selectedLog.user_agent}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
