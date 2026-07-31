'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, idToPseudoEmail } from '../../lib/supabaseClient';

export default function Login() {
  const router = useRouter();
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: idToPseudoEmail(uniqueId),
      password,
    });

    setLoading(false);

    if (loginError) {
      setError('Incorrect Unique ID or password.');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Log in</h2>

        <form onSubmit={handleLogin}>
          <label>Unique ID</label>
          <input className="input" value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} />

          <label>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="error-text">{error}</div>}

          <button className="btn" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p style={{ fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          <Link href="/forgot-password">Forgot ID or password?</Link>
        </p>
        <p style={{ fontSize: 13, marginTop: 8, textAlign: 'center' }}>
          New here? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
