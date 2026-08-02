import Link from 'next/link';
import StatsSection from '../components/StatsSection';
import TestimonialsSection from '../components/TestimonialsSection';

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
            Free notes, practice sets, mock tests, mind maps & 3D models — English, Odia, Math, Science, SST & Computer, all in one friendly place.
          </p>
        </div>

        <div className="auth-row">
          <Link href="/login" className="auth-btn auth-btn-login">
            <span className="auth-icon">👋</span>
            <div className="auth-title">Log in</div>
            <div className="auth-subtitle">Already have an account</div>
          </Link>
          <Link href="/signup" className="auth-btn auth-btn-signup">
            <span className="auth-icon">✨</span>
            <div className="auth-title">Sign up</div>
            <div className="auth-subtitle">New? Start free</div>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: '#6b7280' }}>
            Forgot your ID or password?
          </Link>
        </div>

        <div className="steps-strip">
          <div className="step-item">
            <div className="step-number">1</div>
            <div style={{ fontSize: 26 }}>✨</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>Sign up free</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Just your name, grade &amp; a Unique ID — no email needed.
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div style={{ fontWeight: 700, marginTop: 14 }}>Pick a subject</div>
            <div className="mini-subject-row">
              {SUBJECTS.map((s) => (
                <div key={s.name} className="mini-subject-item">
                  <div className={`mini-subject-chip ${s.cls}`}>{s.icon}</div>
                  <div className="mini-subject-label">{s.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div style={{ fontSize: 26 }}>🚀</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>Learn &amp; practice</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
              Notes, mock tests, mind maps, videos &amp; 3D models.
            </div>
          </div>
        </div>

        <div className="grid cols-3" style={{ marginTop: 50 }}>
          <div className="card feature-card" style={{ borderTop: '4px solid #5b7fdb' }}>
            <div className="feature-icon-circle" style={{ background: 'linear-gradient(135deg, #5b7fdb, #7b9bff)' }}>📝</div>
            <div className="badge">Notes</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              Clear, colorful, chapter-wise notes for every subject.
            </p>
          </div>
          <div className="card feature-card" style={{ borderTop: '4px solid #35b7a3' }}>
            <div className="feature-icon-circle" style={{ background: 'linear-gradient(135deg, #35b7a3, #4fd6c0)' }}>🎯</div>
            <div className="badge">Practice Sets</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              MCQs, short & long answers with instant "show answer" help.
            </p>
          </div>
          <div className="card feature-card" style={{ borderTop: '4px solid #ff8a3d' }}>
            <div className="feature-icon-circle" style={{ background: 'linear-gradient(135deg, #ff8a3d, #ffb648)' }}>🧠</div>
            <div className="badge">Mind Maps & 3D</div>
            <p style={{ marginTop: 10, fontSize: 14, color: '#6b7280' }}>
              Visual mind maps, videos, and interactive 3D models.
            </p>
          </div>
        </div>

        <StatsSection />

        <TestimonialsSection />

        {/* Visible "About" section — also helps this page describe itself
            clearly to search engines, in addition to the meta tags in layout.js */}
        <div className="card" style={{ marginTop: 40 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>About CBSE Vidyasetu</h2>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            CBSE Vidyasetu is a free online study platform for students in Class 6 to Class 10
            following the CBSE curriculum. Students get chapter-wise notes, practice questions,
            mock tests with instant scoring, visual mind maps, educational videos, and interactive
            3D models — covering English, Odia, Math, Science, Social Science (SST), and Computer.
            Signing up takes less than a minute, with no email address required. Whether you're
            revising before an exam or catching up on a chapter you missed, Vidyasetu brings
            everything into one simple, friendly place.
          </p>
        </div>

        <div className="site-footer">
          <div style={{ fontWeight: 700 }}>🎓 CBSE Vidyasetu</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Free CBSE study notes, mock tests & practice for Std 6–10
          </div>
        </div>
      </div>
    </div>
  );
}
