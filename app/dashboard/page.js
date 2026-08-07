'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MindMap from '../../components/MindMap';
import Model3DViewer from '../../components/Model3DViewer';
import NotesRenderer from '../../components/NotesRenderer';
import PdfPageViewer from '../../components/PdfPageViewer';
import { getYouTubeEmbedUrl } from '../../lib/youtube';

const SUBJECTS = ['English', 'Odia', 'Hindi', 'Sanskrit', 'Math', 'Science', 'SST', 'Computer'];

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

                {/* Watermark overlay applies only to protected study content
                    (Notes, Practice Set, Mind Map) — not 3D Model or Video. */}
                <div className={['notes', 'practice', 'mindmap'].includes(view) ? 'watermark-container' : undefined}>
                  {['notes', 'practice', 'mindmap'].includes(view) && (
                    <div className="watermark-overlay" aria-hidden="true" />
                  )}

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
                      subject={subject}
                    />
                  )}

                  {view === 'mindmap' && <MindMap data={selectedChapter.mindmap} />}
                </div>

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

// Subjects whose answers read as connected prose (literature/language
// subjects) rather than fact lists — these get paragraph-style answers
// instead of bullet points.
const PARAGRAPH_SUBJECTS = ['Odia', 'English', 'Hindi', 'Sanskrit'];

// Math answers are step-by-step workings — each line (explanation sentence
// or calculation step) should stand on its own line, left-aligned, with no
// bullet marker — matching how worked solutions are conventionally shown.
const STEP_SUBJECTS = ['Math'];

function answerModeFor(subject, tabKey) {
  // Odia long-answer questions follow the BSE Odisha board-exam structure
  // (ଉପକ୍ରମ/ପ୍ରସଙ୍ଗ/ବ୍ୟାଖ୍ୟା or ଭୂମିକା/ମୂଳ ବିଷୟବସ୍ତୁ/ଉପସଂହାର) — labelled
  // sections, not a single merged paragraph and not bullets.
  if (subject === 'Odia' && tabKey === 'long_answer') return 'odia_sections';
  if (PARAGRAPH_SUBJECTS.includes(subject)) return 'paragraph';
  if (STEP_SUBJECTS.includes(subject)) return 'steps';
  return 'bullet';
}

function PracticeSet({ questions, shortAnswerPdfUrl, longAnswerPdfUrl, subject }) {
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
      {activeTab === 'one_liners' && <QASection questions={sections.one_liners} compact accent="#5b7fdb" mode={answerModeFor(subject, 'one_liners')} />}
      {activeTab === 'short_answer' && <QASection questions={sections.short_answer} pdfUrl={shortAnswerPdfUrl} accent="#35b7a3" mode={answerModeFor(subject, 'short_answer')} />}
      {activeTab === 'long_answer' && <QASection questions={sections.long_answer} pdfUrl={longAnswerPdfUrl} accent="#ff8a3d" mode={answerModeFor(subject, 'long_answer')} />}
    </div>
  );
}

// A lightweight, dependency-free celebration burst shown when a student
// picks the correct answer. Re-mounts (via a changing `key` prop) each time
// to replay the animation.
function Firecracker() {
  const particles = Array.from({ length: 12 }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / 12;
    const distance = 45 + Math.random() * 30;
    return {
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      emoji: ['🎉', '✨', '🎊', '⭐', '💥'][i % 5],
      delay: Math.random() * 0.08,
    };
  });
  return (
    <span className="firecracker-container">
      {particles.map((p, i) => (
        <span
          key={i}
          className="firecracker-particle"
          style={{ '--tx': `${p.tx}px`, '--ty': `${p.ty}px`, animationDelay: `${p.delay}s` }}
        >
          {p.emoji}
        </span>
      ))}
    </span>
  );
}

function MCQSection({ questions }) {
  const valid = (questions || []).filter((q) => q && q.question && Array.isArray(q.options));

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [celebrateKey, setCelebrateKey] = useState(0);

  if (valid.length === 0) {
    return <p style={{ color: '#6b7280' }}>No MCQs yet.</p>;
  }

  const q = valid[index];

  function pick(opt) {
    if (revealed) return;
    setSelected(opt);
    setRevealed(true);
    if (opt === q.answer) {
      setScore((s) => s + 1);
      setCelebrateKey((k) => k + 1);
    }
  }

  function next() {
    if (index + 1 >= valid.length) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
  }

  if (finished) {
    const pct = Math.round((score / valid.length) * 100);
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 42 }}>{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '💪'}</div>
        <h3 style={{ marginBottom: 4 }}>You scored {score} / {valid.length}</h3>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>{pct}% correct</p>
        <button className="btn" onClick={restart}>Try again</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
        Question {index + 1} of {valid.length} · Score: {score}
      </div>
      <div className="card" style={{ boxShadow: 'none', border: '1.5px solid var(--primary)' }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>{q.question}</div>
        {q.options.map((opt, j) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === q.answer;
          const showCorrect = revealed && isCorrectOpt;
          const showWrong = revealed && isSelected && !isCorrectOpt;
          return (
            <div
              key={j}
              onClick={() => pick(opt)}
              style={{
                position: 'relative',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1.5px solid',
                borderColor: showCorrect ? '#35b7a3' : showWrong ? '#e0645a' : isSelected ? '#5b7fdb' : '#e5e9f0',
                background: showCorrect ? '#eafaf6' : showWrong ? '#fdecec' : isSelected ? '#eef2fc' : '#fff',
                marginBottom: 8,
                cursor: revealed ? 'default' : 'pointer',
                fontSize: 14,
              }}
            >
              {opt}
              {revealed && isSelected && isCorrectOpt && <Firecracker key={celebrateKey} />}
            </div>
          );
        })}
        {revealed && (
          <>
            {q.explanation && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 10 }}>💡 {q.explanation}</div>
            )}
            <button className="btn" onClick={next}>
              {index + 1 >= valid.length ? 'See Results' : 'Next Question →'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Splits a multi-line answer into bullet points when it looks like a list
// (multiple lines, or "- " / "1. " style markers); falls back to a plain
// paragraph for single-line answers.
function AnswerContent({ text, mode = 'bullet' }) {
  if (!text) return <span>(no answer provided)</span>;

  // Odia long-answer: labelled sections (ଉପକ୍ରମ/ପ୍ରସଙ୍ଗ/ବ୍ୟାଖ୍ୟା or
  // ଭୂମିକା/ମୂଳ ବିଷୟବସ୍ତୁ/ଉପସଂହାର), each its own paragraph with the label
  // bolded — not merged into one blob, not bulleted. Operates on the raw
  // text (paragraph breaks matter here), before the generic line-flattening
  // below would collapse them.
  if (mode === 'odia_sections') {
    let paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paras.length <= 1) {
      paras = text.split('\n').map((p) => p.trim()).filter(Boolean);
    }
    return (
      <div>
        {paras.map((p, i) => {
          const m = p.match(/^([^:：\n]{2,24}[:：])\s*([\s\S]*)$/);
          return (
            <p key={i} style={{ margin: '0 0 12px 0', lineHeight: 1.8 }}>
              {m ? (
                <>
                  <strong>{m[1]}</strong> {m[2]}
                </>
              ) : (
                p
              )}
            </p>
          );
        })}
      </div>
    );
  }

  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  // Literature/language subjects (Odia, English, Hindi, Sanskrit) read as
  // connected prose, so join the lines into a single paragraph instead of
  // bulleting them.
  if (mode === 'paragraph') {
    return <p style={{ margin: 0 }}>{lines.join(' ')}</p>;
  }

  // Math answers are worked solutions: each explanation sentence or
  // calculation step sits on its own line, left-aligned, with no bullet —
  // matching standard step-by-step solution formatting.
  if (mode === 'steps') {
    return (
      <div>
        {lines.map((line, i) => (
          <div key={i} style={{ marginBottom: 6 }}>{line}</div>
        ))}
      </div>
    );
  }

  if (lines.length > 1) {
    return (
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {lines.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
      </ul>
    );
  }
  return <span>{text}</span>;
}

function QASection({ questions, compact, pdfUrl, accent = 'var(--primary)', mode = 'bullet' }) {
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
            <div
              key={i}
              className="card"
              style={{ marginBottom: 12, boxShadow: 'none', borderLeft: `4px solid ${accent}` }}
            >
              <div style={{ fontWeight: 600, marginBottom: compact ? 4 : 8 }}>
                {i + 1}. {q.question}
              </div>
              {revealed[i] ? (
                <div
                  style={{
                    fontSize: 14,
                    color: '#2b2f3a',
                    background: `linear-gradient(135deg, ${accent}14, ${accent}08)`,
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginTop: 6,
                    lineHeight: 1.6,
                  }}
                >
                  <AnswerContent text={q.answer} mode={mode} />
                </div>
              ) : (
                <button
                  className="btn secondary"
                  style={{ padding: '5px 12px', fontSize: 13, borderColor: accent, color: accent }}
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
