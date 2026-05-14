// StarredPage.jsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFiles } from '../store/fileThunks';
import { Star } from 'lucide-react';
// ... other imports same as FileManagerPage

export default function StarredPage() {
  const dispatch = useDispatch();
  const { files, pagination, loading } = useSelector((s) => s.files);

  useEffect(() => {
    // Fetch only starred files
    dispatch(fetchFiles(1, 12, '', { is_starred: true }));
  }, [dispatch]);

  return (
    <div className="dashboard-container">
      <main className="dashboard-main">
        <div className="file-manager-header">
          <div className="welcome-sectionfm">
            <div className="welcome-labelfm">Collections</div>
            <h1 className="welcome-titlefm" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star fill="#fbbf24" color="#fbbf24" size={28} /> Starred Files
            </h1>
            <p style={{ color: '#71717a' }}>Quick access to your important items</p>
          </div>
        </div>

        {/* Reuse the list/grid logic from FileManagerPage here */}
        <section className="file-list-container">
  {loading ? (
    <div className="fm-empty-state"><div className="fm-spinner"></div></div>
  ) : files.length === 0 ? (
    <div className="fm-empty-state">
      <Star size={64} color="#27272a" strokeWidth={1} />
      <h2 style={{ color: 'white', marginTop: '16px' }}>No stars yet</h2>
      <p style={{ color: '#71717a' }}>Files you star will appear here for quick access.</p>
    </div>
  ) : (
    /* Use the same grid class you have in FileManagerPage */
    <div className="file-grid-inner"> 
      {files.map((file) => (
        <div key={file.id} className="file-grid-item">
          {/* Preview Box */}
          <div className="file-preview-container">
            {file.mime_type?.includes("image") ? (
              <img src={file.url} alt="" className="file-image-preview" />
            ) : (
              <div className="file-type-preview">
                {file.original_name.split('.').pop().toUpperCase()}
              </div>
            )}
          </div>

          {/* File Info */}
          <div className="file-info-stack">
            <div className="file-name-main" title={file.original_name}>
              {file.original_name}
            </div>
            <div className="file-meta-sub">
              {file.file_size_display} · Starred
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      </main>
    </div>
  );
}