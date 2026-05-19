import { create } from 'zustand'
import { loginApi, registerApi, changePasswordApi, forgotPasswordApi, resetPasswordApi, profileApi } from '../api/authApi'

// Bootstrap user from stored tokens on page load
const getInitialUser = () => {
  const access = localStorage.getItem('access_token')
  if (!access) return null
  const storedUser = localStorage.getItem('auth_user')
  if (!storedUser) return null
  try {
    return JSON.parse(storedUser)
  } catch {
    localStorage.removeItem('auth_user')
    return null
  }
}

const useAuthStore = create((set) => ({
  //  State
  user: getInitialUser(),
  isAuthenticated: !!getInitialUser(),
  // True while hydrateUser is running on page load.
  // ProtectedRoute waits for this to be false before deciding to redirect.
  hydrating: true,
  loading: false,
  error: null,
  successMessage: null,

  // Helpers 
  clearMessages: () => set({ error: null, successMessage: null }),
  hydrateUser: async () => {
    const access = localStorage.getItem('access_token')
    const refresh = localStorage.getItem('refresh_token')
    // If there is no token of any kind, the user is simply not logged in.
    if (!access && !refresh) {
      set({ hydrating: false })
      return
    }
    try {
      // profileApi goes through the Axios interceptor.
      // If access_token is null/invalid, the interceptor silently uses
      // refresh_token to obtain a new access_token and retries automatically.
      const { data } = await profileApi()
      localStorage.setItem('auth_user', JSON.stringify(data))
      set({ user: data, isAuthenticated: true, hydrating: false })
    } catch {
      // Both tokens are gone/invalid — clear everything.
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
      set({ user: null, isAuthenticated: false, hydrating: false })
    }
  },

  //  Register 
  register: async (formData) => {
    set({ loading: true, error: null, successMessage: null })
    try {
      await registerApi(formData)
      set({ loading: false, successMessage: 'Account created! Please log in.' })
      return { success: true }
    } catch (err) {
      const errors = err.response?.data
      let message = 'Registration failed. Please try again.'
      if (errors) {
        if (errors.email) {
          message = Array.isArray(errors.email) ? errors.email[0] : errors.email
        } else {
          const msgs = Object.entries(errors)
            .map(([field, val]) => {
              const label = field === 'non_field_errors' ? '' : `${field.replace(/_/g, ' ')}: `
              return label + (Array.isArray(val) ? val.join(', ') : val)
            })
            .join(' | ')
          if (msgs) message = msgs
        }
      }
      set({ loading: false, error: message })
      return { success: false, error: message }
    }
  },

  //  Login 
  login: async (email, password) => {
    set({ loading: true, error: null, successMessage: null })
    try {
      const { data } = await loginApi(email, password)
      const { access, refresh } = data.tokens
      localStorage.setItem('access_token', access)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      set({ loading: false, user: data.user, isAuthenticated: true })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.error || 'Invalid email or password.'
      set({ loading: false, error: message })
      return { success: false }
    }
  },

  //  Logout 
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('auth_user')
    set({ user: null, isAuthenticated: false, error: null, successMessage: null })
  },

  //  Change Password 
  changePassword: async (formData) => {
    set({ loading: true, error: null, successMessage: null })
    try {
      await changePasswordApi(formData)
      set({ loading: false, successMessage: 'Password changed successfully!' })
      return { success: true }
    } catch (err) {
      const errors = err.response?.data
      let message = 'Failed to change password.'
      if (errors?.error) message = errors.error
      else if (errors) {
        const msgs = Object.entries(errors)
          .map(([f, v]) => (f === 'non_field_errors' ? '' : `${f}: `) + (Array.isArray(v) ? v.join(', ') : v))
          .join(' | ')
        if (msgs) message = msgs
      }
      set({ loading: false, error: message })
      return { success: false }
    }
  },

  //  Forgot Password 
  forgotPassword: async (email) => {
    set({ loading: true, error: null, successMessage: null })
    try {
      const { data } = await forgotPasswordApi(email)
      set({ loading: false, successMessage: data.message || 'Reset link sent if email exists.' })
      return { success: true }
    } catch (err) {
      const errors = err.response?.data
      let message = 'Something went wrong. Please try again.'
      if (errors) {
        const msgs = Object.entries(errors)
          .map(([f, v]) => (Array.isArray(v) ? v.join(', ') : v))
          .join(' | ')
        if (msgs) message = msgs
      }
      set({ loading: false, error: message })
      return { success: false }
    }
  },

  //  Reset Password 
  resetPassword: async (token, newPassword,confirmPassword) => {
    set({ loading: true, error: null, successMessage: null })
    console.log("Token:", token)
    try {
      await resetPasswordApi(token, newPassword,confirmPassword)
      set({ loading: false, successMessage: 'Password reset successfully! You can now log in.' })
      return { success: true }
    } catch (err) {
      const errors = err.response?.data
      let message = 'Invalid or expired reset link.'
      if (errors?.error) message = errors.error
      set({ loading: false, error: message })
      return { success: false }
    }
  },
}))

export default useAuthStore