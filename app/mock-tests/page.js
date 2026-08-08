'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// Titles look like "Ch 4: Timeline and Sources of History [Mock3]" or, for a
// chapter with only one test, just "Ch 1 : Introduction of Computer" with no
// bracketed suffix at all. This splits off that suffix so multiple mock
// variants of the same chapter can be grouped and listed together.
function parseTestTitle(title) {
  const match = (title || '').match(/^(.*?)\s*[\[\(]\s*(mock\s*\d*)\s*[\]\)]\s*$/i);
  if (match) {
    return { chapter: match[1].trim(), variant: match[2].trim() };
  }
  return { chapter: (title || '').trim(), variant: null };
}

export default function MockTests() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [attemptsByTest, setAttemptsByTest] = useState({});
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
        .order('subject', { ascending: true })
        .order('created_at', { ascending: false });
      setTests(testsData || []);

      // Pull this student's past attempts for these tests, so the list can show
      // "you scored X last time" and offer a re-attempt instead of a fresh start.
      if (testsData?.length) {
        const testIds = testsData.map((t) => t.id);
        const { data: attemptsData } = await supabase
          .from('mock_test_attempts')
          .select('test_id, score, total, submitted_at')
          .eq('student_id', profileData.id)
          .in('test_id', testIds)
          .order('submitted_at', { ascending: false });

        const grouped = {};
        for (const a of attemptsData || []) {
          if (!grouped[a.test_id]) {
            // First one seen per test is the most recent, since we sorted desc.
            grouped[a.test_id] = { latest: a, attemptCount: 1 };
          } else {
            grouped[a.test_id].attemptCount += 1;
          }
        }
        setAttemptsByTest(grouped);
      }

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

    // Update the local attempt record so the list (and this session) reflects
    // the new score immediately if the student goes back and looks again.
    setAttemptsByTest((prev) => ({
      ...prev,
      [selectedTest.id]: {
        latest: { test_id: selectedTest.id, score: correct, total: questions.length },
        attemptCount: (prev[selectedTest.id]?.attemptCount || 0) + 1,
      },
    }));
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
              Object.entries(
                tests.reduce((groups, t) => {
                  groups[t.subject] = groups[t.subject] || [];
                  groups[t.subject].push(t);
                  return groups;
                }, {})
              ).map(([subjectName, subjectTests]) => {
                // Group this subject's tests by chapter (stripping any "[Mock N]"
                // suffix from the title), so multiple mock variants of the same
                // chapter list together instead of as separate flat cards.
                const chapterGroups = subjectTests.reduce((groups, t) => {
                  const { chapter, variant } = parseTestTitle(t.title);
                  groups[chapter] = groups[chapter] || [];
                  groups[chapter].push({ ...t, variant });
                  return groups;
                }, {});

                return (
                  <div key={subjectName} style={{ marginBottom: 28 }}>
                    <div className="badge" style={{ marginBottom: 10, fontSize: 13 }}>{subjectName}</div>
                    {Object.entries(chapterGroups).map(([chapterName, chapterTests]) => (
                      <div key={chapterName} className="card" style={{ marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, marginBottom: 12 }}>{chapterName}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {chapterTests.map((t) => {
                            const attempt = attemptsByTest[t.id];
                            return (
                              <div
                                key={t.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: 10,
                                  padding: '10px 12px',
                                  borderRadius: 10,
                                  border: '1px solid #e5e9f0',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                                    {t.variant || 'Test'}
                                    <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>
                                      {t.questions?.length || 0} questions
                                    </span>
                                  </div>
                                  {attempt && (
                                    <div style={{ fontSize: 13, color: '#4562b8', fontWeight: 600, marginTop: 4 }}>
                                      Previous score: {attempt.latest.score} / {attempt.latest.total}
                                      {attempt.attemptCount > 1 && (
                                        <span style={{ fontWeight: 400, color: '#6b7280' }}>
                                          {' '}
                                          ({attempt.attemptCount} attempts)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <button className="btn" style={{ padding: '8px 16px' }} onClick={() => startTest(t)}>
                                  {attempt ? '🔁 Re-attempt' : 'Start Test'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="card watermark-container">
            <div className="watermark-overlay" aria-hidden="true" />
            <h2 style={{ marginTop: 0 }}>{selectedTest.title}</h2>

            {selectedTest.passage && (
              <div
                style={{
                  background: '#f9fafc',
                  border: '1px solid #e5e9f0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 18,
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-line',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  📖 READ THE PASSAGE
                </div>
                {selectedTest.passage}
              </div>
            )}

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
                    {q.explanation && (
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>💡 {q.explanation}</div>
                    )}
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
