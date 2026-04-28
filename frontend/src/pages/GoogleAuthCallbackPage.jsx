import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      window.alert('Google sign-in failed. Please try again.')
      navigate('/login', { replace: true })
      return
    }

    const access = searchParams.get('access')
    const refresh = searchParams.get('refresh')
    const email = searchParams.get('email')

    if (!access || !refresh || !email) {
      navigate('/login', { replace: true })
      return
    }

    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    localStorage.setItem('auth_user', JSON.stringify({
      email,
      first_name: searchParams.get('first_name') || '',
      last_name: searchParams.get('last_name') || '',
      dob: searchParams.get('dob') || '',
    }))

    navigate('/dashboard', { replace: true })
  }, [navigate, searchParams])

  return (
    <div className="auth-root">
      <div className="auth-panel-right" style={{ width: '100%' }}>
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="eyebrow">Google Sign-In</div>
            <h2>Signing you in</h2>
            <p>Please wait while we complete your Google authentication.</p>
          </div>
          <div className="alert alert-success">Connecting your account...</div>
        </div>
      </div>
    </div>
  )
}
