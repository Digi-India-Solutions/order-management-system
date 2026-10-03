import React from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';

export function DataTable({
  columns,
  data = [],
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filterComponents,
  actionButton,
  isLoading = false,
  emptyMessage = 'No records found'
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
      {/* Top Bar: Search, Filters, Actions */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between bg-white">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
          {onSearchChange && (
            <div className="relative w-full sm:w-auto sm:min-w-[240px] sm:max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
              />
            </div>
          )}
          {filterComponents && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {filterComponents}
            </div>
          )}
        </div>

        {actionButton && <div className="self-end sm:self-auto">{actionButton}</div>}
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm text-slate-700 min-w-full">
          <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200/80">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 sm:px-5 py-3 sm:py-3.5 whitespace-nowrap ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
                    <span className="text-xs font-medium">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
                      <Inbox className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-4 sm:px-5 py-3 sm:py-3.5 text-xs text-slate-700 ${col.className || ''}`}>
                      {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {total > 0 && onPageChange && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-white flex flex-col sm:flex-row gap-2.5 items-center justify-between text-xs text-slate-500">
          <div className="text-center sm:text-left">
            Showing <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-semibold text-slate-800">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-slate-800">{total}</span> entries
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-medium text-slate-700 px-2 font-mono">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
