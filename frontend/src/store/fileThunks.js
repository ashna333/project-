// src/store/fileThunks.js
import {
  fetchFilesStart, fetchFilesSuccess, fetchFilesFailure,
  uploadStart, uploadSuccess, uploadFailure,
  deleteFileSuccess, deleteFileFailure,
  renameFileSuccess, renameFileFailure,updateFileSuccess,updateUserSuccess, 
  passwordChangeSuccess, 
  setOperationFailure,
} from './fileSlice'
import {
  fetchFilesApi, uploadFilesApi, deleteFileApi,
  downloadFileApi, renameFileApi,
  fetchPublicShareApi, downloadPublicFileApi ,toggleStarApi
} from './fileApi'

import api from '../api/axiosInstance';

// FIX THIS PART inside fetchFiles thunk


export const fetchFiles = (page = 1, pageSize = 12, search = '', filters = {}) => async (dispatch) => {
  dispatch(fetchFilesStart())

  try {
    // Pass filters into your API function
    const { data } = await fetchFilesApi(page, pageSize, search, filters)

    dispatch(fetchFilesSuccess({
      files: data.results.files,
      count: data.count,
      next: data.next,
      previous: data.previous,
      storage: data.results.storage,
      currentPage: page,
      pageSize: pageSize,
    }))

  } catch (err) {
    dispatch(fetchFilesFailure('Failed to fetch files.'))
  }
}
// yourActions.js
export const uploadFiles = (files, options = {}) => async (dispatch) => {
  dispatch(uploadStart());
  try {
    // Pass the options (containing the progress listener) to the API
    const { data } = await uploadFilesApi(files, options); 
    console.log("Data:", data.message);
    dispatch(uploadSuccess({ message: data.message }));
    dispatch(fetchFiles());
    return { 
        success: true, 
        message: data.message,
        skipped: data.skipped_duplicates || [],
        createdCount: data.created_count
      };
 } catch (err) {
    const errors = err.response?.data;
    let message = 'Upload failed.';
    
    if (errors) {
      // If Django returns {"files": ["error message"]}, this flattens it
      message = Object.values(errors).flat().join(' ');
    }
    
    dispatch(uploadFailure(message));
    // Return the message so the component can use it
    return { success: false, error: message }; 
}
};


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

export const toggleFileStar = (fileId) => async (dispatch, getState) => {
  try {
    const response = await toggleStarApi(fileId);
    
    // Option A: Refresh the whole list (Safest)
    const { pagination, searchQuery } = getState().files;
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery));
    
    return response.data;
  } catch (error) {
    console.error("Star toggle failed", error);
    throw error;
  }
};

export const downloadPublicFile = (token, fileName) => async () => {
  try {
    const { data } = await downloadPublicFileApi(token);
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error("Public download failed:", err);
    return { success: false };
  }
};

export const updateProfile = (userData) => async (dispatch) => {
  try {
    dispatch(clearMessages());
    const response = await axios.patch(`${API_BASE}/auth/profile/update/`, userData, {
      headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
    });

    // 1. Update Redux
    dispatch(updateUserSuccess(response.data));

    // 2. Update LocalStorage so AppShell header updates
    const currentAuth = JSON.parse(localStorage.getItem('auth_user')) || {};
    localStorage.setItem('auth_user', JSON.stringify({ ...currentAuth, ...response.data }));
    
    return { success: true };
  } catch (err) {
    const msg = err.response?.data?.detail || 'Failed to update profile';
    dispatch(setOperationFailure(msg));
    return { success: false, error: msg };
  }
};

// CHANGE PASSWORD
export const changePasswordAction = (passwordData) => async (dispatch) => {
  try {
    const response = await api.post('/change-password/', passwordData);

    return {
      success: true,
      data: response.data,
    };

  } catch (error) {
    console.log("Full Error:", error);

    console.log("RAW BACKEND RESPONSE:", error?.response?.data);

    const backendMessage =
      error?.response?.data?.detail ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.response?.data?.old_password?.[0] ||
      error?.response?.data?.new_password?.[0] ||
      JSON.stringify(error?.response?.data) ||
      "Password update failed. Please try again.";

    console.log("Backend Error Details:", backendMessage);

    return {
      success: false,
      error: backendMessage,
    };
  }
};