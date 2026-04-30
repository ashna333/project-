import { useEffect, useState, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchFiles } from '../store/fileThunks'
import { setPage, setSearchQuery, setViewMode } from '../store/fileSlice'
import DropZone from '../components/DropZone'

/* ─────────────────────────────────────────────────────────────
   CLOUDNEST FILE MANAGER
   Drive-inspired layout with CloudNest identity
───────────────────────────────────────────────────────────── */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --cn-brand:#2563eb;--cn-brand-light:#eff6ff;--cn-brand-mid:#bfdbfe;--cn-brand-dark:#1d4ed8;
  --cn-text:#111827;--cn-text-2:#6b7280;--cn-text-3:#9ca3af;
  --cn-bg:#f3f4f6;--cn-surface:#ffffff;
  --cn-border:#e5e7eb;--cn-border-2:#d1d5db;
  --cn-hover:#f3f4f6;--cn-active-bg:#eff6ff;--cn-active-text:#2563eb;
  --cn-danger:#ef4444;--cn-danger-light:#fef2f2;
  --cn-shadow-sm:0 1px 2px rgba(0,0,0,.06);
  --cn-shadow:0 1px 3px rgba(0,0,0,.1),0 1px 2px rgba(0,0,0,.06);
  --cn-shadow-md:0 4px 6px rgba(0,0,0,.07),0 2px 4px rgba(0,0,0,.06);
  --cn-shadow-lg:0 10px 20px rgba(0,0,0,.12),0 4px 8px rgba(0,0,0,.06);
  --cn-r:10px;--cn-r-sm:6px;--cn-r-lg:14px;
  --font:'Plus Jakarta Sans',system-ui,sans-serif;
}

.cn-page{display:flex;flex-direction:column;height:100vh;background:var(--cn-bg);font-family:var(--font);color:var(--cn-text);font-size:14px;line-height:1.5;overflow:hidden}

/* TOPBAR */
.cn-topbar{display:flex;align-items:center;gap:12px;padding:0 20px;height:60px;background:var(--cn-surface);border-bottom:1px solid var(--cn-border);flex-shrink:0;z-index:30}
.cn-brand{display:flex;align-items:center;gap:10px;width:232px;flex-shrink:0;text-decoration:none;cursor:pointer}
.cn-brand-icon{width:34px;height:34px;background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cn-brand-name{font-size:17px;font-weight:700;color:var(--cn-text);letter-spacing:-.3px}
.cn-brand-name span{color:var(--cn-brand)}
.cn-search-box{flex:1;max-width:560px;position:relative}
.cn-search-box input{width:100%;height:38px;padding:0 38px 0 40px;background:var(--cn-hover);border:1.5px solid transparent;border-radius:999px;font-size:14px;font-family:var(--font);color:var(--cn-text);outline:none;transition:all .2s}
.cn-search-box input:focus{background:var(--cn-surface);border-color:var(--cn-brand);box-shadow:0 0 0 3px rgba(37,99,235,.12)}
.cn-search-box input::placeholder{color:var(--cn-text-3)}
.cn-search-ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--cn-text-3);pointer-events:none;display:flex}
.cn-search-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:20px;height:20px;border-radius:50%;border:none;background:var(--cn-text-3);color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s;font-size:10px}
.cn-topbar-right{display:flex;align-items:center;gap:6px;margin-left:auto}
.cn-icon-btn{width:36px;height:36px;border-radius:50%;border:none;background:transparent;color:var(--cn-text-2);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
.cn-icon-btn:hover{background:var(--cn-hover);color:var(--cn-text)}
.cn-avatar{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}

/* BODY */
.cn-body{display:flex;flex:1;overflow:hidden}

/* SIDEBAR */
.cn-sidebar{width:232px;flex-shrink:0;background:var(--cn-surface);border-right:1px solid var(--cn-border);display:flex;flex-direction:column;padding:12px 0 0;overflow-y:auto}
.cn-upload-btn{display:flex;align-items:center;gap:10px;margin:0 12px 14px;padding:10px 20px;background:var(--cn-brand);color:white;border:none;border-radius:var(--cn-r);font-size:14px;font-weight:600;font-family:var(--font);cursor:pointer;box-shadow:0 2px 8px rgba(37,99,235,.35);transition:background .15s,transform .1s,box-shadow .15s;text-align:left}
.cn-upload-btn:hover{background:var(--cn-brand-dark);box-shadow:0 4px 12px rgba(37,99,235,.4);transform:translateY(-1px)}
.cn-upload-btn:active{transform:translateY(0)}
.cn-nav-label{font-size:10.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--cn-text-3);padding:10px 16px 4px}
.cn-nav-item{display:flex;align-items:center;gap:12px;padding:7px 14px;border-radius:0 24px 24px 0;margin-right:12px;cursor:pointer;font-size:13.5px;font-weight:500;color:var(--cn-text-2);border:none;background:transparent;width:calc(100% - 12px);text-align:left;transition:background .12s,color .12s}
.cn-nav-item:hover{background:var(--cn-hover);color:var(--cn-text)}
.cn-nav-item.active{background:var(--cn-active-bg);color:var(--cn-active-text);font-weight:600}
.cn-nav-item svg{flex-shrink:0;color:inherit;opacity:.7}
.cn-nav-item.active svg{opacity:1}
.cn-nav-sep{height:1px;background:var(--cn-border);margin:10px 0}
.cn-storage-block{padding:10px 14px 6px}
.cn-storage-title{font-size:11.5px;font-weight:600;color:var(--cn-text-2);margin-bottom:8px;display:flex;justify-content:space-between}
.cn-storage-bar-bg{height:5px;background:var(--cn-border);border-radius:3px;overflow:hidden;margin-bottom:5px}
.cn-storage-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--cn-brand),#7c3aed);transition:width .4s}
.cn-storage-fill.warn{background:linear-gradient(90deg,#f59e0b,#ef4444)}
.cn-storage-info{font-size:11px;color:var(--cn-text-3)}
.cn-upgrade-btn{display:flex;align-items:center;justify-content:center;gap:6px;margin:6px 12px 8px;padding:8px;border-radius:var(--cn-r-sm);border:1.5px solid var(--cn-brand-mid);background:var(--cn-brand-light);color:var(--cn-brand);font-size:12px;font-weight:600;font-family:var(--font);cursor:pointer;transition:all .15s}
.cn-upgrade-btn:hover{background:var(--cn-brand-mid)}
.cn-sidebar-dz{padding:6px 12px 12px}

/* MAIN */
.cn-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.cn-subheader{display:flex;align-items:center;justify-content:space-between;padding:14px 24px 8px;flex-shrink:0;gap:12px;flex-wrap:wrap;background:var(--cn-surface);border-bottom:1px solid var(--cn-border)}
.cn-page-title{font-size:17px;font-weight:700;color:var(--cn-text);letter-spacing:-.3px}
.cn-page-sub{font-size:12px;color:var(--cn-text-3);margin-top:1px}
.cn-subheader-right{display:flex;align-items:center;gap:8px}
.cn-view-btn{width:34px;height:34px;border-radius:var(--cn-r-sm);border:1.5px solid var(--cn-border);background:var(--cn-surface);color:var(--cn-text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.cn-view-btn:hover,.cn-view-btn.active{border-color:var(--cn-brand);color:var(--cn-brand);background:var(--cn-brand-light)}

/* FILTER / FOLDER BAR */
.cn-folder-bar{display:flex;align-items:center;gap:6px;padding:10px 24px 8px;flex-wrap:wrap;flex-shrink:0}
.cn-folder-tab{display:flex;align-items:center;gap:6px;padding:5px 14px;border-radius:999px;border:1.5px solid var(--cn-border);background:var(--cn-surface);font-size:12.5px;font-weight:500;font-family:var(--font);color:var(--cn-text-2);cursor:pointer;transition:all .15s}
.cn-folder-tab:hover{border-color:var(--cn-brand-mid);color:var(--cn-brand);background:var(--cn-brand-light)}
.cn-folder-tab.active{border-color:var(--cn-brand);color:var(--cn-brand);background:var(--cn-brand-light);font-weight:600}

/* COUNT */
.cn-count-bar{padding:4px 24px 6px;flex-shrink:0}
.cn-count-text{font-size:12px;color:var(--cn-text-3);font-weight:500}

/* LIST HEADER */
.cn-list-header{display:grid;grid-template-columns:32px 1fr 90px 130px 36px;gap:8px;padding:6px 12px;font-size:11px;font-weight:700;color:var(--cn-text-3);text-transform:uppercase;letter-spacing:.05em;border-bottom:1.5px solid var(--cn-border);margin:0 16px 2px;flex-shrink:0}

/* CONTENT */
.cn-content{flex:1;overflow-y:auto;padding:6px 16px 16px}

/* FILE GRID */
.cn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;padding-top:4px}

/* FILE CARD */
.cn-file-card{background:var(--cn-surface);border:1.5px solid var(--cn-border);border-radius:var(--cn-r);overflow:visible;cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .1s;position:relative}
.cn-file-card:hover{border-color:var(--cn-brand-mid);box-shadow:var(--cn-shadow-md);transform:translateY(-1px)}
.cn-file-thumb{height:120px;background:var(--cn-hover);border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;border-bottom:1px solid var(--cn-border)}
.cn-file-thumb-img{width:100%;height:100%;object-fit:cover}
.cn-folder-badge{position:absolute;top:6px;right:6px;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;background:rgba(0,0,0,.12);color:#fff;backdrop-filter:blur(4px)}
.cn-file-footer{display:flex;align-items:center;gap:8px;padding:8px 10px}
.cn-file-name-sm{flex:1;font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--cn-text)}

/* FILE ROW */
.cn-file-row{display:grid;grid-template-columns:32px 1fr 90px 130px 36px;gap:8px;align-items:center;padding:7px 12px;border-radius:var(--cn-r-sm);cursor:pointer;transition:background .12s;position:relative}
.cn-file-row:hover{background:var(--cn-hover)}
.cn-file-row-name{font-size:13px;font-weight:500;color:var(--cn-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cn-file-row-size,.cn-file-row-date{font-size:12px;color:var(--cn-text-3)}

/* FILE TYPE ICON */
.cn-ft-icon{border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;letter-spacing:0;flex-shrink:0}
.ft-pdf{background:#fef2f2;color:#dc2626}
.ft-doc{background:#eff6ff;color:#2563eb}
.ft-xls{background:#f0fdf4;color:#16a34a}
.ft-ppt{background:#fff7ed;color:#ea580c}
.ft-img{background:#faf5ff;color:#9333ea}
.ft-vid{background:#fef2f2;color:#e11d48}
.ft-zip{background:#fffbeb;color:#d97706}
.ft-txt{background:#f8fafc;color:#475569}
.ft-code{background:#f0fdf4;color:#059669}
.ft-misc{background:#f3f4f6;color:#6b7280}

/* THREE-DOT BUTTON */
.cn-more-btn{width:28px;height:28px;border-radius:50%;border:none;background:transparent;color:var(--cn-text-3);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .12s,color .12s;flex-shrink:0}
.cn-more-btn:hover{background:var(--cn-border-2,#d1d5db);color:var(--cn-text)}

/* DROPDOWN — fixed, always fully visible */
.cn-dropdown{position:fixed;background:var(--cn-surface);border:1px solid var(--cn-border);border-radius:var(--cn-r);box-shadow:var(--cn-shadow-lg);padding:4px;z-index:9999;min-width:186px;animation:cn-dd-in .12s ease}
@keyframes cn-dd-in{from{opacity:0;transform:scale(.94) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
.cn-dd-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;font-size:13px;font-weight:500;color:var(--cn-text);cursor:pointer;border:none;background:transparent;width:100%;text-align:left;font-family:var(--font);transition:background .1s}
.cn-dd-item:hover{background:var(--cn-hover)}
.cn-dd-item.danger{color:var(--cn-danger)}
.cn-dd-item.danger:hover{background:var(--cn-danger-light)}
.cn-dd-sep{height:1px;background:var(--cn-border);margin:3px 0}

/* LOADING / EMPTY */
.cn-loading,.cn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;gap:14px;color:var(--cn-text-3)}
.cn-spinner{width:36px;height:36px;border:3px solid var(--cn-border);border-top-color:var(--cn-brand);border-radius:50%;animation:cn-spin .7s linear infinite}
@keyframes cn-spin{to{transform:rotate(360deg)}}
.cn-empty-ico{width:68px;height:68px;border-radius:50%;background:var(--cn-hover);display:flex;align-items:center;justify-content:center}
.cn-empty-title{font-size:15px;font-weight:600;color:var(--cn-text-2)}
.cn-empty-sub{font-size:13px;text-align:center;max-width:280px}

/* PAGINATION */
.cn-pagination{display:flex;align-items:center;justify-content:center;gap:4px;padding:14px 16px;flex-shrink:0;border-top:1px solid var(--cn-border);background:var(--cn-surface)}
.cn-pg-btn,.cn-pg-num{height:34px;min-width:34px;padding:0 10px;border-radius:var(--cn-r-sm);border:1.5px solid var(--cn-border);background:var(--cn-surface);font-size:13px;font-weight:500;font-family:var(--font);color:var(--cn-text);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
.cn-pg-btn:hover:not(:disabled),.cn-pg-num:hover{border-color:var(--cn-brand);color:var(--cn-brand);background:var(--cn-brand-light)}
.cn-pg-btn:disabled{color:var(--cn-text-3);cursor:default;opacity:.5}
.cn-pg-num.active{border-color:var(--cn-brand);color:white;background:var(--cn-brand)}
.cn-pg-ellipsis{height:34px;min-width:34px;display:flex;align-items:center;justify-content:center;color:var(--cn-text-3)}

/* MODAL */
.cn-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}
.cn-modal{background:var(--cn-surface);border-radius:var(--cn-r-lg);padding:28px;max-width:420px;width:100%;box-shadow:var(--cn-shadow-lg);animation:cn-modal-in .15s ease}
@keyframes cn-modal-in{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.cn-modal-title{font-size:16px;font-weight:700;margin-bottom:8px}
.cn-modal-sub{font-size:13px;color:var(--cn-text-2);margin-bottom:20px;line-height:1.6}
.cn-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:6px}
.cn-modal-label{font-size:12px;font-weight:600;color:var(--cn-text-2);margin-bottom:5px;display:block}
.cn-modal-field{margin-bottom:14px}
.cn-modal-input{width:100%;padding:9px 12px;border:1.5px solid var(--cn-border);border-radius:var(--cn-r-sm);font-size:14px;font-family:var(--font);color:var(--cn-text);outline:none;transition:border-color .15s,box-shadow .15s;background:var(--cn-surface)}
.cn-modal-input:focus{border-color:var(--cn-brand);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.cn-modal-textarea{width:100%;padding:9px 12px;border:1.5px solid var(--cn-border);border-radius:var(--cn-r-sm);font-size:14px;font-family:var(--font);color:var(--cn-text);outline:none;resize:vertical;min-height:80px;transition:border-color .15s;background:var(--cn-surface)}
.cn-modal-textarea:focus{border-color:var(--cn-brand);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
.cn-modal-error{font-size:12.5px;color:var(--cn-danger);font-weight:500;margin-bottom:12px}
.cn-btn-cancel{padding:8px 18px;border-radius:var(--cn-r-sm);border:1.5px solid var(--cn-border);background:transparent;color:var(--cn-text-2);font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;transition:background .12s}
.cn-btn-cancel:hover{background:var(--cn-hover)}
.cn-btn-primary{padding:8px 18px;border-radius:var(--cn-r-sm);border:none;background:var(--cn-brand);color:white;font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;transition:background .12s}
.cn-btn-primary:hover{background:var(--cn-brand-dark)}
.cn-btn-danger{padding:8px 18px;border-radius:var(--cn-r-sm);border:none;background:var(--cn-danger);color:white;font-size:13px;font-weight:600;font-family:var(--font);cursor:pointer;transition:background .12s}
.cn-btn-danger:hover{background:#dc2626}

/* TOAST */
.cn-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:500;font-family:var(--font);z-index:20000;box-shadow:var(--cn-shadow-lg);animation:cn-toast-in .2s ease;white-space:nowrap}
.cn-toast.success{background:#065f46}
.cn-toast.error{background:#7f1d1d}
@keyframes cn-toast-in{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
`

/* ─── helpers ──────────────────────────────────────────────── */
const getVisiblePages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
}

const formatBytes = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getFileType = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase()
  if (['pdf'].includes(ext)) return 'pdf'
  if (['doc','docx','odt','rtf'].includes(ext)) return 'doc'
  if (['xls','xlsx','csv'].includes(ext)) return 'xls'
  if (['ppt','pptx'].includes(ext)) return 'ppt'
  if (['png','jpg','jpeg','gif','webp','svg','ico','bmp'].includes(ext)) return 'img'
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return 'vid'
  if (['zip','rar','tar','gz','7z'].includes(ext)) return 'zip'
  if (['txt','md','log'].includes(ext)) return 'txt'
  if (['js','ts','jsx','tsx','py','java','c','cpp','html','css','json','sh'].includes(ext)) return 'code'
  return 'misc'
}

const FT_LABEL = { pdf:'PDF',doc:'DOC',xls:'XLS',ppt:'PPT',img:'IMG',vid:'VID',zip:'ZIP',txt:'TXT',code:'CODE',misc:'FILE' }

/* ─── Inline SVG Icons ─────────────────────────────────────── */
const I = {
  Cloud: () => <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>,
  Upload: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  MyDrive: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
  Shared: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Star: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  Trash: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Download: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Share: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  Rename: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Folder: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  Info: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  Settings: () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Grid: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  List: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2.5" rx="1"/><rect x="3" y="10.75" width="18" height="2.5" rx="1"/><rect x="3" y="17.5" width="18" height="2.5" rx="1"/></svg>,
  More: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>,
  Search: () => <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Close: () => <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Zap: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
}

/* ─── File type icon ───────────────────────────────────────── */
function FTIcon({ filename, w = 22, h = 22 }) {
  const type = getFileType(filename)
  return (
    <div className={`cn-ft-icon ft-${type}`} style={{ width: w, height: h }}>
      {FT_LABEL[type]}
    </div>
  )
}

/* ─── Dropdown (fixed portal) ──────────────────────────────── */
function Dropdown({ file, pos, onClose, onDownload, onShare, onRename, onOrganize, onInfo, onDelete }) {
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const act = (fn) => { fn(); onClose() }

  return (
    <div ref={ref} className="cn-dropdown" style={{ top: pos.y, left: pos.x }} onClick={(e) => e.stopPropagation()}>
      <button className="cn-dd-item" onClick={() => act(() => onDownload(file))}><I.Download /> Download</button>
      <button className="cn-dd-item" onClick={() => act(() => onShare(file))}><I.Share /> Share file</button>
      <button className="cn-dd-item" onClick={() => act(() => onRename(file))}><I.Rename /> Rename</button>
      <button className="cn-dd-item" onClick={() => act(() => onOrganize(file))}><I.Folder /> Move to folder</button>
      <div className="cn-dd-sep"/>
      <button className="cn-dd-item" onClick={() => act(() => onInfo(file))}><I.Info /> File details</button>
      <div className="cn-dd-sep"/>
      <button className="cn-dd-item danger" onClick={() => act(() => onDelete(file))}><I.Trash /> Delete file</button>
    </div>
  )
}

/* ─── Delete Modal ─────────────────────────────────────────── */
function DeleteModal({ file, onConfirm, onCancel }) {
  const name = file?.name || file?.file_name || 'this file'
  return (
    <div className="cn-overlay" onClick={onCancel}>
      <div className="cn-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="cn-modal-title">Delete file?</h3>
        <p className="cn-modal-sub"><strong>"{name}"</strong> will be permanently deleted. This cannot be undone.</p>
        <div className="cn-modal-actions">
          <button className="cn-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cn-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Rename Modal ─────────────────────────────────────────── */
function RenameModal({ file, onConfirm, onCancel }) {
  const [val, setVal] = useState(file?.name || file?.file_name || '')
  return (
    <div className="cn-overlay" onClick={onCancel}>
      <div className="cn-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="cn-modal-title">Rename file</h3>
        <input
          className="cn-modal-input"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && val.trim() && onConfirm(val.trim())}
          autoFocus
          style={{ marginBottom: 20 }}
        />
        <div className="cn-modal-actions">
          <button className="cn-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cn-btn-primary" onClick={() => val.trim() && onConfirm(val.trim())}>Save</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Info Modal ────────────────────────────────────────────── */
function InfoModal({ file, onClose }) {
  const name = file?.name || file?.file_name || 'Unknown'
  const rows = [
    ['Name', name],
    ['Type', FT_LABEL[getFileType(name)] || 'FILE'],
    ['Size', formatBytes(file?.size || file?.file_size)],
    ['Uploaded', formatDate(file?.uploaded_at || file?.created_at)],
    ['ID', file?.id || '—'],
  ]
  return (
    <div className="cn-overlay" onClick={onClose}>
      <div className="cn-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="cn-modal-title">File details</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--cn-border)' }}>
                <td style={{ padding: '8px 0', fontSize: 12, color: 'var(--cn-text-3)', fontWeight: 600, width: 90 }}>{label}</td>
                <td style={{ padding: '8px 0', fontSize: 13, color: 'var(--cn-text)', wordBreak: 'break-all' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="cn-modal-actions">
          <button className="cn-btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Share Modal ──────────────────────────────────────────── */
function ShareModal({ file, onConfirm, onCancel }) {
  const [email, setEmail] = useState('')
  const [hours, setHours] = useState('24')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const validate = () => {
    if (!email.trim()) return 'Recipient email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.'
    const h = Number(hours)
    if (!hours || isNaN(h) || h <= 0 || h > 8760) return 'Expiration must be between 1 and 8760 hours.'
    return ''
  }

  const handleSend = () => {
    const e = validate()
    if (e) { setErr(e); return }
    onConfirm({ email: email.trim(), hours: Number(hours), message: msg.trim() })
  }

  const name = file?.name || file?.file_name
  return (
    <div className="cn-overlay" onClick={onCancel}>
      <div className="cn-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <h3 className="cn-modal-title">Share "{name}"</h3>
        <p className="cn-modal-sub">A unique shareable link will be emailed. It expires after the set time.</p>
        {err && <p className="cn-modal-error">{err}</p>}
        <div className="cn-modal-field">
          <label className="cn-modal-label">Recipient email *</label>
          <input className="cn-modal-input" type="email" placeholder="recipient@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="cn-modal-field">
          <label className="cn-modal-label">Link expires in (hours) *</label>
          <input className="cn-modal-input" type="number" min="1" max="8760" placeholder="24" value={hours} onChange={(e) => setHours(e.target.value)} />
        </div>
        <div className="cn-modal-field">
          <label className="cn-modal-label">Message for recipient (optional)</label>
          <textarea className="cn-modal-textarea" placeholder="Add a personal note…" value={msg} onChange={(e) => setMsg(e.target.value)} />
        </div>
        <div className="cn-modal-actions">
          <button className="cn-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="cn-btn-primary" onClick={handleSend}>Send link</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Toast ────────────────────────────────────────────────── */
function Toast({ msg, type }) {
  return <div className={`cn-toast ${type}`}>{msg}</div>
}

/* ─── File card (grid) ─────────────────────────────────────── */
function GridCard({ file, folderName, onMore }) {
  const name = file.name || file.file_name || 'Untitled'
  const type = getFileType(name)
  return (
    <div className="cn-file-card">
      <div className="cn-file-thumb">
        {type === 'img' && (file.url || file.file_url)
          ? <img src={file.url || file.file_url} alt={name} className="cn-file-thumb-img" />
          : <FTIcon filename={name} w={40} h={40} />
        }
        {folderName && <span className="cn-folder-badge">📁 {folderName}</span>}
      </div>
      <div className="cn-file-footer">
        <FTIcon filename={name} w={22} h={22} />
        <span className="cn-file-name-sm" title={name}>{name}</span>
        <button className="cn-more-btn" title="More options" onClick={(e) => { e.stopPropagation(); onMore(e, file) }}>
          <I.More />
        </button>
      </div>
    </div>
  )
}

/* ─── File row (list) ──────────────────────────────────────── */
function ListRow({ file, folderName, onMore }) {
  const name = file.name || file.file_name || 'Untitled'
  return (
    <div className="cn-file-row">
      <FTIcon filename={name} w={28} h={28} />
      <span className="cn-file-row-name" title={name}>
        {name}
        {folderName && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--cn-text-3)', fontWeight: 400 }}>· 📁 {folderName}</span>}
      </span>
      <span className="cn-file-row-size">{formatBytes(file.size || file.file_size)}</span>
      <span className="cn-file-row-date">{formatDate(file.uploaded_at || file.created_at)}</span>
      <button className="cn-more-btn" title="More options" onClick={(e) => { e.stopPropagation(); onMore(e, file) }}>
        <I.More />
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function FileManagerPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { files, pagination, loading, viewMode, searchQuery } = useSelector((s) => s.files)

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [folderMap, setFolderMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fileFolders') || '{}') }
    catch { return {} }
  })
  const [activeFolder, setActiveFolder] = useState('all')
  const [activeNav, setActiveNav] = useState('my-drive')

  // dropdown state
  const [dropdown, setDropdown] = useState(null) // { file, x, y }

  // modal state
  const [modal, setModal] = useState(null) // { type: 'delete'|'rename'|'share'|'info', file }

  // toast
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // inject CSS once
  useEffect(() => {
    if (document.getElementById('cn-fm-css')) return
    const s = document.createElement('style')
    s.id = 'cn-fm-css'
    s.textContent = STYLES
    document.head.appendChild(s)
  }, [])

  // close dropdown on Escape or scroll
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setDropdown(null); setModal(null) } }
    const onScroll = () => setDropdown(null)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('scroll', onScroll, true) }
  }, [])

  useEffect(() => {
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))
  }, [dispatch, pagination.currentPage, pagination.pageSize, searchQuery])

  useEffect(() => {
    const t = setTimeout(() => dispatch(setSearchQuery(searchInput.trim())), 350)
    return () => clearTimeout(t)
  }, [dispatch, searchInput])

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const totalPages = Math.max(1, Math.ceil((pagination.count || 0) / pagination.pageSize))
  const visiblePages = getVisiblePages(pagination.currentPage, totalPages)
  const folders = Array.from(new Set(Object.values(folderMap).filter(Boolean)))
  const visibleFiles = activeFolder === 'all' ? files : files.filter((f) => folderMap[f.id] === activeFolder)

  /* dropdown open — smart positioning so it never goes off-screen */
  const openMore = useCallback((e, file) => {
    e.preventDefault()
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const MW = 190, MH = 230
    let x = r.right + 6
    let y = r.top
    if (x + MW > window.innerWidth - 8) x = r.left - MW - 6
    if (y + MH > window.innerHeight - 8) y = window.innerHeight - MH - 8
    if (y < 8) y = 8
    setDropdown({ file, x, y })
  }, [])

  /* ── actions ── */
  const doDownload = (file) => {
    const url = file.url || file.file_url || file.download_url
    if (!url) { showToast('Download URL not available', 'error'); return }
    const a = document.createElement('a')
    a.href = url
    a.download = file.name || file.file_name || 'file'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    showToast('Download started')
  }

  const doOrganize = (file) => {
    const cur = folderMap[file.id] || ''
    const input = window.prompt('Enter folder name (leave empty to remove):', cur)
    if (input === null) return
    const next = { ...folderMap }
    const t = input.trim()
    if (!t) delete next[file.id]
    else next[file.id] = t
    setFolderMap(next)
    localStorage.setItem('fileFolders', JSON.stringify(next))
    showToast(t ? `Moved to "${t}"` : 'Removed from folder')
  }

  const confirmDelete = async () => {
    const file = modal?.file
    try {
      // await dispatch(deleteFile(file.id))   ← wire your thunk
      showToast(`"${file?.name || file?.file_name}" deleted`)
      dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))
    } catch { showToast('Delete failed', 'error') }
    finally { setModal(null) }
  }

  const confirmRename = async (newName) => {
    try {
      // await dispatch(renameFile({ id: modal.file.id, name: newName }))   ← wire your thunk
      showToast(`Renamed to "${newName}"`)
      dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))
    } catch { showToast('Rename failed', 'error') }
    finally { setModal(null) }
  }

  const confirmShare = async ({ email, hours, message }) => {
    try {
      // await dispatch(shareFile({ id: modal.file.id, email, hours, message }))   ← wire your thunk
      // Or navigate to your sharing page:
      navigate(`/sharing?fileId=${modal.file.id}&email=${encodeURIComponent(email)}&hours=${hours}`)
      showToast(`Share link sent to ${email}`)
    } catch { showToast('Share failed', 'error') }
    finally { setModal(null) }
  }

  const storagePct = Math.min(100, Math.round(((pagination.count || 0) * 5) / 1024 * 100))

  return (
    <div className="cn-page">

      {/* ─── TOPBAR ─────────────────────────────────────────── */}
      <header className="cn-topbar">
        <div className="cn-brand" onClick={() => navigate('/')}>
          <div className="cn-brand-icon"><I.Cloud /></div>
          <span className="cn-brand-name">Cloud<span>Nest</span></span>
        </div>

        <div className="cn-search-box">
          <span className="cn-search-ico"><I.Search /></span>
          <input
            placeholder="Search files…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button className="cn-search-clear" onClick={() => setSearchInput('')}><I.Close /></button>
          )}
        </div>

        <div className="cn-topbar-right">
          <button className="cn-icon-btn" title="Settings" onClick={() => navigate('/settings')}>
            <I.Settings />
          </button>
          <div className="cn-avatar" title="My account">U</div>
        </div>
      </header>

      <div className="cn-body">

        {/* ─── SIDEBAR ──────────────────────────────────────── */}
        <aside className="cn-sidebar">
          <button className="cn-upload-btn" onClick={() => document.getElementById('cn-file-input')?.click()}>
            <I.Upload /> Upload files
          </button>
          <input
            id="cn-file-input"
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (!e.target.files.length) return
              // dispatch(uploadFiles(e.target.files))   ← wire your upload thunk
              showToast(`Uploading ${e.target.files.length} file(s)…`)
              e.target.value = ''
            }}
          />

          {/* Main nav */}
          <div className="cn-nav-label">Navigation</div>
          <button className={`cn-nav-item${activeNav === 'my-drive' ? ' active' : ''}`} onClick={() => setActiveNav('my-drive')}>
            <I.MyDrive /> My Drive
          </button>
          <button className={`cn-nav-item${activeNav === 'shared' ? ' active' : ''}`} onClick={() => { setActiveNav('shared'); navigate('/sharing') }}>
            <I.Shared /> Shared files
          </button>
          <button className={`cn-nav-item${activeNav === 'starred' ? ' active' : ''}`} onClick={() => setActiveNav('starred')}>
            <I.Star /> Starred
          </button>

          <div className="cn-nav-sep" />

          {/* Folder nav */}
          <div className="cn-nav-label">Folders</div>
          {folders.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--cn-text-3)', padding: '2px 16px 8px' }}>No folders yet</p>
            : folders.map((f) => (
              <button key={f} className={`cn-nav-item${activeFolder === f ? ' active' : ''}`} onClick={() => setActiveFolder(f)}>
                <I.Folder /> {f}
              </button>
            ))
          }

          <div className="cn-nav-sep" style={{ marginTop: 'auto' }} />

          {/* Storage */}
          <div className="cn-storage-block">
            <div className="cn-storage-title">
              <span>Storage used</span>
              <span style={{ fontWeight: 400, fontSize: 11 }}>{storagePct}%</span>
            </div>
            <div className="cn-storage-bar-bg">
              <div className={`cn-storage-fill${storagePct > 80 ? ' warn' : ''}`} style={{ width: `${storagePct}%` }} />
            </div>
            <div className="cn-storage-info">{pagination.count || 0} files · 1 GB limit</div>
          </div>
          <button className="cn-upgrade-btn"><I.Zap /> Upgrade plan</button>

          {/* Drop zone */}
          <div className="cn-sidebar-dz">
            <DropZone compact />
          </div>
        </aside>

        {/* ─── MAIN ─────────────────────────────────────────── */}
        <main className="cn-main">

          {/* Subheader */}
          <div className="cn-subheader">
            <div>
              <div className="cn-page-title">
                {{ 'my-drive': 'My Drive', 'shared': 'Shared Files', 'starred': 'Starred' }[activeNav]}
              </div>
              <div className="cn-page-sub">Upload, manage, share and organize your files</div>
            </div>
            <div className="cn-subheader-right">
              <button className={`cn-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => dispatch(setViewMode('grid'))} title="Grid view"><I.Grid /></button>
              <button className={`cn-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => dispatch(setViewMode('list'))} title="List view"><I.List /></button>
            </div>
          </div>

          {/* Folder tab pills */}
          <div className="cn-folder-bar">
            <button className={`cn-folder-tab${activeFolder === 'all' ? ' active' : ''}`} onClick={() => setActiveFolder('all')}>
              All files
            </button>
            {folders.map((f) => (
              <button key={f} className={`cn-folder-tab${activeFolder === f ? ' active' : ''}`} onClick={() => setActiveFolder(f)}>
                <I.Folder /> {f}
              </button>
            ))}
          </div>

          {/* Count */}
          <div className="cn-count-bar">
            <span className="cn-count-text">
              {loading ? 'Loading…' : `${visibleFiles.length} of ${pagination.count || 0} file${pagination.count !== 1 ? 's' : ''}`}
              {searchQuery && ` — results for "${searchQuery}"`}
            </span>
          </div>

          {/* List header row */}
          {viewMode === 'list' && !loading && visibleFiles.length > 0 && (
            <div className="cn-list-header">
              <span /><span>Name</span><span>Size</span><span>Uploaded</span><span />
            </div>
          )}

          {/* Content */}
          <div className="cn-content">
            {loading ? (
              <div className="cn-loading">
                <div className="cn-spinner" />
                <span>Loading your files…</span>
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="cn-empty">
                <div className="cn-empty-ico">
                  <svg width="34" height="34" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                </div>
                <p className="cn-empty-title">{searchQuery ? 'No files found' : 'No files here yet'}</p>
                <p className="cn-empty-sub">
                  {searchQuery ? 'Try a different search term.' : 'Upload files using the sidebar or drag and drop.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="cn-grid">
                {visibleFiles.map((file) => (
                  <GridCard key={file.id} file={file} folderName={folderMap[file.id] || ''} onMore={openMore} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {visibleFiles.map((file) => (
                  <ListRow key={file.id} file={file} folderName={folderMap[file.id] || ''} onMore={openMore} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cn-pagination">
              <button className="cn-pg-btn" disabled={!pagination.previous} onClick={() => dispatch(setPage(pagination.currentPage - 1))}>← Prev</button>
              {visiblePages.map((p, idx) =>
                p === '...'
                  ? <span key={`e${idx}`} className="cn-pg-ellipsis">…</span>
                  : <button key={p} className={`cn-pg-num${p === pagination.currentPage ? ' active' : ''}`} onClick={() => dispatch(setPage(p))}>{p}</button>
              )}
              <button className="cn-pg-btn" disabled={!pagination.next} onClick={() => dispatch(setPage(pagination.currentPage + 1))}>Next →</button>
            </div>
          )}
        </main>
      </div>

      {/* ─── DROPDOWN (fixed, always visible) ─────────────── */}
      {dropdown && (
        <Dropdown
          file={dropdown.file}
          pos={{ x: dropdown.x, y: dropdown.y }}
          onClose={() => setDropdown(null)}
          onDownload={doDownload}
          onShare={(f) => setModal({ type: 'share', file: f })}
          onRename={(f) => setModal({ type: 'rename', file: f })}
          onOrganize={doOrganize}
          onInfo={(f) => setModal({ type: 'info', file: f })}
          onDelete={(f) => setModal({ type: 'delete', file: f })}
        />
      )}

      {/* ─── MODALS ───────────────────────────────────────── */}
      {modal?.type === 'delete' && (
        <DeleteModal file={modal.file} onConfirm={confirmDelete} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'rename' && (
        <RenameModal file={modal.file} onConfirm={confirmRename} onCancel={() => setModal(null)} />
      )}
      {modal?.type === 'info' && (
        <InfoModal file={modal.file} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'share' && (
        <ShareModal file={modal.file} onConfirm={confirmShare} onCancel={() => setModal(null)} />
      )}

      {/* ─── TOAST ────────────────────────────────────────── */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  )
}