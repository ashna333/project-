/**
 * storageManagerThunks.js
 * Follows your exact fileThunks.js pattern.
 * No Redux slice needed — local component state is enough for this page.
 * Export these and call them from your StorageManager component with dispatch.
 */

import {
  fetchStorageManagerSummaryApi,
  fetchDuplicateGroupsApi,
  deleteDuplicateGroupApi,
  fetchLargeFilesApi,
  fetchStaleDownloadsApi,
  deleteStorageFilesApi,
  cleanAllStorageSuggestionsApi,
} from './storageManagerApi'

/** Fetch the storage bar summary (used_bytes, recoverable_bytes, counts). */
export const fetchStorageManagerSummary = () => async () => {
  try {
    const { data } = await fetchStorageManagerSummaryApi()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to load summary.' }
  }
}

/** Fetch all duplicate file groups. */
export const fetchDuplicateGroups = () => async () => {
  try {
    const { data } = await fetchDuplicateGroupsApi()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to load duplicates.' }
  }
}

/** Keep the original, delete all copies for a given file_hash. */
export const deleteDuplicateGroup = (fileHash) => async () => {
  try {
    const { data } = await deleteDuplicateGroupApi(fileHash)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to delete duplicates.' }
  }
}

/** Fetch files over threshold_mb (default 100 MB). */
export const fetchLargeFiles = (thresholdMb = 60) => async () => {
  try {
    const { data } = await fetchLargeFilesApi(thresholdMb)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to load large files.' }
  }
}

/** Fetch stale installer/archive files not touched in `days` days. */
export const fetchStaleDownloads = (days = 90) => async () => {
  try {
    const { data } = await fetchStaleDownloadsApi(days)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to load stale files.' }
  }
}

/** Hard-delete specific files by ID list. */
export const deleteStorageFiles = (fileIds) => async () => {
  try {
    const { data } = await deleteStorageFilesApi(fileIds)
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Failed to delete files.' }
  }
}

/** Delete ALL suggested files (duplicates + stale downloads) in one shot. */
export const cleanAllStorage = () => async () => {
  try {
    const { data } = await cleanAllStorageSuggestionsApi()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: err.response?.data?.error || 'Clean all failed.' }
  }
}