import api from './axiosInstance'

/**
 * POST /api/register/
 * Body: { first_name, last_name, email, password, confirm_password, dob }
 */
export const registerApi = (data) =>
  api.post('/register/', data)

/**
 * POST /api/login/
 * Body: { email, password }
 * Returns: { message, tokens: { access, refresh } }
 */
export const loginApi = (email, password) =>
  api.post('/login/', { email, password })

/**
 * POST /api/change-password/   [protected]
 * Body: { old_password, new_password, confirm_new_password }
 */
export const changePasswordApi = (data) =>
  api.post('/change-password/', data)

/**
 * POST /api/forgot-password/
 * Body: { email }
 */
export const forgotPasswordApi = (email) =>
  api.post('/forgot-password/', { email })

/**
 * POST /api/reset-password/
 * Body: { token, new_password }
 */
export const resetPasswordApi = (token, newPassword) =>
  api.post('/reset-password/', { token, new_password: newPassword })