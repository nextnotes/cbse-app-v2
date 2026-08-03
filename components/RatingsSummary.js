'use client';

import { useEffect, useState } from 'react';

export default function RatingsSummary() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/ratings-summary')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data || data.total === 0) return null;

  const avgRounded = Math.round(data.average * 10) / 10;
  const filledStars = Math.round(data.average);

  return (
    <div className="card" style={{ margin: '40px 0' }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 18, textAlign: 'center' }}>
        ⭐ Student Ratings
      </div>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>{avgRounded}</div>
          <div style={{ color: '#e8b93a', fontSize: 18, marginTop: 4 }}>
            {'★'.repeat(filledStars)}
            {'☆'.repeat(5 - filledStars)}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {data.total} rating{data.total !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.counts[star] || 0;
            const pct = data.total > 0 ? (count / data.total) * 100 : 0;
            return (
              <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: 12, width: 10, color: '#6b7280' }}>{star}</span>
                <div style={{ flex: 1, height: 8, background: '#e5e9f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)' }} />
                </div>
                <span style={{ fontSize: 11, width: 22, color: '#6b7280', textAlign: 'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
