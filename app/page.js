import Link from 'next/link';

const SUBJECTS = [
  { name: 'English', icon: '📖', cls: 'subject-english' },
  { name: 'Odia', icon: '🌸', cls: 'subject-odia' },
  { name: 'Math', icon: '➗', cls: 'subject-math' },
  { name: 'Science', icon: '🔬', cls: 'subject-science' },
  { name: 'SST', icon: '🌍', cls: 'subject-sst' },
  { name: 'Computer', icon: '💻', cls: 'subject-computer' },
];

export default function Home() {
  return (
    <div>
      <div className="navbar">
        <div className="brand">🎓 CBSE Vidyasetu</div>
        <Link href="/admin/login" style={{ fontSize: 13, color: '#6b7280' }}>
          Admin
        </Link>
      </div>

      <div className="container">
        <div className="hero-colorful">
          <span className="hero-mascot">🚀</span>
          <h1 className="hero-title">Std 6–10 CBSE, made fun!</h1>
          <p className="hero-subtitle">
            Colorful notes, practice sets, mind maps & 3D models — English, Odia, Math, Science, SST & Computer, all in one friendly place.
          </p>
        </div>

        <div className="subject-grid">
          {SUBJECTS.map((s) => (
            <div key={s.name} className={`subject-card ${s.cls}`}>
              <span className="icon">{s.icon}</span>
              {s.name}
            </div>
          ))}
        </div>

        <div className="grid cols-2" style={{ maxWidth: 460, margin: '0 auto' }}>
          <Link href="/login" className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30 }}>👋</div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>Log in</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>Already have an account</div>
          </Link>
          <Link href="/signup" className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 30 }}>✨</div>
            <div style={{ fontWeight: 700, marginTop: 8 }}>Sign up</div>
            <div style={{ color: '#6b7280', fontSize: 13 }}>New student? Start here</div>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: '#6b7280' }}>
            Forgot your ID or password?
          </Link>
        </div>

        <div className="grid cols-3" style={{ marginTop: 50 }}>
          <div className="card">
            <div className="feature-icon-circle" style={{ background: '#eef2fc' }}>📝</div>
            <div className="badge">Notes</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              Clear, colorful, chapter-wise notes for every subject.
            </p>
          </div>
          <div className="card">
            <div className="feature-icon-circle" style={{ background: '#eafaf6' }}>🎯</div>
            <div className="badge">Practice Sets</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              MCQs, short & long answers with instant "show answer" help.
            </p>
          </div>
          <div className="card">
            <div className="feature-icon-circle" style={{ background: '#fff4e0' }}>🧠</div>
            <div className="badge">Mind Maps & 3D</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              Visual mind maps, videos, and interactive 3D models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
