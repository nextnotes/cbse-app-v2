'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, idToPseudoEmail } from '../../../lib/supabaseClient';

export default function AdminLogin() {
  const router = useRouter();
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: idToPseudoEmail(uniqueId),
      password,
    });

    if (loginError) {
      setError('Incorrect admin ID or password.');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profile?.role !== 'admin') {
      setError('This account does not have admin access.');
      await supabase.auth.signOut();
      return;
    }

    router.push('/admin/dashboard');
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <label>Admin ID</label>
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
      </div>
    </div>
  );
}
