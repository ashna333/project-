import { Star, Edit2, Share2, Download, Trash2 } from 'lucide-react';

export default function FileGrid({
  files,
  viewMode,
  onSelect,
  onStar,
  onRename,
  onShare,
  onDownload,
  onDelete,
  getFileIcon,
  formatFileSize,
}) {
  return (
    <div className={viewMode === 'grid' ? 'file-grid-inner' : 'file-list-card'}>
      { files.map((file) => {
        const extension = file.original_name?.split('.').pop()?.toLowerCase();
        const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(extension);
        const isPDF = extension === 'pdf';
        const isText = extension === 'txt';

        return (
          <div
            key={file.id}
            className={viewMode === 'grid' ? 'file-grid-item' : 'file-row-item'}
            onClick={() => onSelect?.(file)}
          >
            <div className={viewMode === 'grid' ? 'file-preview-container' : 'file-icon-square'}>
              {isImage ? (
                <img src={file.url} alt={file.original_name} className="file-image-preview"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div class="file-type-preview">${extension?.toUpperCase() || 'FILE'}</div>`;
                  }}
                />
              ) : isPDF ? (
                <div className="pdf-preview-container" style={{ overflow: 'hidden', pointerEvents: 'none' }}>
                  <iframe src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                    width="100%" height="100%" title="PDF Preview"
                    style={{ border: 'none' }} className="pdf-embed-no-scroll" />
                </div>
              ) : isText ? (
                <div className="file-type-preview">TXT</div>
              ) : (
                getFileIcon(file)
              )}
            </div>

            <div className="file-info-stack">
              <div className="file-name-container" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'8px' }}>
                <div className="file-name-main" title={file.original_name}>{file.original_name}</div>
                {viewMode === 'grid' && (
                  <Star size={16} className="star-trigger"
                    onClick={(e) => { e.stopPropagation(); onStar?.(file); }}
                    fill={file.is_starred ? '#fbbf24' : 'none'}
                    color={file.is_starred ? '#fbbf24' : '#71717a'}
                  />
                )}
              </div>
              <div className="file-meta-sub" style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('en-GB')}
                {viewMode === 'list' && (
                  <>
                    <span style={{ color:'#27272a' }}>•</span>
                    <Star size={14} className={`star-icon ${file.is_starred ? 'is-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onStar?.(file); }}
                      fill={file.is_starred ? '#fbbf24' : 'none'}
                      color={file.is_starred ? '#fbbf24' : '#71717a'}
                      style={{ cursor:'pointer' }}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="file-actions-strip">
              <button className="icon-action-btn hover-white" title="Rename"
                onClick={(e) => { e.stopPropagation(); onRename?.(file); }}>
                <Edit2 size={16} />
              </button>
              <button className="icon-action-btn hover-rose" title="Share"
                onClick={(e) => { e.stopPropagation(); onShare?.(file); }}>
                <Share2 size={16} />
              </button>
              <button className="icon-action-btn hover-white" title="Download"
                onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}>
                <Download size={16} />
              </button>
              <button className="icon-action-btn hover-rose" title="Delete"
                onClick={(e) => { e.stopPropagation(); onDelete?.(file); }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}