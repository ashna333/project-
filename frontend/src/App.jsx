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
import DashboardOverviewPage from './pages/DashboardOverviewPage'
import FileManagerPage from './pages/FileManagerPage'
import FileSharingPage from './pages/FileSharingPage'
import ProfilePage from './pages/ProfilePage'
import TrashPage from './pages/TrashPage'


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
        <Route path="/dashboard" element={<ProtectedRoute><DashboardOverviewPage /></ProtectedRoute>} />
        <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><FileManagerPage /></ProtectedRoute>} />
        <Route path="/sharing" element={<ProtectedRoute><FileSharingPage /></ProtectedRoute>} />
        <Route path="/trash" element={<ProtectedRoute><TrashPage /></ProtectedRoute>} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}