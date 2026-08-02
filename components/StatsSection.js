'use client';

import { useEffect, useState } from 'react';

const CARDS = [
  { key: 'totalStudents', label: 'Students Enrolled', icon: '🎓' },
  { key: 'totalVisitors', label: 'Total Visitors', icon: '👀' },
];

export default function StatsSection() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Record this homepage load, then fetch fresh counts for display.
    // This counts total page loads, not unique people — a true "unique
    // visitor" count would need cookies/session tracking.
    async function run() {
      try {
        await fetch('/api/track-visit', { method: 'POST' });
      } catch {
        /* non-critical if this fails */
      }
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    }
    run();
  }, []);

  if (!stats) return null;

  return (
    <div style={{ margin: '36px 0' }}>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
        📊 Our Community
      </div>
      <div className="stats-grid">
        {CARDS.map((c) => (
          <div key={c.key} className="stats-card">
            <div className="stats-icon-circle">{c.icon}</div>
            <div>
              <div className="stats-number">{stats[c.key] ?? 0}</div>
              <div className="stats-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
