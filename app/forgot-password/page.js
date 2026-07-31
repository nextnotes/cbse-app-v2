'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [tab, setTab] = useState('id'); // 'id' or 'password'

  return (
    <div className="container" style={{ maxWidth: 440, marginTop: 60 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Account recovery</h2>

        <div className="tabs">
          <div className={`tab ${tab === 'id' ? 'active' : ''}`} onClick={() => setTab('id')}>
            Forgot Unique ID
          </div>
          <div className={`tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            Forgot Password
          </div>
        </div>

        {tab === 'id' ? <RecoverId /> : <RecoverPassword />}

        <p style={{ fontSize: 13, marginTop: 16, textAlign: 'center' }}>
          <Link href="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

function RecoverId() {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('8');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const res = await fetch('/api/recover-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, grade: Number(grade) }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    setResult(data);
  }

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13 }}>
        Enter your full name and grade exactly as used at signup.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label>Grade</label>
        <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
          {[6, 7, 8, 9, 10].map((g) => (
            <option key={g} value={g}>
              Std {g}
            </option>
          ))}
        </select>
        {error && <div className="error-text">{error}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Searching...' : 'Find my Unique ID'}
        </button>
      </form>

      {result && (
        <div className="success-text" style={{ marginTop: 14 }}>
          {result.matches.length === 1
            ? `Your Unique ID is: ${result.matches[0]}`
            : `We found multiple matches — contact your admin/teacher with your name to confirm which one is yours: ${result.matches.join(', ')}`}
        </div>
      )}
    </div>
  );
}

function RecoverPassword() {
  const [name, setName] = useState('');
  const [uniqueId, setUniqueId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, uniqueId, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    setSuccess(true);
  }

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: 13 }}>
        Enter your name and Unique ID to reset your password.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label>Unique ID</label>
        <input className="input" value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} />
        <label>New password</label>
        <input
          className="input"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {error && <div className="error-text">{error}</div>}
        {success && <div className="success-text">Password updated! You can log in now.</div>}
        <button className="btn" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Updating...' : 'Reset password'}
        </button>
      </form>
    </div>
  );
}
