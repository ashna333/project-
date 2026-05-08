import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import useAuthStore from './store/authStore'

// Auth Pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage'


// Dashboard/App Pages
import AppShell from './components/AppShell'; // Ensure this matches your filename
import DashboardOverviewPage from './pages/DashboardOverviewPage'
import FileManagerPage from './pages/FileManagerPage'
import FileSharingPage from './pages/FileSharingPage'
import TrashPage from './pages/TrashPage'
import UploadPage from './pages/UploadPage'
import ProfilePage from './pages/ProfilePage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import PublicShare from './pages/PublicShare'
import { ToastProvider } from './components/ToastContext';

export default function App() {
  const hydrateUser = useAuthStore((state) => state.hydrateUser)

  useEffect(() => {
    hydrateUser()
  }, [hydrateUser])

  return (
    // 1. Move ToastProvider to the very top, wrapping the Router
    <ToastProvider> 
      <BrowserRouter>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />
          <Route path="/s/:token" element={<PublicShare />} />
          {/* --- PROTECTED ROUTES --- */}
          <Route 
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            {/* 2. REMOVE the ToastProvider from here */}
            <Route path="/dashboard" element={<DashboardOverviewPage />} />
            <Route path="/files" element={<FileManagerPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/shared" element={<FileSharingPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<ChangePasswordPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}