// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import fileReducer from './fileSlice';

// Note: configureStore AUTOMATICALLY adds thunk middleware. 
// You do not need to import createStore or applyMiddleware.

export const store = configureStore({
  reducer: {
    files: fileReducer,
  },
  // This ensures no serializable checks interfere with your File objects
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;