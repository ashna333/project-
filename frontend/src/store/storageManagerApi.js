/**
 * storageManagerApi.js
 * Follows your existing fileApi.js pattern — uses `api` (axiosInstance),
 * no manual auth headers needed (axiosInstance handles it).
 */

import api from '../api/axiosInstance'

export const fetchStorageManagerSummaryApi = () =>
  api.get('/storage-manager/summary/')

export const fetchDuplicateGroupsApi = () =>
  api.get('/storage-manager/duplicates/')

export const deleteDuplicateGroupApi = (fileHash) =>
  api.delete(`/storage-manager/duplicates/${fileHash}/`)

export const fetchLargeFilesApi = (thresholdMb = 60) =>
  api.get('/storage-manager/large-files/', { params: { threshold_mb: thresholdMb } })

export const fetchStaleDownloadsApi = (days = 90) =>
  api.get('/storage-manager/stale/', { params: { days } })

export const deleteStorageFilesApi = (fileIds) =>
  api.delete('/storage-manager/files/', { data: { file_ids: fileIds } })

export const cleanAllStorageSuggestionsApi = () =>
  api.delete('/storage-manager/clean-all/')