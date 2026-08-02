'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const MOODS = [
  { key: 'great', icon: '😃', label: 'Great!' },
  { key: 'good', icon: '🙂', label: 'Good' },
  { key: 'okay', icon: '😐', label: 'Okay' },
  { key: 'confused', icon: '😕', label: 'Confused' },
  { key: 'frustrated', icon: '😞', label: 'Frustrated' },
];

export default function Feedback() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profileData) {
        router.push('/login');
        return;
      }
      setProfile(profileData);
      setLoading(false);
    }
    init();
  }, [router]);

  async function handleSubmit() {
    if (!mood) {
      setError('Please pick how you felt first.');
      return;
    }
    setError('');
    setSubmitting(true);
    const { error: insertError } = await supabase.from('feedback').insert({
      student_id: profile.id,
      student_name: profile.name,
      mood,
      rating: rating || null,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubmitted(true);
  }

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div className="navbar">
        <div className="brand">🎓 CBSE Vidyasetu</div>
        <a href="/dashboard" className="btn secondary" style={{ padding: '6px 12px', textDecoration: 'none' }}>
          Back to Dashboard
        </a>
      </div>

      <div className="container" style={{ maxWidth: 480, marginTop: 30 }}>
        <div className="card">
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>💛</div>
              <h2 style={{ marginTop: 0 }}>Thanks for sharing!</h2>
              <p style={{ color: '#6b7280' }}>Your feedback helps make this better for everyone.</p>
              <button className="btn" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>How did you feel about your session?</h2>
              <p style={{ color: '#6b7280', fontSize: 14, marginTop: -8 }}>
                Pick the emoji that matches, and tell us more if you'd like.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, margin: '18px 0' }}>
                {MOODS.map((m) => (
                  <div
                    key={m.key}
                    onClick={() => setMood(m.key)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '10px 4px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: mood === m.key ? '#5b7fdb' : '#e5e9f0',
                      background: mood === m.key ? '#eef2fc' : '#fff',
                    }}
                  >
                    <div style={{ fontSize: 28 }}>{m.icon}</div>
                    <div style={{ fontSize: 11, marginTop: 4, color: '#6b7280' }}>{m.label}</div>
                  </div>
                ))}
              </div>

              <label>Rate this session (optional)</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    onClick={() => setRating(rating === n ? 0 : n)}
                    style={{
                      fontSize: 32,
                      cursor: 'pointer',
                      color: n <= rating ? '#e8b93a' : '#e5e9f0',
                      lineHeight: 1,
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>

              <label>Anything you'd like to add? (optional)</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Was something confusing? Did you enjoy a chapter? Tell us..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />

              {error && <div className="error-text">{error}</div>}

              <button className="btn" style={{ width: '100%' }} disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Sending...' : 'Send Feedback'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
