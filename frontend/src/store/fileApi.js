import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access')}`,
})

export const fetchFilesApi = (page = 1, pageSize = 10, search = '') =>
  axios.get(`${API_BASE}/files/`, {
    headers: authHeaders(),
    params: { page, page_size: pageSize, search },
  })

export const uploadFilesApi = (files) => {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  return axios.post(`${API_BASE}/files/upload/`, formData, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
  })
}

export const deleteFileApi = (fileId) =>
  axios.delete(`${API_BASE}/files/${fileId}/`, { headers: authHeaders() })

export const downloadFileApi = (fileId) =>
  axios.get(`${API_BASE}/files/${fileId}/download/`, {
    headers: authHeaders(),
    responseType: 'blob',
  })

export const renameFileApi = (fileId, newName) =>
  axios.patch(`${API_BASE}/files/${fileId}/rename/`, { original_name: newName }, {
    headers: authHeaders(),
  })