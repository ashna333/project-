// src/pages/FileManagerPage.jsx
import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchFiles } from '../store/fileThunks'
import { setPage, setSearchQuery, setViewMode, clearMessages } from '../store/fileSlice'
import DropZone from '../components/DropZone'
import FileCard from '../components/FileCard'
import StorageBar from '../components/StorageBar'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function FileManagerPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const {
    files, pagination, loading, viewMode, searchQuery,
  } = useSelector(s => s.files)

  const [searchInput, setSearchInput] = useState('')

  // Fetch on mount and when page/search changes
  useEffect(() => {
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))
  }, [pagination.currentPage, searchQuery])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setSearchQuery(searchInput))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const totalPages = Math.ceil(pagination.count / pagination.pageSize)

  return (
    <div className="fm-root">
      {/* Navbar */}
      <nav className="fm-nav">
        <div className="fm-nav-brand">⚡ AuthApp</div>
        <div className="fm-nav-links">
          <button className="fm-nav-link active">Files</button>
          <button className="fm-nav-link" onClick={() => navigate('/dashboard')}>Dashboard</button>
        </div>
        <button className="fm-nav-logout" onClick={handleLogout}>Sign out</button>
      </nav>

      <div className="fm-body">
        {/* Sidebar */}
        <aside className="fm-sidebar">
          <div className="fm-sidebar-title">File Manager</div>
          <StorageBar />
          <DropZone />
        </aside>

        {/* Main */}
        <main className="fm-main">
          {/* Toolbar */}
          <div className="fm-toolbar">
            <div className="fm-search-wrap">
              <span className="fm-search-icon">🔍</span>
              <input
                className="fm-search"
                placeholder="Search files..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button className="fm-search-clear" onClick={() => { setSearchInput(''); dispatch(setSearchQuery('')) }}>✕</button>
              )}
            </div>

            <div className="fm-view-toggle">
              <button
                className={`fm-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => dispatch(setViewMode('grid'))}
                title="Grid view"
              >
                ⊞
              </button>
              <button
                className={`fm-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => dispatch(setViewMode('list'))}
                title="List view"
              >
                ☰
              </button>
            </div>
          </div>

          {/* File count */}
          <div className="fm-count">
            {loading ? 'Loading...' : (
              pagination.count === 0
                ? (searchQuery ? 'No files match your search.' : 'No files uploaded yet.')
                : `${pagination.count} file${pagination.count !== 1 ? 's' : ''}${searchQuery ? ` matching "${searchQuery}"` : ''}`
            )}
          </div>

          {/* List header */}
          {viewMode === 'list' && files.length > 0 && (
            <div className="file-list-header">
              <span></span>
              <span>Name</span>
              <span>Size</span>
              <span>Uploaded</span>
              <span>Actions</span>
            </div>
          )}

          {/* Files */}
          {loading ? (
            <div className="fm-loading">
              <div className="spinner-dark" />
              <span>Loading files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="fm-empty">
              <div className="fm-empty-icon">📁</div>
              <p>{searchQuery ? 'No files match your search.' : 'Upload your first file using the panel on the left.'}</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'fm-grid' : 'fm-list'}>
              {files.map(file => (
                <FileCard key={file.id} file={file} viewMode={viewMode} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="fm-pagination">
              <button
                className="fm-page-btn"
                disabled={!pagination.previous}
                onClick={() => dispatch(setPage(pagination.currentPage - 1))}
              >
                ← Prev
              </button>
              <div className="fm-page-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className={`fm-page-num ${p === pagination.currentPage ? 'active' : ''}`}
                    onClick={() => dispatch(setPage(p))}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                className="fm-page-btn"
                disabled={!pagination.next}
                onClick={() => dispatch(setPage(pagination.currentPage + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}