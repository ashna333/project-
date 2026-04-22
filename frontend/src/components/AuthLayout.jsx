export default function AuthLayout({ children, eyebrow, title, subtitle, features }) {
  return (
    <div className="auth-root">
      {/* Left Panel */}
      <div className="auth-panel-left">
        <div className="grid-lines" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />

        <div className="brand-logo">
          <div className="icon">⚡</div>
          <span className="name">CloudNest</span>
        </div>

        <div className="brand-hero">
          <h1>
            Secure transfers,<br />
            <span className="highlight">  Zero worries.</span>
          </h1>
          <p>
           Seamless file sharing, anytime, anywhere.
          </p>
        </div>

        
      </div>

      {/* Right Panel */}
      <div className="auth-panel-right">
        <div className="auth-card">
          <div className="auth-card-header">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}