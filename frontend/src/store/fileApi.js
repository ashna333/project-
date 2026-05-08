import axios from 'axios'
import api from '../api/axiosInstance'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})

export const fetchFilesApi = (page = 1, pageSize = 10, search = '') =>
  api.get(`${API_BASE}/`, {
    headers: authHeaders(),
    params: { page, page_size: pageSize, search },
  })

export const uploadFilesApi = (files) => {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  return api.post(`${API_BASE}/upload/`, formData, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
  })
}


// export const uploadFilesApi = (files, onUploadProgress) => {
//   const formData = new FormData()
//   files.forEach(f => formData.append('files', f))
//   return api.post('/upload/', formData, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//     onUploadProgress,
//   })
// }

// export const deleteFileApi = (fileId) =>
//   api.delete(`/${fileId}/delete/`, { headers: authHeaders() })
  
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

export const deleteShareApi = (fileId) =>
  api.delete(`/shares/${fileId}/delete/`)


export const fetchPublicShareApi = (token) =>
  axios.get(`${API_BASE}/public/shares/${token}/`);

export const downloadPublicFileApi = (token) =>
  axios.get(`${API_BASE}/public/shares/${token}/download/`, {
    responseType: 'blob',
  });