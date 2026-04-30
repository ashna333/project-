// src/api/fileApi.js
import api from './axiosInstance'

export const fetchFilesApi = (page = 1, pageSize = 10, search = '') =>
  api.get('/', { params: { page, page_size: pageSize, search: search || undefined } })

export const uploadFilesApi = (files, onUploadProgress) => {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  return api.post('/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}

export const deleteFileApi = (fileId) =>
  api.delete(`/${fileId}/delete/`)

export const downloadFileApi = (fileId) =>
  api.get(`/${fileId}/download/`, { responseType: 'blob' })

export const renameFileApi = (fileId, newName) =>
  api.patch(`/${fileId}/rename/`, { new_name: newName })

export const storageSummaryApi = () =>
  api.get('/storage/')

export const fetchSharesApi = (page = 1, pageSize = 10, search = '') =>
  api.get('/shares/', { params: { page, page_size: pageSize, search: search || undefined } })

export const createShareApi = (payload) =>
  api.post('/shares/', payload)

export const fetchTrashApi = (page = 1, pageSize = 10, search = '') =>
  api.get('/trash/', { params: { page, page_size: pageSize, search: search || undefined } })

export const restoreTrashFileApi = (fileId) =>
  api.post(`/trash/${fileId}/restore/`)

export const destroyTrashFileApi = (fileId) =>
  api.delete(`/trash/${fileId}/destroy/`)