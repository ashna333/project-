// src/components/DropZone.jsx
import { useState, useRef, useCallback } from 'react'
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
  const inputRef = useRef()

  const validate = (files) => {
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE)
    if (oversized.length) {
      setLocalError(`File(s) too large (max 100MB): ${oversized.map(f => f.name).join(', ')}`)
      return false
    }
    return true
  }

  const handleFiles = useCallback(async (fileList) => {
    setLocalError('')
    setSkipped([])
    dispatch(clearMessages())
    const files = Array.from(fileList)
    if (!files.length) return
    if (!validate(files)) return
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
    </div>
  )
}