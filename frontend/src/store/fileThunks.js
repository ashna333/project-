// src/store/fileThunks.js
import {
  fetchFilesStart, fetchFilesSuccess, fetchFilesFailure,
  uploadStart, uploadSuccess, uploadFailure,
  deleteFileSuccess, deleteFileFailure,
  renameFileSuccess, renameFileFailure,
} from './fileSlice'
import {
  fetchFilesApi, uploadFilesApi, deleteFileApi,
  downloadFileApi, renameFileApi,
} from '../api/fileApi'

export const fetchFiles = (page = 1, pageSize = 10, search = '') => async (dispatch) => {
  dispatch(fetchFilesStart())
  try {
    const { data } = await fetchFilesApi(page, pageSize, search)
    dispatch(fetchFilesSuccess({
      files: data.results.files,
      count: data.count,
      next: data.next,
      previous: data.previous,
      storage: data.results.storage,
    }))
  } catch (err) {
    dispatch(fetchFilesFailure(err.response?.data?.detail || 'Failed to fetch files.'))
  }
}

export const uploadFiles = (files) => async (dispatch) => {
  dispatch(uploadStart())
  try {
    const { data } = await uploadFilesApi(files)
    dispatch(uploadSuccess({ message: data.message }))
    // Refresh file list after upload
    dispatch(fetchFiles())
    return { success: true, skipped: data.skipped_duplicates || [] }
  } catch (err) {
    const errors = err.response?.data
    let message = 'Upload failed.'
    if (errors) {
      const msgs = Object.values(errors).flat().join(' ')
      if (msgs) message = msgs
    }
    dispatch(uploadFailure(message))
    return { success: false }
  }
}

export const deleteFile = (fileId) => async (dispatch) => {
  try {
    await deleteFileApi(fileId)
    dispatch(deleteFileSuccess(fileId))
    // Refresh to update storage summary
    dispatch(fetchFiles())
    return { success: true }
  } catch (err) {
    dispatch(deleteFileFailure(err.response?.data?.error || 'Failed to delete file.'))
    return { success: false }
  }
}

export const downloadFile = (fileId, fileName) => async () => {
  try {
    const { data } = await downloadFileApi(fileId)
    const url = window.URL.createObjectURL(new Blob([data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return { success: true }
  } catch {
    return { success: false }
  }
}

export const renameFile = (fileId, newName) => async (dispatch) => {
  try {
    const { data } = await renameFileApi(fileId, newName)
    dispatch(renameFileSuccess(data.file))
    return { success: true }
  } catch (err) {
    dispatch(renameFileFailure(err.response?.data?.error || 'Failed to rename file.'))
    return { success: false }
  }
}