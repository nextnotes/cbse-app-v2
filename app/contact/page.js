export const metadata = {
  title: 'Contact Us — CBSE Vidyasetu',
  description: 'Get in touch with the CBSE Vidyasetu team.',
};

export default function Contact() {
  return (
    <div>
      <div className="navbar">
        <a href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          🎓 CBSE Vidyasetu
        </a>
        <a href="/" className="btn secondary" style={{ padding: '6px 12px', textDecoration: 'none' }}>
          Back to Home
        </a>
      </div>

      <div className="container" style={{ maxWidth: 640, marginTop: 30, marginBottom: 60 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>Contact Us</h1>
          <p>
            We'd love to hear from you — whether it's a question about a chapter, a correction
            you've spotted, a feature you'd like to see, or feedback on how Vidyasetu is working
            for you or your students.
          </p>

          <div
            style={{
              background: '#eef2fc',
              borderRadius: 12,
              padding: '18px 20px',
              margin: '20px 0',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 4 }}>
              EMAIL
            </div>
            <a href="mailto:support@vidyasetu.space" style={{ fontSize: 18, fontWeight: 600 }}>
              support@vidyasetu.space
            </a>
          </div>

          <p style={{ color: '#6b7280', fontSize: 14 }}>
            We typically respond within 2-3 business days. For chapter-specific feedback, it also
            helps to use the in-app feedback option after finishing a chapter, since it links your
            note directly to the content our team is looking at.
          </p>
        </div>
      </div>
    </div>
  );
}
