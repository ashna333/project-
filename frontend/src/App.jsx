import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import useAuthStore from './store/authStore'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import FileManagerPage from './pages/FileManagerPage'


export default function App() {
  const hydrateUser = useAuthStore((state) => state.hydrateUser)

  useEffect(() => {
    hydrateUser()
  }, [hydrateUser])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public only */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DashboardPage defaultTab="profile" /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><FileManagerPage /></ProtectedRoute>} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}