import React, { useEffect, useState } from 'react';
import { File as FileIcon, FileText, Image as ImageIcon, Music, Video } from 'lucide-react';

// ─── Text / Code Preview ──────────────────────────────────────────────────────

function TextPreview({ file, onOpen, compact }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const ext = file.original_name?.split('.').pop()?.toLowerCase();

  useEffect(() => {
    setLoading(true);
    setError(false);
    setContent('');
    fetch(file.url)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.text(); })
      .then(text => {
        setContent(text.slice(0, 5000) + (text.length > 5000 ? '\n\n... (truncated)' : ''));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [file.url]);

  const getLanguageColor = (ext) => {
    const colors = {
      js: '#f7df1e', jsx: '#61dafb', ts: '#3178c6', tsx: '#61dafb',
      py: '#3572a5', html: '#e34c26', css: '#563d7c', json: '#40bf77',
      md: '#083fa1', csv: '#00b300', xml: '#e44d26', txt: '#a1a1aa',
    };
    return colors[ext] || '#a1a1aa';
  };

  // Compact (grid card): just the code block, no header/open button
  if (compact) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#0d0d0f' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b', fontSize: '11px' }}>
            Loading...
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b', fontSize: '11px' }}>
            Preview unavailable
          </div>
        ) : (
          <pre style={{
            margin: 0, padding: '10px', fontSize: '10px', lineHeight: '1.5',
            color: '#e4e4e7', fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: '#0d0d0f', height: '100%', boxSizing: 'border-box', overflow: 'hidden',
          }}>{content}</pre>
        )}
      </div>
    );
  }

  // Full modal version: header + open button + scrollable content
  return (
    <div className="modal-preview-box" style={{ cursor: 'default', padding: 0, overflow: 'hidden', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', background: '#111', borderBottom: '1px solid #27272a', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
            background: '#27272a', color: getLanguageColor(ext), textTransform: 'uppercase',
          }}>{ext}</span>
          <span style={{ fontSize: '11px', color: '#71717a', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file.original_name}
          </span>
        </div>
        <button onClick={onOpen} style={{
          background: 'transparent', border: '1px solid #27272a', color: '#a1a1aa',
          fontSize: '11px', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>↗ Open</button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#71717a', fontSize: '13px' }}>
            Loading preview...
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#71717a', fontSize: '13px', gap: '8px' }}>
            <span>Could not load preview</span>
            <button onClick={onOpen} style={{ fontSize: '12px', color: '#e11d48', background: 'none', border: 'none', cursor: 'pointer' }}>
              Open file instead ↗
            </button>
          </div>
        ) : (
          <pre style={{
            margin: 0, padding: '16px', fontSize: '12px', lineHeight: '1.6',
            color: '#e4e4e7', fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            background: '#0d0d0f', minHeight: '100%', boxSizing: 'border-box',
          }}>{content}</pre>
        )}
      </div>
    </div>
  );
}

// ─── FilePreview ──────────────────────────────────────────────────────────────
//
// Props:
//   file      — file object (.url, .original_name, .file_type)
//   compact   — true = grid card mode (no overlay button, plain wrapper)
//               false/undefined = modal mode (full modal-preview-box + open button)
//   iconSize  — lucide icon size for fallback (default 40)
//   className — extra class on wrapper (modal mode only)
//   style     — extra inline style on wrapper (modal mode only)

export default function FilePreview({ file, compact = false, iconSize = 40, className = '', style = {} }) {
  if (!file) return null;

  const ext     = file.original_name?.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  const isPDF   = ext === 'pdf';
  const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'].includes(ext);
  const isText  = ['txt', 'js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'md', 'csv', 'xml'].includes(ext);

  const handleOpen = () => { if (file.url) window.open(file.url, '_blank'); };

  const openBtnStyle = {
    position: 'absolute', top: '10px', right: '10px',
    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', fontSize: '12px', padding: '5px 10px',
    borderRadius: '6px', cursor: 'pointer', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '4px',
  };

  const getIcon = () => {
    const type = (file.file_type || '').toLowerCase();
    const name = (file.original_name || '').toLowerCase();
    if (type.includes('pdf') || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/))
      return <FileText size={iconSize} className="text-rose" />;
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/))
      return <ImageIcon size={iconSize} className="text-rose" />;
    if (type.includes('audio') || name.match(/\.(mp3|wav|aac|flac|m4a|ogg)$/))
      return <Music size={iconSize} className="text-rose" />;
    if (type.includes('video') || name.match(/\.(mp4|webm|mov|avi|mkv)$/))
      return <Video size={iconSize} className="text-rose" />;
    return <FileIcon size={iconSize} className="text-rose" />;
  };

  // ── COMPACT MODE (grid card) ──────────────────────────────────────────────
  // Plain wrapper, no overlay button, no modal-preview-box class.
  // Pointer events are disabled on the parent in FileGrid so clicks pass through.
  if (compact) {
    if (isImage) return (
      <img
        src={file.url}
        alt={file.original_name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#52525b;font-size:11px;">${ext?.toUpperCase() || 'FILE'}</div>`;
        }}
      />
    );

    if (isPDF) return (
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <iframe
          src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
          width="100%"
          height="100%"
          title="PDF Preview"
          style={{ border: 'none', display: 'block', pointerEvents: 'none' }}
        />
      </div>
    );

    if (isText) return <TextPreview file={file} compact />;

    if (isVideo) return (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {getIcon()}
      </div>
    );

    if (isAudio) return (
      <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {getIcon()}
      </div>
    );

    // Fallback
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
        {getIcon()}
      </div>
    );
  }

  // ── FULL MODAL MODE ───────────────────────────────────────────────────────
  if (isVideo) return (
    <div className={`modal-preview-box ${className}`} style={{ cursor: 'default', ...style }}>
      <video src={file.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }} />
      <button onClick={handleOpen} style={openBtnStyle}>↗ Open</button>
    </div>
  );

  if (isPDF) return (
    <div className={`modal-preview-box ${className}`} style={{ cursor: 'default', ...style }}>
      <iframe
        src={`${file.url}#toolbar=0&scrollbar=0&navpanes=0&view=FitH`}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="PDF Preview"
      />
      <button onClick={(e) => { e.stopPropagation(); handleOpen(); }} style={openBtnStyle}>↗ Open</button>
    </div>
  );

  if (isAudio) return (
    <div className={`modal-preview-box ${className}`} style={{ cursor: 'default', flexDirection: 'column', gap: '16px', ...style }}>
      <div style={{ opacity: 0.15 }}>{getIcon()}</div>
      <audio src={file.url} controls style={{ width: '85%', accentColor: '#e11d48' }} />
      <button onClick={handleOpen} style={openBtnStyle}>↗ Open</button>
    </div>
  );

  if (isImage) return (
    <div className={`modal-preview-box modal-preview-clickable ${className}`} style={style} onClick={handleOpen} title="Click to open in new tab">
      <img src={file.url} alt="Preview" className="modal-img-preview" style={{ objectFit: 'contain', width: '100%', height: '100%' }} />
    </div>
  );

  if (isText) return <TextPreview file={file} onOpen={handleOpen} />;

  // Fallback
  return (
    <div className={`modal-preview-box ${className}`} style={style}>
      <div className="modal-icon-placeholder">
        {getIcon()}
        <span style={{ fontSize: '12px', color: '#71717a', marginTop: '8px', display: 'block' }}>Preview not available</span>
        <button onClick={handleOpen} style={{ marginTop: '12px', fontSize: '12px', color: '#e11d48', background: 'none', border: '1px solid #e11d48', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>
          ↗ Open file
        </button>
      </div>
    </div>
  );
}