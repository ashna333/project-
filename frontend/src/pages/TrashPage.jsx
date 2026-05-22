import React, { useEffect, useState } from 'react';
import {
  Trash2,
  RotateCcw,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Trash
} from 'lucide-react';
import { fetchTrashApi, restoreTrashFileApi, destroyTrashFileApi, restoreAllTrashFilesApi, deleteAllTrashFilesApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import FileGrid from '../components/FileGrid';
import ViewToggle from '../components/ViewToggle';
import useViewMode from '../hooks/useViewMode';

import '../styles/DashboardPage.css';

export default function TrashPage() {
  const [files, setFiles] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const { showToast } = useToast();
  const [viewMode, handleViewMode] = useViewMode('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;
  const [confirmModal, setConfirmModal] = useState(null);

  useBodyScrollLock(!!confirmModal);

  const getFileIcon = (file) => {
    const type = (file?.mime_type || '').toLowerCase();
    const name = (file?.original_name || '').toLowerCase();
    if (type.includes('pdf') || type.includes('text') || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/)) {
      return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/)) {
      return <ImageIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    return <FileIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const loadTrash = async (targetPage = 1) => {
    setLoading(true);
    try {
      const { data } = await fetchTrashApi(targetPage, pageSize, '');
      setFiles(data.results?.files || []);
      const totalCount = data.count || 0;
      setCount(totalCount);
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
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

  const handleRestore = (file) => {
    setConfirmModal({
      title: 'Restore file?',
      message: `"${file.original_name}" will be moved back to your library.`,
      variant: 'primary',
      confirmLabel: 'Restore',
      onConfirm: async () => {
        setActionLoading(file.id);
        try {
          await restoreTrashFileApi(file.id);
          showToast('File restored successfully.');
          loadTrash(page);
        } catch {
          showToast('Failed to restore file.');
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleDelete = (file) => {
    setConfirmModal({
      title: 'Permanently delete?',
      message: 'This file will be deleted forever. This cannot be undone.',
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        setActionLoading(file.id);
        try {
          await destroyTrashFileApi(file.id);
          showToast('File permanently deleted.');
          loadTrash(page);
        } catch {
          showToast('Failed to delete file.');
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleRestoreAll = () => {
    if (count === 0) return;
    setConfirmModal({
      title: 'Restore all files?',
      message: `Restore all ${count} files to your library?`,
      variant: 'primary',
      confirmLabel: 'Restore All',
      onConfirm: async () => {
        setActionLoading('bulk-restore');
        try {
          await restoreAllTrashFilesApi();
          showToast('All files restored.');
          loadTrash(1);
          setPage(1);
        } catch {
          showToast('Failed to restore files.');
        } finally {
          setActionLoading(null);
          setConfirmModal(null);
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    if (count === 0) return;
    setConfirmModal({
      title: 'Empty trash?',
      message: `Permanently delete ALL ${count} files? This cannot be undone.`,
      confirmLabel: 'Empty Trash',
      onConfirm: async () => {
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
          setConfirmModal(null);
        }
      },
    });
  };

 return (
  <>
    <main className="dashboard-main fade-in">
      <div className="file-manager-header">
        <div className="welcome-sectionfm">
          <div className="welcome-labelfm">Maintenance</div>
          <h1 className="welcome-titlefm">Trash Can</h1>
          <p style={{ color: '#71717a' }}>{count} items · Restore or clear permanently</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
        {/* View toggle sits here, just above the file list */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <ViewToggle viewMode={viewMode} onChange={handleViewMode} />
        </div>

        {loading ? (
          <div className="fm-empty-state"><div className="fm-spinner" /></div>
        ) : files.length === 0 ? (
          <div className="fm-empty-state">
            <Trash size={60} color="#27272a" strokeWidth={1} />
            <h2 style={{ marginTop: '20px', color: 'white' }}>Trash is empty</h2>
          </div>
        ) : (
          <FileGrid
            files={files}
            viewMode={viewMode}
            getFileIcon={getFileIcon}
            formatFileSize={formatFileSize}
            onDelete={handleDelete}
            onRestore={handleRestore}
            isTrash={true}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          loading={loading}
        />
      </section>
    </main>

    <ConfirmModal
      open={!!confirmModal}
      title={confirmModal?.title}
      message={confirmModal?.message}
      confirmLabel={confirmModal?.confirmLabel || 'Confirm'}
      variant={confirmModal?.variant === 'primary' ? 'primary' : 'danger'}
      loading={!!actionLoading}
      onConfirm={confirmModal?.onConfirm}
      onCancel={() => setConfirmModal(null)}
    />
  </>
);
}