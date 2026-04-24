// src/store/index.js
import { createStore, combineReducers } from 'redux'
import fileReducer from './fileSlice'

const rootReducer = combineReducers({
  files: fileReducer,
})

const store = createStore(
  rootReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__?.()
)

export default store