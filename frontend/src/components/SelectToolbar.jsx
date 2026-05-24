import { CheckSquare, Square, X, Trash2, RotateCcw } from 'lucide-react';

export default function SelectToolbar({
  files,
  selectMode,
  selectedIds,
  allSelected,
  someSelected,
  onToggleSelectMode,
  onToggleSelectAll,
  // Pass only what's needed per page
  onBulkDelete,
  onBulkRestore,   // only for TrashPage
  actionLoading,
}) {
  if (!files.length) return null;

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '5px 14px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s ease',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

      {/* Select / Cancel toggle */}
      <button
        onClick={onToggleSelectMode}
        style={{
          ...btnBase,
          border: selectMode ? '1px solid #e11d48' : '1px solid #27272a',
          background: selectMode ? 'rgba(225,29,72,0.1)' : 'transparent',
          color: selectMode ? '#f43f5e' : '#71717a',
        }}
      >
        {selectMode ? <X size={13} /> : <CheckSquare size={13} />}
        {selectMode ? 'Cancel' : 'Select'}
      </button>

      {selectMode && (
        <>
          {/* Select All / Deselect All */}
          <button
            onClick={onToggleSelectAll}
            style={{
              ...btnBase,
              border: '1px solid #27272a',
              background: 'transparent',
              color: '#a1a1aa',
            }}
          >
            {allSelected
              ? <CheckSquare size={13} color="#e11d48" />
              : <Square size={13} />}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>

          {someSelected && (
            <>
              <span style={{ fontSize: '12px', color: '#71717a' }}>
                {selectedIds.length} selected
              </span>

              {/* Restore — only shown in TrashPage */}
              {onBulkRestore && (
                <button
                  onClick={onBulkRestore}
                  disabled={!!actionLoading}
                  style={{
                    ...btnBase,
                    border: '1px solid #27272a',
                    background: 'transparent',
                    color: '#4ade80',
                  }}
                >
                  <RotateCcw size={13} /> Restore
                </button>
              )}

              {/* Delete / Move to Trash */}
              <button
                onClick={onBulkDelete}
                disabled={!!actionLoading}
                style={{
                  ...btnBase,
                  border: '1px solid #3f3f46',
                  background: 'rgba(225,29,72,0.1)',
                  color: '#f43f5e',
                }}
              >
                <Trash2 size={13} />
                {onBulkRestore ? 'Delete' : 'Move to Trash'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}