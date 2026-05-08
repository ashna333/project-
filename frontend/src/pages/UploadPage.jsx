import React, { useState, useRef, useEffect } from 'react';
import { 
  CloudUpload, 
  Layers, 
  Files, 
  Share2, 
  KeyRound, 
  LogOut, 
  FileText, 
  X,
  CircleCheck,
  CircleAlert
} from 'lucide-react';
import '../styles/DashboardPage.css'; // Reusing your existing styles
import { useNavigate } from 'react-router-dom'; // Add this import
import axios from 'axios'; // Recommended for easy progress tracking
import {uploadFilesApi} from '../store/fileApi'


export default function UploadPage() {
  // Store files as objects to track their specific progress
  const [filesInQueue, setFilesInQueue] = useState([]);
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files).map(file => ({
      file,
      id: `${file.name}-${file.lastModified}-${Date.now()}`, // Unique ID
      progress: 0,
      status: 'queued', // queued, uploading, completed, error
      sizeString: formatSize(file.size)
    }));
    setFilesInQueue((prev) => [...prev, ...newFiles]);
  };





// ... inside your UploadPage component
const navigate = useNavigate();

const startUpload = async () => {
  if (filesInQueue.length === 0 || isUploadingGlobal) return;
  setIsUploadingGlobal(true);

  // 1. Mark all queued files as 'uploading'
  setFilesInQueue(prev => prev.map(f => ({ ...f, status: 'uploading' })));

  try {
    // Extract the raw File objects from your state objects
    const rawFiles = filesInQueue.map(f => f.file);
    
    // 2. Use your helper function
    // Note: Since this sends ALL files in one request, we use one progress tracker
    await uploadFilesApi(rawFiles, {
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setFilesInQueue(prev => prev.map(f => ({ ...f, progress: percent })));
      }
    });

    // 3. If successful, update state and redirect
    setFilesInQueue(prev => prev.map(f => ({ ...f, status: 'completed', progress: 100 })));
    
    setTimeout(() => {
      navigate('/files'); // Redirect to FileManager/Library view
    }, 800);

  } catch (error) {
    // 4. If failed, show error icons and don't redirect
    console.error("Upload failed:", error);
    setFilesInQueue(prev => prev.map(f => ({ ...f, status: 'error' })));
    setIsUploadingGlobal(false);
  }
};

  // Turn off global upload state when all files finish
  useEffect(() => {
    if (isUploadingGlobal && filesInQueue.length > 0) {
        const allFinished = filesInQueue.every(f => f.status === 'completed' || f.status === 'error' || f.status === 'queued');
        if (allFinished) {
            setIsUploadingGlobal(false);
        }
    }
  }, [filesInQueue, isUploadingGlobal]);


  const removeFile = (id) => {
    setFilesInQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => setFilesInQueue([]);

  // Sub-component for individual file item to manage its own layout
  const UploadItem = ({ fileObj, onRemove }) => {
    const { file, progress, status, sizeString, id } = fileObj;
    
    // Status Icon Logic
    let statusIcon = <X size={16} />;
    if (status === 'completed') statusIcon = <CircleCheck size={18} className="text-emerald-500" />;
    if (status === 'error') statusIcon = <CircleAlert size={18} className="text-red-500" />;

    return (
        <div className={`file-item ${status === 'completed' ? 'file-completed' : ''}`}>
          <div className="file-item-left">
            <FileText size={20} className="file-icon" />
            <div className="file-content-block">
                <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-status-info">
                        {status === 'uploading' && <span className="rose-text percentage-text">{Math.round(progress)}%</span>}
                        {status !== 'uploading' && <span className="file-size">{sizeString}</span>}
                    </div>
                </div>
                
                {/* Specific Loading Bar Container - Rose-600 colored */}
                {status === 'uploading' && (
                    <div className="file-loading-bar-container">
                        <div 
                          className="file-loading-bar-fill" 
                          style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                )}
            </div>
          </div>
          
          <button 
            className="remove-file-btn" 
            onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            disabled={status === 'uploading'} // Disable removal while uploading
          >
            {statusIcon}
          </button>
        </div>
    );
  };

  return (
    <div className="dashboard-container">
      {/* Header (reusing old design) */}
     

      <main className="dashboard-main fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header Section */}
        <div className="upload-header-text">
          <div className="welcome-label" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontSize: '12px' }}>Upload</div>
          <h1 className="welcome-title" style={{ fontSize: '40px', fontWeight: '700' }}>Drop files here</h1>
          <p style={{ color: '#a1a1aa', marginTop: '8px', fontSize: '14px' }}>Up to 100 MB per file. Multiple files supported.</p>
        </div>

        {/* Dropzone Area (Clickable to Browse) */}
        <div className="dropzone-container" onClick={() => fileInputRef.current.click()}>
          <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
          <CloudUpload size={64} className="rose-text" style={{ opacity: 0.7 }} />
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '20px', color: 'white' }}>Drag & drop your files</h2>
          <p style={{ color: '#71717a', marginTop: '8px', fontSize: '14px' }}>or click to browse</p>
        </div>

        {/* File Queue Section */}
        {filesInQueue.length > 0 && (
          <div className="file-queue-card fade-in">
            <div className="queue-header">
              <span className="queue-count">{filesInQueue.length} file(s) in queue</span>
              <div className="queue-actions">
                <button className="clear-btn" onClick={clearAll} disabled={isUploadingGlobal}>Clear</button>
                <button 
                    className="upload-all-btn" 
                    onClick={startUpload}
                    disabled={isUploadingGlobal}
                >
                    {isUploadingGlobal ? 'Uploading...' : 'Upload all'}
                </button>
              </div>
            </div>

            <div className="file-list">
              {filesInQueue.map((fileObj) => (
                <UploadItem key={fileObj.id} fileObj={fileObj} onRemove={removeFile} />
              ))}
            </div>
          </div>
        )}

        <footer className="footer-text">CloudShare - Secure file sharing, built for teams.</footer>
      </main>
    </div>
  );
}