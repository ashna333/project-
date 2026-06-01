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

import { InboxBadgeProvider } from './context/InboxBadgeContext';



// Dashboard/App Pages
import AppShell from './components/AppShell'; // Ensure this matches your filename
import DashboardOverviewPage from './pages/DashboardOverviewPage'
import FileManagerPage from './pages/FileManagerPage'
import FileSharingPage from './pages/FileSharingPage'
import SharedWithMePage from './pages/SharedWithMePage'
import PrivateSharesByMePage from './pages/PrivateSharesByMePage'
import TrashPage from './pages/TrashPage'
import UploadPage from './pages/UploadPage'
import StarredPage from './pages/Starredpage'
import ProfilePage from './pages/ProfilePage'
import SpacesPage from './pages/SpacesPage'
import SpaceDetailPage from './pages/SpaceDetailPage'
import StorageManager from './pages/Storagemanager'

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
      <InboxBadgeProvider>
        <Routes>
          {/* --- PUBLIC ROUTES --- */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
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
            <Route path="/private-shares/inbox" element={<SharedWithMePage />} />
            <Route path="/private-shares/owned" element={<PrivateSharesByMePage />} />
            <Route path="/starred" element={<StarredPage />} />
            <Route path="/trash" element={<TrashPage />} />
            <Route path="/profile" element={<ProfilePage />} />
           <Route path="/storage-manager" element={<StorageManager />} />

            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
        
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </InboxBadgeProvider>
      </BrowserRouter>
    </ToastProvider>
  )
}