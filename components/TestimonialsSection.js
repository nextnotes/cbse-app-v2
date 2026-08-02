'use client';

import { useEffect, useState } from 'react';

const MOOD_ICONS = { great: '😃', good: '🙂', okay: '😐', confused: '😕', frustrated: '😞' };

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState(null);

  useEffect(() => {
    fetch('/api/testimonials')
      .then((r) => r.json())
      .then((data) => setTestimonials(data.testimonials || []))
      .catch(() => setTestimonials([]));
  }, []);

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <div style={{ margin: '40px 0' }}>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
        💬 What Students Say
      </div>
      <div className="grid cols-2">
        {testimonials.map((t, i) => (
          <div key={i} className="card">
            <div style={{ fontSize: 22, marginBottom: 8 }}>{MOOD_ICONS[t.mood] || '💛'}</div>
            {t.rating && (
              <div style={{ color: '#e8b93a', fontSize: 15, marginBottom: 6 }}>
                {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
              </div>
            )}
            <p style={{ fontSize: 14, color: '#2b2f3a', margin: 0, whiteSpace: 'pre-wrap' }}>{t.message}</p>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 10, fontWeight: 600 }}>
              — {t.display_name?.trim() || 'A student'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
