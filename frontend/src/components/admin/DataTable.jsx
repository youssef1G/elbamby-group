import { useLocale } from '@/context/LocaleContext.jsx';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage,
  emptyAction,
  sortKey,
  sortDir,
  onSort,
  rowKey = 'id',
}) {
  const { t } = useLocale();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-bg-border overflow-x-auto bg-bg-surface">
        <table className="w-full">
          <thead className="bg-bg-surface-sunken/50">
            <tr>
              {columns.map((col) => (
                <th key={col.key || col.label} className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary whitespace-nowrap text-start">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-bg-border">
                {columns.map((col) => (
                  <td key={col.key || col.label} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-bg-surface border border-bg-border rounded-lg p-8">
        <EmptyState
          message={emptyMessage || t('admin:common.noResults')}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-bg-border overflow-hidden bg-bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-bg-surface-sunken/50">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortKey && onSort;
                const isActive = isSortable && sortKey === col.sortKey;
                return (
                  <th
                    key={col.key || col.label}
                    className={`px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary whitespace-nowrap text-start ${isSortable ? 'cursor-pointer select-none hover:text-bg-text-primary' : ''} transition-colors`}
                    onClick={isSortable ? () => onSort(col.sortKey) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        isActive
                          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className="opacity-30" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={row[rowKey] || ri} className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key || col.sortKey} className="px-4 py-3 text-body-sm text-bg-text-primary whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}