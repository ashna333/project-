import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Soft logout — clears tokens + updates Zustand without a full page reload.
// Uses a dynamic import to avoid a circular dependency between
// axiosInstance ↔ authStore.
const softLogout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  // Dynamically import the store so there is no circular import at module load time.
  import('../store/authStore').then(({ default: useAuthStore }) => {
    useAuthStore.getState().logout()
  })
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`
            return api(original)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      original._retry = true
      isRefreshing = true
      const refresh = localStorage.getItem('refresh_token')
      
      if (refresh) {
        try {
          const baseURL = api.defaults.baseURL || 'http://127.0.0.1:800/api';
          const { data } = await axios.post(`${baseURL}/token/refresh/`, { refresh })
          
          localStorage.setItem('access_token', data.access)
          // If the backend rotates tokens, save the new refresh token too
          if (data.refresh) localStorage.setItem('refresh_token', data.refresh)
          
          original.headers.Authorization = `Bearer ${data.access}`
          
          processQueue(null, data.access)
          isRefreshing = false
          
          return api(original)
        } catch (refreshError) {
          // Both access AND refresh tokens are invalid — truly log out.
          processQueue(refreshError, null)
          isRefreshing = false
          
          softLogout()
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token at all — log out cleanly.
        isRefreshing = false
        softLogout()
      }
    }
    return Promise.reject(error)
  }
)

export default api