import { createSlice } from '@reduxjs/toolkit'  // ✅

const initialState = {
  files: [],
  pagination: {
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
    pageSize: 12,
  },
  storage: {
    used_bytes: 0,
    max_bytes: 1073741824,
    used_percent: 0,
    remaining_bytes: 1073741824,
  },
  loading: false,
  uploading: false,
  error: null,
  successMessage: null,
  searchQuery: '',
  viewMode: 'grid', // 'grid' | 'list'
  uploadProgress: [], // [{ name, progress, status }]
}

const fileSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    // Fetch files
   // FIX ONLY THIS PART inside fetchFilesSuccess

// REPLACE WITH:


fetchFilesStart(state) {
  state.loading = true
  state.error = null
},
fetchFilesSuccess(state, action) {
  state.loading = false
  state.files = action.payload.files

  state.pagination = {
    ...state.pagination,
    count: action.payload.count,
    next: action.payload.next,
    previous: action.payload.previous,

    // THIS FIXES PAGE STATE
    currentPage: action.payload.currentPage,

    // THIS KEEPS PAGE SIZE UPDATED
    pageSize: action.payload.pageSize,
  }

  state.storage = action.payload.storage
},
    fetchFilesFailure(state, action) {
      state.loading = false
      state.error = action.payload
    },
    // --- ADD THIS TO FIX THE STAR PERSISTENCE ---
    updateFileSuccess(state, action) {
      const { id, updates } = action.payload
      const index = state.files.findIndex(f => f.id === id)
      if (index !== -1) {
        // This updates the file in the main list so that when you 
        // click it again, 'selectedFile' gets the updated version.
        state.files[index] = { ...state.files[index], ...updates }
      }
    },

    // Upload
    uploadStart(state) {
      state.uploading = true
      state.error = null
      state.successMessage = null
    },
    uploadSuccess(state, action) {
      state.uploading = false
      state.successMessage = action.payload.message
      state.uploadProgress = []
    },
    uploadFailure(state, action) {
      state.uploading = false
      state.error = action.payload
      state.uploadProgress = []
    },
    setUploadProgress(state, action) {
      state.uploadProgress = action.payload
    },

    // Delete
    deleteFileSuccess(state, action) {
      state.files = state.files.filter(f => f.id !== action.payload)
      state.successMessage = 'File deleted successfully.'
    },
    deleteFileFailure(state, action) {
      state.error = action.payload
    },

    // Rename
    renameFileSuccess(state, action) {
      const idx = state.files.findIndex(f => f.id === action.payload.id)
      if (idx !== -1) state.files[idx] = action.payload
      state.successMessage = 'File renamed successfully.'
    },
    renameFileFailure(state, action) {
      state.error = action.payload
    },
    updateUserSuccess(state, action) {
      // If you store user info in this slice, update it here
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
      state.successMessage = 'Profile updated successfully.';
    },

    // Security / Password
    passwordChangeSuccess(state) {
      state.successMessage = 'Password changed successfully.';
      state.error = null;
    },
    
    // Unified Error Handling (Optional: if you want to use it for profile/password)
    setOperationFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    // UI state
    setPage(state, action) {
      state.pagination.currentPage = action.payload
    },
    setSearchQuery(state, action) {
      state.searchQuery = action.payload
      state.pagination.currentPage = 1
    },
    setViewMode(state, action) {
      state.viewMode = action.payload
    },
    clearMessages(state) {
      state.error = null
      state.successMessage = null
    },
  },
})

export const {
  fetchFilesStart, fetchFilesSuccess, fetchFilesFailure,
  uploadStart, uploadSuccess, uploadFailure, setUploadProgress,updateFileSuccess,
  deleteFileSuccess, deleteFileFailure,
  renameFileSuccess, renameFileFailure,
  setPage, setSearchQuery, setViewMode, clearMessages,updateUserSuccess, passwordChangeSuccess, setOperationFailure,
} = fileSlice.actions

export default fileSlice.reducer