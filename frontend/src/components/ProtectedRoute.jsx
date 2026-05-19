import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hydrating = useAuthStore((s) => s.hydrating)
  const location = useLocation()

  // Still restoring session from refresh token — don't redirect yet.
  if (hydrating) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#09090b',
      }}>
        <div style={{
          width: 32, height: 32, border: '3px solid #27272a',
          borderTopColor: '#e11d48', borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}