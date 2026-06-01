import { Star, Edit2, Share2, Download, Trash2, RotateCcw, CheckSquare, Square } from 'lucide-react';
import FilePreview from './FilePreview';

export default function FileGrid({
  files,
  viewMode,
  onSelect,
  onStar,
  onRename,
  onShare,
  onDownload,
  onDelete,
  onRestore,
  getFileIcon,
  formatFileSize,
  isTrash = false,
  selectMode = false,
  selectedIds = [],
  onToggleSelect,
}) {
  return (
    <div className={viewMode === 'grid' ? 'file-grid-inner' : 'file-list-card'}>
      {files.map((file) => {
        const isSelected = selectedIds.includes(file.id);

        return (
          <div
            key={file.id}
            className={viewMode === 'grid' ? 'file-grid-item' : 'file-row-item'}
            onClick={() => {
              if (selectMode) {
                onToggleSelect?.(file.id);
              } else if (!isTrash) {
                onSelect?.(file);
              }
            }}
            style={
              selectMode
                ? {
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid #e11d48' : '2px solid transparent',
                    background: isSelected ? 'rgba(225,29,72,0.07)' : 'transparent',
                    borderRadius: '10px',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                  }
                : { position: 'relative' }
            }
          >
            {/* Grid view: checkbox badge top-left */}
            {selectMode && viewMode === 'grid' && (
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 2, pointerEvents: 'none' }}>
                {isSelected ? <CheckSquare size={18} color="#e11d48" /> : <Square size={18} color="#52525b" />}
              </div>
            )}

            {/* List view: checkbox before thumbnail */}
            {selectMode && viewMode === 'list' && (
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: '4px', marginRight: '10px', pointerEvents: 'none' }}>
                {isSelected ? <CheckSquare size={18} color="#e11d48" /> : <Square size={18} color="#52525b" />}
              </div>
            )}

            {/* ── File preview / icon ── */}
            {viewMode === 'grid' ? (
              // Grid: rich preview via FilePreview — same logic as the modal
              <div className="file-preview-container" style={{ pointerEvents: 'none' }}>
                <FilePreview compact
                  file={file}
                  iconSize={40}
                  style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}
                />
              </div>
            ) : (
              // List: keep the small square icon (FilePreview would be too heavy here)
              <div className="file-icon-square">
                {getFileIcon(file)}
              </div>
            )}

            {/* File name + meta */}
            <div className="file-info-stack">
              <div className="file-name-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div className="file-name-main" title={file.original_name}>
                  {file.original_name}
                </div>
                {!isTrash && !selectMode && viewMode === 'grid' && (
                  <Star
                    size={16}
                    className="star-trigger"
                    onClick={(e) => { e.stopPropagation(); onStar?.(file); }}
                    fill={file.is_starred ? '#fbbf24' : 'none'}
                    color={file.is_starred ? '#fbbf24' : '#71717a'}
                  />
                )}
              </div>
              <div className="file-meta-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('en-GB')}
                {!isTrash && !selectMode && viewMode === 'list' && (
                  <>
                    <span style={{ color: '#27272a' }}>•</span>
                    <Star
                      size={14}
                      className={`star-icon ${file.is_starred ? 'is-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onStar?.(file); }}
                      fill={file.is_starred ? '#fbbf24' : 'none'}
                      color={file.is_starred ? '#fbbf24' : '#71717a'}
                      style={{ cursor: 'pointer' }}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Action buttons — hidden in select mode */}
            {!selectMode && (
              <div className="file-actions-strip">
                {isTrash ? (
                  <>
                    <button className="icon-action-btn hover-white" title="Restore" onClick={(e) => { e.stopPropagation(); onRestore?.(file); }}>
                      <RotateCcw size={16} />
                    </button>
                    <button className="icon-action-btn hover-rose" title="Delete Forever" onClick={(e) => { e.stopPropagation(); onDelete?.(file); }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="icon-action-btn hover-white" title="Rename" onClick={(e) => { e.stopPropagation(); onRename?.(file); }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="icon-action-btn hover-rose" title="Share" onClick={(e) => { e.stopPropagation(); onShare?.(file); }}>
                      <Share2 size={16} />
                    </button>
                    <button className="icon-action-btn hover-white" title="Download" onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}>
                      <Download size={16} />
                    </button>
                    <button className="icon-action-btn hover-rose" title="Delete" onClick={(e) => { e.stopPropagation(); onDelete?.(file); }}>
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}