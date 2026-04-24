// src/api/fileApi.js
import api from './axiosInstance'

export const fetchFilesApi = (page = 1, pageSize = 10, search = '') =>
  api.get('/api/', { params: { page, page_size: pageSize, search: search || undefined } })

export const uploadFilesApi = (files, onUploadProgress) => {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  return api.post('/api/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const deleteFileApi = (fileId) =>
  api.delete(`/api/${fileId}/delete/`)

export const downloadFileApi = (fileId) =>
  api.get(`/api/${fileId}/download/`, { responseType: 'blob' })

export const renameFileApi = (fileId, newName) =>
  api.patch(`/api/${fileId}/rename/`, { new_name: newName })

export const storageSummaryApi = () =>
  api.get('/api/storage/')