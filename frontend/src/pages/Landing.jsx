import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  .cs-root *, .cs-root *::before, .cs-root *::after {
    box-sizing: border-box; margin: 0; padding: 0;
  }

  .cs-root {
    --bg-base:    #0e0e0e;
    --bg-surface: #161616;
    --bg-card:    #1c1c1c;
    --bg-card2:   #212121;
    --border:     rgba(255,255,255,0.07);
    --border-light: rgba(255,255,255,0.12);
    --red:        #e8334a;
    --red-dark:   #c0273d;
    --red-glow:   rgba(232,51,74,0.18);
    --red-glow2:  rgba(232,51,74,0.08);
    --text-primary: #f0f0f0;
    --text-secondary: #888;
    --text-muted:   #555;
    --font-display: 'Syne', sans-serif;
    --font-body:    'DM Sans', sans-serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
    --radius-xl: 24px;
    background: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-body);
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* NAV */
  .cs-nav {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 48px; height: 64px;
    background: rgba(14,14,14,0.85);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--border);
  }
  .cs-logo {
    display: flex; align-items: center; gap: 10px;
    font-family: var(--font-display); font-weight: 700; font-size: 18px;
    color: var(--text-primary); text-decoration: none; cursor: pointer;
  }
  .cs-logo-icon {
    width: 32px; height: 32px; background: var(--red);
    border-radius: 9px; display: flex; align-items: center;
    justify-content: center; font-size: 16px;
  }
  .cs-nav-links { display: flex; gap: 32px; list-style: none; }
  .cs-nav-links a {
    color: var(--text-secondary); text-decoration: none;
    font-size: 14px; font-weight: 400;
    transition: color 0.2s; cursor: pointer;
  }
  .cs-nav-links a:hover { color: var(--text-primary); }
  .cs-nav-cta { display: flex; gap: 12px; align-items: center; }
  .cs-btn-ghost {
    padding: 8px 20px; border: 1px solid var(--border-light);
    border-radius: var(--radius-sm); background: transparent;
    color: var(--text-secondary); font-family: var(--font-body);
    font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none;
  }
  .cs-btn-ghost:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.25); }
  .cs-btn-primary {
    padding: 9px 22px; border: none; border-radius: var(--radius-sm);
    background: var(--red); color: #fff; font-family: var(--font-body);
    font-size: 14px; font-weight: 500; cursor: pointer;
    transition: background 0.2s, transform 0.15s; text-decoration: none; display: inline-block;
  }
  .cs-btn-primary:hover { background: var(--red-dark); transform: translateY(-1px); }

  /* HERO */
  .cs-hero {
    position: relative; min-height: 88vh;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 80px 24px; overflow: hidden;
  }
  .cs-hero-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
  .cs-hero-bg::before {
    content: ''; position: absolute; top: -120px; left: 50%;
    transform: translateX(-50%); width: 700px; height: 500px;
    background: radial-gradient(ellipse, rgba(232,51,74,0.15) 0%, transparent 70%);
    filter: blur(60px);
  }
  .cs-hero-bg::after {
    content: ''; position: absolute; bottom: -80px; right: 10%;
    width: 400px; height: 400px;
    background: radial-gradient(ellipse, rgba(232,51,74,0.07) 0%, transparent 70%);
    filter: blur(80px);
  }
  .cs-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--bg-card); border: 1px solid var(--border-light);
    border-radius: 999px; padding: 5px 14px 5px 8px;
    font-size: 12.5px; color: var(--text-secondary); margin-bottom: 32px;
    animation: cs-fadeUp 0.6s ease both;
  }
  .cs-hero-badge span {
    background: var(--red); color: #fff; font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px; letter-spacing: 0.5px; text-transform: uppercase;
  }
  .cs-h1 {
    font-family: var(--font-display);
    font-size: clamp(48px, 7vw, 90px); font-weight: 800;
    line-height: 1.0; letter-spacing: -2px; max-width: 800px; margin-bottom: 24px;
    animation: cs-fadeUp 0.6s 0.1s ease both; color: var(--text-primary);
  }
  .cs-h1 em { font-style: normal; color: var(--red); }
  .cs-hero-sub {
    font-size: 18px; color: var(--text-secondary); max-width: 480px;
    margin-bottom: 44px; font-weight: 300; animation: cs-fadeUp 0.6s 0.2s ease both;
  }
  .cs-hero-actions {
    display: flex; gap: 14px; align-items: center;
    flex-wrap: wrap; justify-content: center;
    animation: cs-fadeUp 0.6s 0.3s ease both;
  }
  .cs-btn-primary-lg {
    padding: 14px 32px; border-radius: var(--radius-md); background: var(--red);
    color: #fff; font-family: var(--font-body); font-size: 16px; font-weight: 500;
    text-decoration: none; cursor: pointer; border: none;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s; display: inline-block;
  }
  .cs-btn-primary-lg:hover {
    background: var(--red-dark); transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(232,51,74,0.35);
  }
  .cs-btn-ghost-lg {
    padding: 13px 28px; border-radius: var(--radius-md);
    border: 1px solid var(--border-light); background: transparent;
    color: var(--text-secondary); font-family: var(--font-body);
    font-size: 16px; text-decoration: none; cursor: pointer;
    transition: all 0.2s; display: inline-block;
  }
  .cs-btn-ghost-lg:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.3); }
  .cs-hero-trust {
    margin-top: 60px; font-size: 13px; color: var(--text-muted);
    display: flex; align-items: center; gap: 20px;
    animation: cs-fadeUp 0.6s 0.4s ease both;
  }
  .cs-trust-dot { width: 4px; height: 4px; background: var(--text-muted); border-radius: 50%; }

  /* STATS */
  .cs-stats-strip {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: var(--border);
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
  }
  .cs-stat-cell { background: var(--bg-surface); padding: 36px 24px; text-align: center; }
  .cs-stat-num {
    font-family: var(--font-display); font-size: 42px; font-weight: 800;
    color: var(--text-primary); line-height: 1; margin-bottom: 6px;
  }
  .cs-stat-num em { font-style: normal; color: var(--red); }
  .cs-stat-label {
    font-size: 13px; color: var(--text-secondary);
    text-transform: uppercase; letter-spacing: 0.8px;
  }

  /* SECTIONS */
  .cs-section { padding: 100px 48px; max-width: 1200px; margin: 0 auto; }
  .cs-section-tag {
    display: inline-block; font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.5px; color: var(--red); margin-bottom: 16px;
  }
  .cs-h2 {
    font-family: var(--font-display);
    font-size: clamp(32px, 4vw, 52px); font-weight: 800;
    line-height: 1.1; letter-spacing: -1.5px; margin-bottom: 16px; color: var(--text-primary);
  }
  .cs-h2 em { font-style: normal; color: var(--red); }
  .cs-section-sub {
    font-size: 17px; color: var(--text-secondary);
    max-width: 520px; font-weight: 300; margin-bottom: 60px;
  }

  /* FEATURES */
  .cs-features-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 2px; background: var(--border);
    border: 1px solid var(--border); border-radius: var(--radius-xl); overflow: hidden;
  }
  .cs-feature-card {
    background: var(--bg-card); padding: 40px 32px;
    transition: background 0.25s; position: relative;
  }
  .cs-feature-card:hover { background: var(--bg-card2); }
  .cs-feature-card.featured { background: var(--bg-card2); }
  .cs-feature-card.featured::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0;
    height: 2px; background: var(--red);
  }
  .cs-feature-icon {
    width: 44px; height: 44px; background: var(--red-glow2);
    border: 1px solid rgba(232,51,74,0.2); border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 20px; font-size: 20px;
  }
  .cs-feature-title {
    font-family: var(--font-display); font-size: 18px; font-weight: 700;
    margin-bottom: 10px; color: var(--text-primary);
  }
  .cs-feature-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.65; }

  /* HOW IT WORKS */
  .cs-how-section {
    background: var(--bg-surface);
    border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 100px 0;
  }
  .cs-how-inner { max-width: 1200px; margin: 0 auto; padding: 0 48px; }
  .cs-steps-row {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; margin-top: 60px; position: relative;
  }
  .cs-steps-row::before {
    content: ''; position: absolute; top: 22px; left: 12.5%; right: 12.5%;
    height: 1px; background: var(--border-light);
  }
  .cs-step-item { text-align: center; padding: 0 20px; }
  .cs-step-num {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--bg-card); border: 1px solid var(--border-light);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display); font-size: 14px; font-weight: 700;
    color: var(--red); margin: 0 auto 20px; position: relative; z-index: 1;
  }
  .cs-step-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
  .cs-step-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

  /* STORAGE VISUAL */
  .cs-storage-visual {
    display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
    background: var(--border); border: 1px solid var(--border);
    border-radius: var(--radius-xl); overflow: hidden; margin-top: 60px;
  }
  .cs-storage-panel { background: var(--bg-card); padding: 48px; }
  .cs-storage-panel.dark { background: var(--bg-card2); }
  .cs-storage-bar-wrap {
    background: rgba(255,255,255,0.05); border-radius: 999px;
    height: 8px; overflow: hidden; margin: 16px 0 8px;
  }
  .cs-storage-bar-fill {
    height: 100%; background: var(--red); border-radius: 999px;
    width: 18%; position: relative;
  }
  .cs-storage-bar-fill::after {
    content: ''; position: absolute; right: 0; top: 0; bottom: 0;
    width: 24px; background: rgba(255,255,255,0.25); border-radius: 999px; filter: blur(4px);
  }
  .cs-storage-label {
    display: flex; justify-content: space-between;
    font-size: 13px; color: var(--text-secondary);
  }
  .cs-stat-mini-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px;
  }
  .cs-stat-mini {
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: var(--radius-md); padding: 16px;
  }
  .cs-stat-mini-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px;
    color: var(--text-muted); margin-bottom: 6px;
  }
  .cs-stat-mini-val { font-family: var(--font-display); font-size: 22px; font-weight: 700; color: var(--text-primary); }
  .cs-badge-24h {
    display: inline-block; background: var(--red); color: #fff;
    font-size: 10px; font-weight: 700; padding: 2px 6px;
    border-radius: 4px; margin-left: 8px; vertical-align: middle;
  }
  .cs-file-preview-row { margin-top: 24px; display: flex; flex-direction: column; gap: 8px; }
  .cs-file-row {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    background: rgba(255,255,255,0.03); border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }
  .cs-file-icon {
    width: 32px; height: 32px; background: rgba(232,51,74,0.1);
    border-radius: 6px; display: flex; align-items: center;
    justify-content: center; font-size: 14px; color: var(--red); flex-shrink: 0;
  }
  .cs-file-name { font-size: 13px; flex: 1; color: var(--text-primary); }
  .cs-file-size { font-size: 12px; color: var(--text-muted); }
  .cs-share-pill {
    background: rgba(232,51,74,0.12); border: 1px solid rgba(232,51,74,0.2);
    border-radius: 999px; padding: 3px 10px;
    font-size: 11px; color: var(--red); font-weight: 500;
  }

  /* TESTIMONIALS */
  .cs-testimonials { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 60px; }
  .cs-testimonial-card {
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: var(--radius-lg); padding: 28px; transition: border-color 0.2s;
  }
  .cs-testimonial-card:hover { border-color: var(--border-light); }
  .cs-stars { color: var(--red); font-size: 14px; margin-bottom: 14px; }
  .cs-testimonial-text { font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px; }
  .cs-testimonial-author { display: flex; align-items: center; gap: 12px; }
  .cs-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--red-glow); border: 1px solid rgba(232,51,74,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 600; color: var(--red); font-family: var(--font-display);
  }
  .cs-author-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
  .cs-author-role { font-size: 12px; color: var(--text-muted); }


  /* CTA */
  .cs-cta-banner {
    margin: 0 48px 100px; background: var(--bg-card2);
    border: 1px solid var(--border-light); border-radius: var(--radius-xl);
    padding: 80px; text-align: center; position: relative; overflow: hidden;
  }
  .cs-cta-banner::before {
    content: ''; position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%); width: 600px; height: 300px;
    background: radial-gradient(ellipse, rgba(232,51,74,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .cs-cta-h2 {
    font-family: var(--font-display); font-size: clamp(32px, 4vw, 56px);
    font-weight: 800; letter-spacing: -1.5px; margin-bottom: 16px; color: var(--text-primary);
  }
  .cs-cta-h2 em { font-style: normal; color: var(--red); }
  .cs-cta-p { font-size: 17px; color: var(--text-secondary); margin-bottom: 40px; font-weight: 300; }

  /* FOOTER */
  .cs-footer {
    border-top: 1px solid var(--border); padding: 48px;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 20px;
  }
  .cs-footer-links { display: flex; gap: 24px; list-style: none; flex-wrap: wrap; }
  .cs-footer-links a { color: var(--text-muted); text-decoration: none; font-size: 13px; transition: color 0.2s; cursor: pointer; }
  .cs-footer-links a:hover { color: var(--text-secondary); }
  .cs-footer-copy { font-size: 13px; color: var(--text-muted); }

  /* ANIMATIONS */
  @keyframes cs-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .cs-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .cs-reveal.in { opacity: 1; transform: translateY(0); }

  /* STORAGE TEXT */
  .cs-storage-heading {
    font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--text-primary);
  }

  @media (max-width: 900px) {
    .cs-nav { padding: 0 20px; }
    .cs-nav-links { display: none; }
    .cs-section { padding: 60px 20px; }
    .cs-storage-visual { grid-template-columns: 1fr; }
    .cs-stats-strip { grid-template-columns: repeat(2, 1fr); }
    .cs-cta-banner { margin: 0 20px 60px; padding: 48px 24px; }
    .cs-footer { padding: 32px 20px; flex-direction: column; align-items: flex-start; }
    .cs-steps-row::before { display: none; }
    .cs-h1 { letter-spacing: -1px; }
    .cs-how-inner { padding: 0 20px; }
  }
`;

export default function LandingPage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".cs-reveal").forEach((el) => observer.observe(el));

    return () => {
      document.head.removeChild(styleEl);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="cs-root" ref={rootRef}>
      {/* NAV */}
      <nav className="cs-nav">
        <div className="cs-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div className="cs-logo-icon">☁</div>
          CloudShare
        </div>
        <ul className="cs-nav-links">
          <li><a onClick={() => scrollTo("features")}>Features</a></li>
          <li><a onClick={() => scrollTo("how")}>How it Works</a></li>
        </ul>
        <div className="cs-nav-cta">
          <button className="cs-btn-ghost" onClick={() => navigate("/login")}>Sign in</button>
          <button className="cs-btn-primary" onClick={() => navigate("/register")}>Get Started</button>
        </div>
      </nav>

      {/* HERO */}
      <div className="cs-hero">
        <div className="cs-hero-bg" />
        <div className="cs-hero-badge"><span>New</span> Public link expiry control is live</div>
        <h1 className="cs-h1">Upload, Share &<br /><em>Track Every Link.</em></h1>
        <p className="cs-hero-sub">Secure cloud storage with real-time share analytics. Every file, every link, under your control.</p>
        <div className="cs-hero-actions">
          <button className="cs-btn-primary-lg" onClick={() => navigate("/register")}>Start for free →</button>
          <button className="cs-btn-ghost-lg" onClick={() => scrollTo("how")}>See how it works</button>
        </div>
        <div className="cs-hero-trust">
          <span>1 GB free forever</span>
         

          <div className="cs-trust-dot" />
          <span>End-to-end encrypted</span>
        </div>
      </div>

    

      {/* FEATURES */}
      <section className="cs-section" id="features">
        <div className="cs-section-tag">Features</div>
        <h2 className="cs-h2">Everything you need to<br /><em>share with confidence</em></h2>
        <p className="cs-section-sub">From simple uploads to expiring public links — CloudShare gives you total control over your files.</p>
        <div className="cs-features-grid cs-reveal">
          {[
            { icon: "📁", title: "Unlimited Uploads", desc: "Store any file type up to 100 MB per file. Organize with collections, starred items, and smart search.", featured: true },
            { icon: "🔗", title: "Public Share Links", desc: "Generate shareable links instantly. Set expiry windows from 1 hour to 30 days — then track every click." },
            { icon: "📊", title: "Link Analytics", desc: "Know exactly who opened your links, when, and from where. Real-time view counts and geography data." },
            { icon: "🔒", title: "Encrypted at Rest", desc: "Every file is encrypted before it touches our servers. Your data stays yours — always." },
            { icon: "👥", title: "Shared With You", desc: "Receive files from anyone. A clean inbox for items shared directly to your account." },
            { icon: "⏱", title: "Expiring Links", desc: "Send sensitive files with a self-destruct timer. Links vanish automatically — nothing lingers.", badge: true },
          ].map((f, i) => (
            <div className={`cs-feature-card${f.featured ? " featured" : ""}`} key={i}>
              <div className="cs-feature-icon">{f.icon}</div>
              <div className="cs-feature-title">{f.title}{f.badge && <span className="cs-badge-24h">24h</span>}</div>
              <p className="cs-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="cs-how-section" id="how">
        <div className="cs-how-inner">
          <div className="cs-section-tag">How it works</div>
          <h2 className="cs-h2">Three steps to <em>perfect sharing</em></h2>
          <p className="cs-section-sub">CloudShare is fast to start and simple to use — no setup, no config files, no friction.</p>
          <div className="cs-steps-row cs-reveal">
            {[
              { num: "01", title: "Create your account", desc: "Sign up in seconds. Get 1 GB free storage with no credit card required." },
              { num: "02", title: "Upload your files", desc: "Drag & drop any file up to 100 MB. PDFs, images, docs — anything works." },
              { num: "03", title: "Share the link", desc: "Generate a public link with optional expiry. Copy and send in one click." },
              { num: "04", title: "Track everything", desc: "See views, clicks, and geography data in your real-time dashboard." },
            ].map((s, i) => (
              <div className="cs-step-item" key={i}>
                <div className="cs-step-num">{s.num}</div>
                <div className="cs-step-title">{s.title}</div>
                <p className="cs-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DASHBOARD VISUAL */}
      <section className="cs-section">
        <div className="cs-section-tag">Dashboard</div>
        <h2 className="cs-h2">Your files, <em>at a glance</em></h2>
        <p className="cs-section-sub">A clean, powerful dashboard that shows you exactly what's happening with your storage and shares.</p>
        <div className="cs-storage-visual cs-reveal">
          <div className="cs-storage-panel">
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 8 }}>Storage Used</div>
            <div className="cs-storage-heading">183.3 MB <span style={{ fontSize: 18, color: "var(--text-muted)", fontWeight: 400 }}>/ 1.00 GB</span></div>
            <div className="cs-storage-bar-wrap"><div className="cs-storage-bar-fill" /></div>
            <div className="cs-storage-label"><span>17.9% used</span><span>Max 100 MB per file</span></div>
            <div className="cs-stat-mini-grid">
              {[
                { label: "Files Stored", val: "23" },
                { label: "Active Shares", val: "4" },
                { label: "Shared With Me", val: "7" },
                { label: "Expiring Soon", val: "2", badge: true },
              ].map((m, i) => (
                <div className="cs-stat-mini" key={i}>
                  <div className="cs-stat-mini-label">{m.label}{m.badge && <span className="cs-badge-24h">24h</span>}</div>
                  <div className="cs-stat-mini-val">{m.val}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="cs-storage-panel dark">
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 16 }}>Recent Files</div>
            <div className="cs-file-preview-row">
              {[
                { icon: "📄", name: "EAadhaar_20034904.pdf", size: "1.3 MB", shared: true },
                { icon: "📄", name: "resume_khansa_2026.pdf", size: "890 KB", shared: true },
                { icon: "🖼", name: "profile_photo.jpg", size: "2.1 MB" },
                { icon: "📦", name: "project_assets.zip", size: "45.8 MB" },
              ].map((f, i) => (
                <div className="cs-file-row" key={i}>
                  <div className="cs-file-icon">{f.icon}</div>
                  <div className="cs-file-name">{f.name}</div>
                  <div className="cs-file-size">{f.size}</div>
                  {f.shared && <div className="cs-share-pill">Shared</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

     
     

     

      {/* CTA */}
      <div className="cs-cta-banner cs-reveal">
        <h2 className="cs-cta-h2">Ready to share<br /><em>smarter?</em></h2>
        <p className="cs-cta-p">Join 100,000+ users. Get started in under a minute — completely free.</p>
        <button className="cs-btn-primary-lg" onClick={() => navigate("/register")}>Create your free account →</button>
      </div>

      {/* FOOTER */}
      <footer className="cs-footer">
        <div className="cs-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div className="cs-logo-icon">☁</div>
          CloudShare
        </div>
        <ul className="cs-footer-links">
          {["Privacy", "Terms", "Security", "Blog", "Support"].map((l) => (
            <li key={l}><a>{l}</a></li>
          ))}
        </ul>
        <div className="cs-footer-copy">© 2026 CloudShare. All rights reserved.</div>
      </footer>
    </div>
  );
}