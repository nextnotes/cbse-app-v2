'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MindMap from '../../components/MindMap';
import Model3DViewer from '../../components/Model3DViewer';
import NotesRenderer from '../../components/NotesRenderer';
import PdfPageViewer from '../../components/PdfPageViewer';
import { getYouTubeEmbedUrl } from '../../lib/youtube';

const SUBJECTS = ['English', 'Odia', 'Math', 'Science', 'SST', 'Computer'];

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [subject, setSubject] = useState('SST');
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [view, setView] = useState('notes'); // notes | practice | mindmap | 3d
  const [loading, setLoading] = useState(true);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [signed3dUrl, setSigned3dUrl] = useState(null);
  const [model3dSignedUrls, setModel3dSignedUrls] = useState({});
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [signedShortAnswerPdfUrl, setSignedShortAnswerPdfUrl] = useState(null);
  const [signedLongAnswerPdfUrl, setSignedLongAnswerPdfUrl] = useState(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData) {
        router.push('/login');
        return;
      }
      setProfile(profileData);
      setLoading(false);
    }
    init();
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    async function loadChapters() {
      const { data } = await supabase
        .from('content')
        .select('*')
        .eq('grade', profile.grade)
        .eq('subject', subject)
        .order('order_index', { ascending: true });
      setChapters(data || []);
      setSelectedChapter(data && data.length > 0 ? data[0] : null);
      setView('notes');
    }
    loadChapters();
  }, [profile, subject]);

  useEffect(() => {
    async function loadSignedUrls() {
      setSignedPdfUrl(null);
      setSigned3dUrl(null);
      setSignedShortAnswerPdfUrl(null);
      setSignedLongAnswerPdfUrl(null);
      setModel3dSignedUrls({});
      setSelectedModelIndex(0);
      if (!selectedChapter) return;

      // Signed URLs expire in 5 minutes — students get temporary access only,
      // never a permanent link they could bookmark or share.
      if (selectedChapter.pdf_path) {
        const { data } = await supabase.storage
          .from('chapter-files')
          .createSignedUrl(selectedChapter.pdf_path, 300);
        if (data) setSignedPdfUrl(data.signedUrl);
      }
      if (selectedChapter.model_3d_path) {
        const { data } = await supabase.storage
          .from('chapter-files')
          .createSignedUrl(selectedChapter.model_3d_path, 300);
        if (data) setSigned3dUrl(data.signedUrl);
      }
      if (selectedChapter.model_3d_links?.length > 0) {
        const urlMap = {};
        for (const model of selectedChapter.model_3d_links) {
          if (model.path) {
            const { data } = await supabase.storage
              .from('chapter-files')
              .createSignedUrl(model.path, 300);
            if (data) urlMap[model.path] = data.signedUrl;
          }
        }
        setModel3dSignedUrls(urlMap);
      }
      if (selectedChapter.short_answer_pdf_path) {
        const { data } = await supabase.storage
          .from('chapter-files')
          .createSignedUrl(selectedChapter.short_answer_pdf_path, 300);
        if (data) setSignedShortAnswerPdfUrl(data.signedUrl);
      }
      if (selectedChapter.long_answer_pdf_path) {
        const { data } = await supabase.storage
          .from('chapter-files')
          .createSignedUrl(selectedChapter.long_answer_pdf_path, 300);
        if (data) setSignedLongAnswerPdfUrl(data.signedUrl);
      }
    }
    loadSignedUrls();
  }, [selectedChapter]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div>
      <div className="navbar">
        <div className="brand">🎓 CBSE Vidyasetu</div>
        <div style={{ fontSize: 14, color: '#6b7280' }}>
          {profile.name} · Std {profile.grade}{' '}
          <a href="/mock-tests" className="btn secondary" style={{ marginLeft: 12, padding: '6px 12px', textDecoration: 'none' }}>
            Mock Tests
          </a>
          <a href="/feedback" className="btn secondary" style={{ marginLeft: 8, padding: '6px 12px', textDecoration: 'none' }}>
            💬 Feedback
          </a>
          <button className="btn secondary" style={{ marginLeft: 8, padding: '6px 12px' }} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="container">
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          {SUBJECTS.map((s) => (
            <div key={s} className={`tab ${subject === s ? 'active' : ''}`} onClick={() => setSubject(s)}>
              {s}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: '220px 1fr', gap: 20 }}>
          <div className="card" style={{ padding: 12, height: 'fit-content' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              CHAPTERS
            </div>
            {chapters.length === 0 && (
              <p style={{ fontSize: 13, color: '#6b7280' }}>No chapters yet for Std {profile.grade} {subject}.</p>
            )}
            {chapters.map((c) => (
              <div
                key={c.id}
                onClick={() => { setSelectedChapter(c); setView('notes'); }}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: selectedChapter?.id === c.id ? 700 : 500,
                  background: selectedChapter?.id === c.id ? '#eef2fc' : 'transparent',
                  color: selectedChapter?.id === c.id ? '#4562b8' : '#2b2f3a',
                  marginBottom: 4,
                }}
              >
                {c.chapter}
              </div>
            ))}
          </div>

          <div className="card">
            {!selectedChapter ? (
              <p style={{ color: '#6b7280' }}>Select a chapter to begin.</p>
            ) : (
              <>
                <h2 style={{ marginTop: 0 }}>{selectedChapter.chapter}</h2>
                <div className="tabs">
                  {[
                    ['notes', 'Notes'],
                    ['practice', 'Practice Set'],
                    ['mindmap', 'Mind Map'],
                    ['3d', '3D Model'],
                    ['video', 'Video'],
                  ].map(([key, label]) => (
                    <div key={key} className={`tab ${view === key ? 'active' : ''}`} onClick={() => setView(key)}>
                      {label}
                    </div>
                  ))}
                </div>

                {view === 'notes' && (
                  <div>
                    {selectedChapter.notes ? (
                      <NotesRenderer notes={selectedChapter.notes} />
                    ) : (
                      !signedPdfUrl && <p style={{ color: '#6b7280' }}>No notes yet.</p>
                    )}
                    {signedPdfUrl && (
                      <div style={{ marginTop: 18 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                          📄 NOTES
                        </div>
                        <PdfPageViewer url={signedPdfUrl} />
                      </div>
                    )}
                  </div>
                )}

                {view === 'practice' && (
                  <PracticeSet
                    questions={selectedChapter.practice_questions}
                    shortAnswerPdfUrl={signedShortAnswerPdfUrl}
                    longAnswerPdfUrl={signedLongAnswerPdfUrl}
                  />
                )}

                {view === 'mindmap' && <MindMap data={selectedChapter.mindmap} />}

                {view === '3d' && (
                  selectedChapter.model_3d_links?.length > 0 ? (
                    <div>
                      {selectedChapter.model_3d_links.length > 1 && (
                        <div className="tabs">
                          {selectedChapter.model_3d_links.map((m, i) => (
                            <div
                              key={i}
                              className={`tab ${selectedModelIndex === i ? 'active' : ''}`}
                              onClick={() => setSelectedModelIndex(i)}
                            >
                              {m.title || `Model ${i + 1}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {(() => {
                        const model = selectedChapter.model_3d_links[selectedModelIndex] || selectedChapter.model_3d_links[0];
                        const src = model.path ? model3dSignedUrls[model.path] : model.url;
                        return <Model3DViewer src={src} alt={model.title || selectedChapter.chapter} />;
                      })()}
                    </div>
                  ) : (
                    <Model3DViewer src={signed3dUrl || selectedChapter.model_3d_url} alt={selectedChapter.chapter} />
                  )
                )}

                {view === 'video' && (
                  <div>
                    {(!selectedChapter.video_links || selectedChapter.video_links.length === 0) ? (
                      <p style={{ color: '#6b7280' }}>No videos added for this chapter yet.</p>
                    ) : (
                      selectedChapter.video_links.map((v, i) => {
                        const embedUrl = getYouTubeEmbedUrl(v.url);
                        return (
                          <div key={i} style={{ marginBottom: 22 }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>{v.title || `Video ${i + 1}`}</div>
                            {embedUrl ? (
                              <iframe
                                src={embedUrl}
                                title={v.title || `Video ${i + 1}`}
                                allowFullScreen
                                style={{ width: '100%', height: 220, border: '1px solid #e5e9f0', borderRadius: 12 }}
                              />
                            ) : (
                              <p style={{ color: '#e0645a', fontSize: 13 }}>Couldn't read this YouTube link.</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PracticeSet({ questions, shortAnswerPdfUrl, longAnswerPdfUrl }) {
  // If this ever arrives as a JSON string instead of an already-parsed
  // object/array (e.g. a double-encoding quirk from the AI response), parse
  // it first so it renders normally instead of silently showing "no questions".
  if (typeof questions === 'string') {
    try {
      questions = JSON.parse(questions);
    } catch {
      questions = null;
    }
  }

  // Backward compatibility: older saved chapters stored practice_questions as a
  // plain array of MCQs. Newer chapters store an object with 4 sections.
  const sections = Array.isArray(questions)
    ? { mcq: questions, one_liners: [], short_answer: [], long_answer: [] }
    : questions || { mcq: [], one_liners: [], short_answer: [], long_answer: [] };

  const tabs = [
    ['mcq', 'MCQ', sections.mcq?.length || 0],
    ['one_liners', 'Very Short Answer', sections.one_liners?.length || 0],
    ['short_answer', 'Short Answer', sections.short_answer?.length || 0],
    ['long_answer', 'Long Answer', sections.long_answer?.length || 0],
  ].filter(([key, , count]) => count > 0 || (key === 'short_answer' && shortAnswerPdfUrl) || (key === 'long_answer' && longAnswerPdfUrl));

  const [activeTab, setActiveTab] = useState(tabs[0]?.[0] || 'mcq');

  if (tabs.length === 0) {
    return <p style={{ color: '#6b7280' }}>No practice questions yet.</p>;
  }

  return (
    <div>
      <div className="tabs">
        {tabs.map(([key, label, count]) => (
          <div key={key} className={`tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            {label} {count > 0 ? `(${count})` : ''}
          </div>
        ))}
      </div>

      {activeTab === 'mcq' && <MCQSection questions={sections.mcq} />}
      {activeTab === 'one_liners' && <QASection questions={sections.one_liners} compact />}
      {activeTab === 'short_answer' && <QASection questions={sections.short_answer} pdfUrl={shortAnswerPdfUrl} />}
      {activeTab === 'long_answer' && <QASection questions={sections.long_answer} pdfUrl={longAnswerPdfUrl} />}
    </div>
  );
}

function MCQSection({ questions }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  if (!questions || questions.length === 0) {
    return <p style={{ color: '#6b7280' }}>No MCQs yet.</p>;
  }

  return (
    <div>
      {questions.map((q, i) => {
        if (!q || !q.question || !Array.isArray(q.options)) {
          return (
            <div key={i} className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
              <div style={{ fontSize: 13, color: '#e0645a' }}>
                Question {i + 1} is missing data and can't be shown — check the JSON for this entry in the admin dashboard.
              </div>
            </div>
          );
        }
        return (
          <div key={i} className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>
              {i + 1}. {q.question}
            </div>
            {q.options.map((opt, j) => {
              const isSelected = answers[i] === opt;
              const isCorrect = submitted && opt === q.answer;
              const isWrongSelected = submitted && isSelected && opt !== q.answer;
              return (
                <div
                  key={j}
                  onClick={() => !submitted && setAnswers({ ...answers, [i]: opt })}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid',
                    borderColor: isCorrect ? '#35b7a3' : isWrongSelected ? '#e0645a' : isSelected ? '#5b7fdb' : '#e5e9f0',
                    background: isCorrect ? '#eafaf6' : isWrongSelected ? '#fdecec' : isSelected ? '#eef2fc' : '#fff',
                    marginBottom: 6,
                    cursor: submitted ? 'default' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  {opt}
                </div>
              );
            })}
            {submitted && q.explanation && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>💡 {q.explanation}</div>
            )}
          </div>
        );
      })}
      {!submitted ? (
        <button className="btn" onClick={() => setSubmitted(true)}>
          Check answers
        </button>
      ) : (
        <button className="btn secondary" onClick={() => { setSubmitted(false); setAnswers({}); }}>
          Try again
        </button>
      )}
    </div>
  );
}

// Used for One-Liners, Short Answer, and Long Answer — a question with a
// tap-to-reveal model answer, since these aren't multiple choice.
function QASection({ questions, compact, pdfUrl }) {
  const [revealed, setRevealed] = useState({});

  return (
    <div>
      {pdfUrl && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 8 }}>📄 QUESTIONS</div>
          <PdfPageViewer url={pdfUrl} />
        </div>
      )}

      {(!questions || questions.length === 0) ? (
        !pdfUrl && <p style={{ color: '#6b7280' }}>No questions yet.</p>
      ) : (
        questions.map((q, i) => {
          if (!q || !q.question) {
            return (
              <div key={i} className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
                <div style={{ fontSize: 13, color: '#e0645a' }}>
                  Question {i + 1} is missing data and can't be shown.
                </div>
              </div>
            );
          }
          return (
          <div key={i} className="card" style={{ marginBottom: 12, boxShadow: 'none' }}>
            <div style={{ fontWeight: 600, marginBottom: compact ? 4 : 8 }}>
              {i + 1}. {q.question}
            </div>
            {revealed[i] ? (
              <div
                style={{
                  fontSize: 14,
                  color: '#2b2f3a',
                  background: '#f6f8fb',
                  padding: '10px 12px',
                  borderRadius: 8,
                  marginTop: 6,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {q.answer || '(no answer provided)'}
              </div>
            ) : (
              <button
                className="btn secondary"
                style={{ padding: '5px 12px', fontSize: 13 }}
                onClick={() => setRevealed({ ...revealed, [i]: true })}
              >
                Show answer
              </button>
            )}
          </div>
          );
        })
      )}
    </div>
  );
}
