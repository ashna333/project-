import React, { useEffect, useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon,
  Trash
} from 'lucide-react';
import { fetchTrashApi, restoreTrashFileApi, destroyTrashFileApi ,restoreAllTrashFilesApi,deleteAllTrashFilesApi} from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import '../styles/DashboardPage.css'; 



export default function TrashPage() {
  const [files, setFiles] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const { showToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;


  const getFileIcon = (file) => {
    const type = (file?.mime_type || "").toLowerCase();
    const name = (file?.original_name || "").toLowerCase();
    if (type.includes("pdf") || type.includes("text") || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/)) {
      return <FileText size={20} className="text-rose" />;
    }
    if (type.includes("image") || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/)) {
      return <ImageIcon size={20} className="text-rose" />;
    }
    return <FileIcon size={20} className="text-rose" />;
  };

  const loadTrash = async (targetPage = 1) => {
  setLoading(true);
  try {
    const { data } = await fetchTrashApi(targetPage, pageSize, ''); 
    setFiles(data.results?.files || []);
    const totalCount = data.count || 0;
    setCount(totalCount); 
    const calculatedPages = Math.ceil(totalCount / pageSize);
    setTotalPages(calculatedPages || 1);
    setCurrentPage(targetPage);
  } catch {
    showToast('Failed to load trash.');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => { loadTrash(page); }, [page]);

   const handlePageChange = (newPage) => {
    loadTrash(newPage);
  };

  const handleRestore = async (fileId) => {
    setActionLoading(fileId);
    try {
      await restoreTrashFileApi(fileId);
      showToast('File restored successfully.');
      loadTrash(page);
    } catch {
      showToast('Failed to restore file.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return;
    setActionLoading(fileId);
    try {
      await destroyTrashFileApi(fileId);
      showToast('File permanently deleted.');
      loadTrash(page);
    } catch {
      showToast('Failed to delete file.');
    } finally {
      setActionLoading(null);
    }
  };

const handleRestoreAll = async () => {
    
    if (count === 0) return; 
    
    if (!window.confirm(`Restore all ${count} files to your library?`)) return;

    setActionLoading('bulk-restore');
    try {
      // 2. This hits the backend once. The backend handles ALL files for this user.
      await restoreAllTrashFilesApi(); 
      console.log('Restore all API response:', response); // Log the full response for debugging
      
      showToast('All files restored.');
      
      // 3. Refresh the UI to show an empty trash and reset to page 1
      loadTrash(1);
      setPage(1);
    } catch (error) {
      showToast('Failed to restore files.');
    } finally {
      setActionLoading(null);
    }
};
  const handleEmptyTrash = async () => {
    if (count === 0) return; 
    if (!window.confirm(`Permanently delete ALL ${count} files?`)) return;

    setActionLoading('bulk-delete');
    
    try {
       await deleteAllTrashFilesApi();
      showToast('Trash emptied.');
      loadTrash(1);
      setPage(1);
    } catch {
      showToast('Failed to clear trash.');
    } finally {
      setActionLoading(null);
    }
  };



  return (
    <>
      <main className="dashboard-main fade-in">
        <div className="file-manager-header">
          <div className="welcome-sectionfm">
            <div className="welcome-labelfm">Maintenance</div>
            <h1 className="welcome-titlefm">Trash Can</h1>
            <p style={{ color: '#71717a' }}>{count} items · Restore them or clear permanently</p>
          </div>

          <div className="trash-header-actions" style={{ display: 'flex', gap: '10px' }}>
            {files.length > 0 && (
              <>
                <button 
                  className="p-btn active-btn" 
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                  onClick={handleRestoreAll}
                  disabled={!!actionLoading}
                >
                  <RotateCcw size={16} style={{ marginRight: '8px' }} />
                  Restore All
                </button>
                <button 
                  className="btn-revoke" 
                  onClick={handleEmptyTrash}
                  disabled={!!actionLoading}
                >
                  <Trash2 size={16} style={{ marginRight: '8px' }} />
                  Empty Trash
                </button>
              </>
            )}
          </div>
        </div>

        <section className="file-list-container">
          {loading ? (
            <div className="fm-empty-state"><div className="fm-spinner"></div></div>
          ) : files.length === 0 ? (
            <div className="fm-empty-state">
              <Trash size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>Trash is empty</h2>
            </div>
          ) : (
            <div className="file-list-card">
              <ul className="file-ul">
                {files.map((file) => (
                  
                  
                  <li key={file.id} className="file-row-item">
                    <div className="file-icon-square">
                      {getFileIcon(file)}
                    </div>

                    <div className="file-info-stack">
                      <div className="file-name-main">{file.original_name}</div>
                      <div className="file-meta-sub">
                        {file.file_size_display} 
                         
                      </div>
                    </div>

                    <div className="file-actions-strip">
                      <button
                        className="icon-action-btn hover-white"
                        title="Restore"
                        onClick={() => handleRestore(file.id)}
                        disabled={!!actionLoading}
                      >
                        <RotateCcw size={16} />
                      </button>

                      <button 
                        className="icon-action-btn hover-rose" 
                        title="Permanently Delete"
                        onClick={() => handleDelete(file.id)}
                        disabled={!!actionLoading}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </section>
      </main>
    </>
  );
}