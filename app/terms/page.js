export const metadata = {
  title: 'Terms & Conditions — CBSE Vidyasetu',
  description: 'Terms and Conditions for using CBSE Vidyasetu.',
};

export default function Terms() {
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
          <h1 style={{ marginTop: 0 }}>Terms &amp; Conditions</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Last updated: [DATE — update this before publishing]</p>

          <p>
            These Terms &amp; Conditions ("Terms") govern your use of vidyasetu.space (the "Site"),
            operated by CBSE Vidyasetu ("we", "us"). By creating an account or using the Site, you
            agree to these Terms.
          </p>

          <h2>1. Who Can Use Vidyasetu</h2>
          <p>
            Vidyasetu is intended for school students (Std 6-10), their parents/guardians, and
            teachers. If you are under the age required to independently agree to these Terms in
            your jurisdiction, you should use the Site with the involvement of a parent, guardian,
            or teacher.
          </p>

          <h2>2. Free Service</h2>
          <p>
            Vidyasetu is currently offered free of charge. We reserve the right to introduce paid
            features in the future; if we do, this will be clearly communicated before any charge
            applies.
          </p>

          <h2>3. Your Account</h2>
          <p>
            You're responsible for keeping your login details confidential and for all activity
            under your account. Please let us know right away if you believe your account has been
            accessed without your permission.
          </p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Copy, redistribute, or resell content from the Site for commercial purposes</li>
            <li>Attempt to disrupt, hack, or reverse-engineer the Site</li>
            <li>Use the Site for any unlawful purpose</li>
            <li>Impersonate another person or misrepresent your grade/identity to access content not meant for you</li>
          </ul>

          <h2>5. Content and Curriculum Alignment</h2>
          <p>
            Notes, questions, and other study material on Vidyasetu are prepared to align with the
            CBSE/NCERT curriculum for reference and revision purposes. Vidyasetu is an independent
            platform and is not affiliated with, endorsed by, or officially connected to the CBSE
            board or NCERT. While we aim for accuracy, content should be used alongside — not as a
            replacement for — official textbooks and classroom instruction. If you spot an error,
            please report it via our <a href="/contact">Contact page</a>.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            The Site's design, original written content, and study materials are owned by Vidyasetu
            unless otherwise noted. You may use them for personal study purposes but may not
            reproduce or distribute them commercially without permission.
          </p>

          <h2>7. Disclaimer of Warranty</h2>
          <p>
            The Site is provided "as is." We do not guarantee that content is error-free, that
            practice tests reflect actual exam difficulty or scoring, or that the Site will always
            be available without interruption.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the extent permitted by law, Vidyasetu is not liable for any indirect, incidental, or
            consequential damages arising from your use of the Site, including academic outcomes.
          </p>

          <h2>9. Changes to the Site or Terms</h2>
          <p>
            We may update these Terms or change/discontinue features at any time. Continued use of
            the Site after changes means you accept the updated Terms.
          </p>

          <h2>10. Governing Law</h2>
          <p>These Terms are governed by the laws of India.</p>

          <h2>11. Contact Us</h2>
          <p>
            Questions about these Terms? Email us at{' '}
            <a href="mailto:support@vidyasetu.space">support@vidyasetu.space</a>, or visit our{' '}
            <a href="/contact">Contact page</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
