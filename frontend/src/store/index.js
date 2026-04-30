// ✅ src/store/index.js (or store.js)
import { configureStore } from '@reduxjs/toolkit'
import fileReducer from './fileSlice'
// import other reducers...

export const store = configureStore({
  reducer: {
    files: fileReducer,
    // auth: authReducer,  ← add others here
  },
  // thunk middleware is included automatically by configureStore ✅
})
export default store