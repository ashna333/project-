// src/components/DropZone.jsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { uploadFiles } from '../store/fileThunks'
import { clearMessages } from '../store/fileSlice'


const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export default function DropZone() {
  const dispatch = useDispatch()
  const { uploading, error, successMessage } = useSelector(s => s.files)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState('')
  const [skipped, setSkipped] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const inputRef = useRef()

  useEffect(() => {
    if (!successMessage && !error && !localError && skipped.length === 0) return
  
    const timer = setTimeout(() => {
      dispatch(clearMessages())
      setLocalError('')
      setSkipped([])
    }, 2000) // 3 seconds
  
    return () => clearTimeout(timer)
  }, [successMessage, error, localError, skipped, dispatch])

  const validate = (files) => {
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length) {
      setLocalError(`File(s) too large (max 100MB): ${oversized.map(f => f.name).join(', ')}`)
      return false
    }
    return true
  }

  useEffect(() => () => {
    selectedFiles.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl)
    })
  }, [selectedFiles])

  const handleFiles = useCallback(async (fileList) => {
    setLocalError('')
    setSkipped([])
    dispatch(clearMessages())
    const files = Array.from(fileList)
    if (!files.length) return
    if (!validate(files)) return
    setSelectedFiles(files.slice(0, 4).map((item) => ({
      name: item.name,
      size: `${(item.size / (1024 * 1024)).toFixed(2)} MB`,
      previewUrl: item.type?.startsWith('image/') ? URL.createObjectURL(item) : null,
      isImage: item.type?.startsWith('image/'),
    })))
    const result = await dispatch(uploadFiles(files))
    if (result?.skipped?.length) setSkipped(result.skipped)
  }, [dispatch])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />

        <div className="dropzone-icon">
          {uploading ? (
            <div className="spinner-dark" />
          ) : dragging ? '📂' : '☁️'}
        </div>

        <div className="dropzone-text">
          {uploading ? (
            <><strong>Uploading...</strong><span>Please wait</span></>
          ) : dragging ? (
            <><strong>Drop files here</strong><span>Release to upload</span></>
          ) : (
            <><strong>Drag & drop files here</strong><span>or click to browse · Max 100MB per file · Multiple files supported</span></>
          )}
        </div>
      </div>

      {(localError || error) && (
        <div className="fm-alert fm-alert-error">⚠ {localError || error}</div>
      )}
      {successMessage && (
        <div className="fm-alert fm-alert-success">✓ {successMessage}</div>
      )}
      {skipped.length > 0 && (
        <div className="fm-alert fm-alert-warning">
          ⚠ Skipped duplicate file(s): {skipped.join(', ')}
        </div>
      )}
      {selectedFiles.length > 0 && (
        <div className="upload-preview-wrap">
          <div className="upload-preview-title">Latest upload batch</div>
          <div className="upload-preview-list">
            {selectedFiles.map((item) => (
              <div key={item.name} className="upload-preview-item">
                {item.isImage && item.previewUrl ? (
                  <img src={item.previewUrl} alt={item.name} className="upload-preview-image" />
                ) : (
                  <div className="upload-preview-file">FILE</div>
                )}
                <div className="upload-preview-meta">
                  <span>{item.name}</span>
                  <small>{item.size}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}