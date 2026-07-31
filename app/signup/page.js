'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, idToPseudoEmail } from '../../lib/supabaseClient';

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('8');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !uniqueId.trim() || password.length < 6) {
      setError('Please fill every field. Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const pseudoEmail = idToPseudoEmail(uniqueId);

    // 1. Create the auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: pseudoEmail,
      password,
    });

    if (signUpError) {
      // Supabase reports "already registered" using the pseudo-email —
      // translate that back into a message about the Unique ID.
      if (signUpError.message.toLowerCase().includes('already')) {
        setError('That Unique ID is already taken. Please choose another.');
      } else {
        setError(signUpError.message);
      }
      setLoading(false);
      return;
    }

    // 2. Create their profile row (name, unique_id, role, grade)
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name: name.trim(),
      unique_id: uniqueId.trim(),
      role: 'student',
      grade: Number(grade),
    });

    if (profileError) {
      setError('Account created, but profile setup failed: ' + profileError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 40 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create your account</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: -8 }}>
          Choose a Unique ID — you'll use it to log in.
        </p>

        <form onSubmit={handleSignup}>
          <label>Full name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

          <label>Grade</label>
          <select
            className="input"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            {[6, 7, 8, 9, 10].map((g) => (
              <option key={g} value={g}>
                Std {g}
              </option>
            ))}
          </select>

          <label>Choose a Unique ID</label>
          <input
            className="input"
            placeholder="e.g. rahul2011"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value)}
          />

          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="error-text">{error}</div>}

          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p style={{ fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
