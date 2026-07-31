'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function MockTests() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

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

      const { data: testsData } = await supabase
        .from('mock_tests')
        .select('*')
        .eq('grade', profileData.grade)
        .order('created_at', { ascending: false });
      setTests(testsData || []);
      setLoading(false);
    }
    init();
  }, [router]);

  function startTest(test) {
    setSelectedTest(test);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  }

  async function handleSubmit() {
    const questions = selectedTest.questions || [];
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.answer) correct += 1;
    });
    setScore(correct);
    setSubmitted(true);
    setSaving(true);

    await supabase.from('mock_test_attempts').insert({
      test_id: selectedTest.id,
      student_id: profile.id,
      student_name: profile.name,
      student_unique_id: profile.unique_id,
      score: correct,
      total: questions.length,
    });
    setSaving(false);
  }

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div className="navbar">
        <div className="brand">🎓 CBSE Vidyasetu — Mock Tests</div>
        <a href="/dashboard" className="btn secondary" style={{ padding: '6px 12px', textDecoration: 'none' }}>
          Back to Dashboard
        </a>
      </div>

      <div className="container">
        {!selectedTest ? (
          <div>
            <h2>Mock Tests — Std {profile.grade}</h2>
            {tests.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No mock tests available yet.</p>
            ) : (
              <div className="grid cols-2">
                {tests.map((t) => (
                  <div key={t.id} className="card">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
                      {t.subject} · {t.questions?.length || 0} questions
                    </div>
                    <button className="btn" onClick={() => startTest(t)}>Start Test</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{selectedTest.title}</h2>

            {submitted ? (
              <div>
                <div className="notes-recap" style={{ marginTop: 0, marginBottom: 20 }}>
                  <div className="notes-recap-title">Your Score</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {score} / {selectedTest.questions.length}
                  </div>
                  {saving && <div style={{ fontSize: 13, color: '#6b7280' }}>Saving your result...</div>}
                </div>

                {selectedTest.questions.map((q, i) => (
                  <div key={i} className="card" style={{ marginBottom: 10, boxShadow: 'none' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{i + 1}. {q.question}</div>
                    {q.options.map((opt, j) => {
                      const isCorrect = opt === q.answer;
                      const isYourWrongPick = answers[i] === opt && opt !== q.answer;
                      return (
                        <div
                          key={j}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1.5px solid',
                            borderColor: isCorrect ? '#35b7a3' : isYourWrongPick ? '#e0645a' : '#e5e9f0',
                            background: isCorrect ? '#eafaf6' : isYourWrongPick ? '#fdecec' : '#fff',
                            marginBottom: 6,
                            fontSize: 14,
                          }}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                ))}

                <button className="btn secondary" onClick={() => setSelectedTest(null)}>
                  Back to test list
                </button>
              </div>
            ) : (
              <div>
                {selectedTest.questions.map((q, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{i + 1}. {q.question}</div>
                    {q.options.map((opt, j) => {
                      const isSelected = answers[i] === opt;
                      return (
                        <div
                          key={j}
                          onClick={() => setAnswers({ ...answers, [i]: opt })}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1.5px solid',
                            borderColor: isSelected ? '#5b7fdb' : '#e5e9f0',
                            background: isSelected ? '#eef2fc' : '#fff',
                            marginBottom: 6,
                            cursor: 'pointer',
                            fontSize: 14,
                          }}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <button className="btn" onClick={handleSubmit}>
                  Submit Test
                </button>
                <button className="btn secondary" style={{ marginLeft: 8 }} onClick={() => setSelectedTest(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
