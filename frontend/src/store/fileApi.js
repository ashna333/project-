import axios from 'axios'
import api from '../api/axiosInstance'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
})



export const fetchFilesApi = (page = 1, pageSize = 12, search = '', filters = {}) =>
  api.get(`${API_BASE}/`, {
    headers: authHeaders(),
    params: { 
      page, 
      page_size: pageSize, 
      search, 
      ...filters // This turns { is_starred: true } into ?is_starred=true
    },
  })



// fileApi.js
export const checkUploadConflictsApi = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  return api.post('/upload/check/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadFilesApi = async (files, options = {}) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (options.resolutions) {
    formData.append('resolutions', JSON.stringify(options.resolutions));
  }
  return api.post('/upload/', formData, {
    ...(options?.onUploadProgress && { onUploadProgress: options.onUploadProgress }),
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
  
export const deleteFileApi = (fileId) =>
   api.delete(`/${fileId}/delete/`)




export const downloadFileApi = (fileId) =>
  api.get(`/${fileId}/download/`, { responseType: 'blob' })

export const renameFileApi = (fileId, newName) =>
  api.patch(`/${fileId}/rename/`, { new_name: newName })

export const toggleStarApi = (fileId) =>
  api.post(`/files/${fileId}/star/`)

export const storageSummaryApi = () =>
  api.get('/storage/')

export const fetchSharesApi = (page = 1, pageSize = 12, search = '') =>
  api.get('/shares/', { params: { page, page_size: pageSize, search: search || undefined } })

export const createShareApi = (payload) =>
  api.post('/shares/', payload)

export const fetchTrashApi = (page = 1, pageSize = 12, search = '') =>
  api.get('/trash/', { params: { page, page_size: pageSize, search: search || undefined } })

export const restoreTrashFileApi = (fileId) =>
  api.post(`/trash/${fileId}/restore/`)


export const restoreAllTrashFilesApi = () =>
  api.post('/trash/restore-all/');

export const deleteAllTrashFilesApi = () =>
  api.delete('/trash/empty/');

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

// Private sharing APIs
export const createPrivateShareApi = (payload) =>
  api.post('/private-shares/', payload);

export const fetchPrivateSharesOwnedApi = (page = 1, status = '') =>
  api.get('/private-shares/owned/', { params: { page, page_size: 12, status: status || undefined } });

export const fetchPrivateSharesInboxApi = (page = 1) =>
  api.get('/private-shares/inbox/', { params: { page, page_size: 12 } });

export const lookupUsersApi = (emails) =>
  api.post('/private-shares/lookup/', { emails });

export const downloadPrivateShareApi = (shareId, password = '') =>
  api.get(`/private-shares/${shareId}/download/`, {
    params: password ? { password } : {},
    responseType: 'blob',
  });

export const revokePrivateShareApi = (shareId) =>
  api.delete(`/private-shares/${shareId}/revoke/`);

export const revokePrivateRecipientApi = (shareId, recipientId) =>
  api.delete(`/private-shares/${shareId}/recipients/${recipientId}/revoke/`);

export const fetchPrivateShareAuditApi = (shareId) =>
  api.get(`/private-shares/${shareId}/audit/`);

export const fetchPrivateShareAnalyticsApi = (shareId) =>
  api.get(`/private-shares/${shareId}/analytics/`);

export const postPrivateShareCommentApi = (shareId, payload) =>
  api.post(`/private-shares/${shareId}/comments/`, payload);

export const fetchPrivateShareCommentsApi = (shareId) =>
  api.get(`/private-shares/${shareId}/comments/`);

export const transferFileOwnershipApi = (fileId, newOwnerEmail) =>
  api.post(`/files/${fileId}/transfer/`, { new_owner_email: newOwnerEmail });