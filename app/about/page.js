export const metadata = {
  title: 'About Us — CBSE Vidyasetu',
  description: 'Learn about CBSE Vidyasetu, a free study platform for CBSE Std 6-10 students.',
};

export default function About() {
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

      <div className="container" style={{ maxWidth: 720, marginTop: 30, marginBottom: 60 }}>
        <div className="card">
          <h1 style={{ marginTop: 0 }}>About CBSE Vidyasetu</h1>

          <p>
            CBSE Vidyasetu ("Vidyasetu", "we", "us") is a free study platform built for CBSE
            students in Std 6 to 10. The name Vidyasetu means "bridge of knowledge" — our aim is
            to be that bridge between a dense textbook chapter and a student who just wants to
            understand it and revise it quickly.
          </p>

          <h2>What we offer</h2>
          <ul>
            <li>Chapter-wise revision notes for English, Odia, Math, Science, Social Science (SST), and Computer</li>
            <li>Practice questions — multiple choice, one-liners, short and long answer</li>
            <li>Mock tests with instant scoring</li>
            <li>Visual mind maps for quick revision</li>
            <li>Educational videos and interactive 3D models for select chapters</li>
          </ul>

          <h2>Who this is for</h2>
          <p>
            Vidyasetu is built for CBSE students preparing for their school exams, and for parents
            and teachers who want a simple, free supplementary resource aligned with the NCERT
            curriculum. It's meant to complement classroom teaching and textbooks, not replace them.
          </p>

          <h2>Our approach</h2>
          <p>
            Content on Vidyasetu is generated to be student-friendly — short sentences, plain
            language, and real-life examples — while staying aligned with the CBSE/NCERT syllabus.
            We're a small, independently run platform, and we're continually adding chapters and
            improving what's already here based on student and teacher feedback.
          </p>

          <p style={{ marginTop: 28 }}>
            Have a question, a correction to suggest, or feedback on a chapter?{' '}
            <a href="/contact">Get in touch</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
