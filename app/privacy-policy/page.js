export const metadata = {
  title: 'Privacy Policy — CBSE Vidyasetu',
  description: 'Privacy Policy for CBSE Vidyasetu — how we collect, use, and protect your information.',
};

export default function PrivacyPolicy() {
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
          <h1 style={{ marginTop: 0 }}>Privacy Policy</h1>
          <p style={{ color: '#6b7280', fontSize: 13 }}>Last updated: [DATE — update this before publishing]</p>

          <p>
            This Privacy Policy explains how CBSE Vidyasetu ("Vidyasetu", "we", "us") collects,
            uses, and protects information when you use vidyasetu.space (the "Site"). By using the
            Site, you agree to the practices described here.
          </p>

          <h2>1. Information We Collect</h2>
          <ul>
            <li><b>Account information</b> — name, grade/standard, subject, and any other details you provide when signing up or logging in.</li>
            <li><b>Usage data</b> — which chapters, notes, and practice sets you access, quiz/mock test scores, and general site-visit statistics.</li>
            <li><b>Feedback</b> — anything you submit through our feedback or contact forms.</li>
            <li><b>Technical data</b> — standard information collected automatically by any website, such as browser type, device type, and approximate location, generally through cookies or similar technologies.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <ul>
            <li>To operate the Site — showing you the right content for your grade/subject, saving your progress, and authenticating your account.</li>
            <li>To improve our content and features based on how the Site is used.</li>
            <li>To respond to feedback, questions, or support requests.</li>
            <li>To maintain basic site statistics (e.g. visit counts).</li>
          </ul>
          <p>We do not sell your personal information to third parties.</p>

          <h2>3. Cookies and Third-Party Services</h2>
          <p>
            We use trusted third-party services to run the Site, including a database/authentication
            provider (Supabase) to store accounts and content. These providers may use cookies or
            similar technology as part of delivering their service.
          </p>
          <p>
            If and when this Site displays advertising through Google AdSense or similar ad
            networks, Google and its partners may use cookies to serve ads based on a visitor's
            prior visits to this or other websites. Visitors can review or adjust how Google
            personalizes ads for them through Google's Ads Settings. Third-party vendors, including
            Google, may also use cookies to serve ads based on someone's past visits to this site
            or other sites on the internet.
          </p>

          <h2>4. Children's Privacy</h2>
          <p>
            Vidyasetu is designed for school students, including some under the age of 13. We do
            not knowingly collect more information from a child than is reasonably necessary to
            provide the study features described above (grade, subject, and progress data), and we
            encourage students to use the Site with a parent's, guardian's, or teacher's awareness.
            We do not knowingly use children's information for purposes beyond operating and
            improving the Site. If you are a parent or guardian and believe your child has provided
            us with information you'd like removed, please contact us using the details below and
            we will act on that request.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We use reasonable technical and organizational measures to protect the information we
            hold, including encrypted connections (HTTPS) and access-controlled storage. However,
            no method of transmission or storage is 100% secure, and we cannot guarantee absolute
            security.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain account and usage information for as long as your account is active, or as
            needed to provide the Site's features. You may request deletion of your account and
            associated data at any time by contacting us.
          </p>

          <h2>7. Your Rights</h2>
          <p>
            You can request access to, correction of, or deletion of your personal information at
            any time by contacting us at the email below.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be reflected
            by updating the "Last updated" date above.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            Questions about this Privacy Policy? Email us at{' '}
            <a href="mailto:support@vidyasetu.space">support@vidyasetu.space</a>, or visit our{' '}
            <a href="/contact">Contact page</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
