import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { File as FileIcon, Download, CloudUpload, AlertCircle, Clock } from 'lucide-react';
import { fetchPublicShareApi, downloadPublicFileApi } from '../store/fileApi';
import '../styles/PublicSharePage.css';


const BG_IMAGE = "https://images.unsplash.com/photo-1761078739436-ccee01f3d89c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NjV8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGRhcmslMjB0ZXh0dXJlfGVufDB8fHx8MTc3NzY1MDYyOHww&ixlib=rb-4.1.0&q=85";

const formatSize = (bytes) => {
  if (!bytes) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + sizes[i];
};

export default function PublicSharePage() {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [info, setInfo] = useState(null); // Rename fileData to info for consistency



  useEffect(() => {
    const getFileData = async () => {
      try {
        const response = await fetchPublicShareApi(token);
        setFileData(response.data);
      } catch (err) {
        // 1. Try to get the specific error message from the backend
        // 2. Fall back to a generic message if the backend didn't provide one
        const backendError = err?.response?.data?.error || err?.response?.data?.detail;
        
        if (backendError) {
          setError(backendError);
        } else {
          setError("An unexpected error occurred while loading the share.");
        }
      }
    };
    getFileData();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await downloadPublicFileApi(token);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileData?.file_name || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };
   
  return (
    <div className="public-share-root" style={{ backgroundImage: `linear-gradient(rgba(9,9,11,0.85), rgba(9,9,11,0.98)), url(${BG_IMAGE})` }}>
      <div className="public-share-container">
        {/* Brand Header */}
        <div className="public-share-header">
          <div className="brand-logo-box">
            <CloudUpload size={20} color="white" />
          </div>
          <span className="brand-text">Cloud<span className="text-rose">Share</span></span>
        </div>

        {error ? (
          <div className="public-card error-card">
            <AlertCircle size={56} className="icon-rose mb-4" />
            <h1 className="card-title">{error}</h1>
           
          </div>
        ) : !fileData ? (
          <div className="public-card loading-card">Loading...</div>
        ) : (
          <div className="public-card main-card">
            <div className="card-top-label">Shared with you</div>
            <div className="sender-info">
                from <span className="text-white">{fileData?.sender || "a CloudShare User"}</span>
              
                </div>

            <div className="file-icon-box">
              <FileIcon size={40} className="icon-rose" />
            </div>

            <h1 className="file-display-name">{fileData.file_name}</h1>
            <div className="file-display-size">{formatSize(fileData.file_size)}</div>

            {fileData.message && (
              <div className="message-box">
                <div className="message-label">Message</div>
                <div className="message-content">{fileData.message}</div>
              </div>
            )}

            <div className="expiry-row">
              <Clock size={14} />
              <span>Expires {new Date(fileData.expires_at).toLocaleString()}</span>
            </div>

            <button className="download-btn" onClick={handleDownload} disabled={downloading}>
              <Download size={20} />
              {downloading ? "Downloading..." : "Download file"}
            </button>
          </div>
        )}

        <div className="powered-by">
          Powered by <span className="text-rose">CloudShare</span>
        </div>
      </div>
    </div>
  );
}