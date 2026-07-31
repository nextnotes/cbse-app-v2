'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import NotesRenderer from '../../../components/NotesRenderer';

const SUBJECTS = ['English', 'Odia', 'Math', 'Science', 'SST', 'Computer'];

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState('chapters'); // 'chapters' | 'mocktests'
  const [existing, setExisting] = useState([]);

  const [grade, setGrade] = useState('8');
  const [subject, setSubject] = useState('SST');
  const [chapter, setChapter] = useState('');
  const [notes, setNotes] = useState('');
  const EMPTY_QUESTIONS = { mcq: [], one_liners: [], short_answer: [], long_answer: [] };
  const [practiceQuestions, setPracticeQuestions] = useState(EMPTY_QUESTIONS);
  const [mindmap, setMindmap] = useState(null);
  const [model3dUrl, setModel3dUrl] = useState('');
  const [videoLinks, setVideoLinks] = useState([]);
  const [pdfPath, setPdfPath] = useState('');
  const [model3dPath, setModel3dPath] = useState('');
  const [shortAnswerPdfPath, setShortAnswerPdfPath] = useState('');
  const [longAnswerPdfPath, setLongAnswerPdfPath] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingShortPdf, setUploadingShortPdf] = useState(false);
  const [uploadingLongPdf, setUploadingLongPdf] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);

  const [aiTopic, setAiTopic] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/admin/login');
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return router.push('/admin/login');
      setChecking(false);
      loadContent();
    }
    checkAdmin();
  }, [router]);

  async function loadContent() {
    const { data } = await supabase.from('content').select('*').order('created_at', { ascending: false });
    setExisting(data || []);
  }

  async function handleChapterPdfUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setExtractingPdf(true);
    setMessage('');
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(' ') + '\n\n';
      }

      // Keep the request a sane size — trim very long chapter PDFs.
      const MAX_CHARS = 18000;
      const trimmed = fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) : fullText;

      setAiSourceText(trimmed);
      setMessage(
        fullText.length > MAX_CHARS
          ? `✅ Extracted text from ${pdf.numPages} page(s) — trimmed to fit. Review below, then click "Generate from pasted text".`
          : `✅ Extracted text from ${pdf.numPages} page(s) — review below, then click "Generate from pasted text".`
      );
    } catch (err) {
      setMessage('❌ Could not read that PDF: ' + err.message + ' (scanned/image-only PDFs can\'t be read this way — try pasting the text instead.)');
    }
    setExtractingPdf(false);
  }

  async function generateWithAI(mode) {
    setAiLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode, // 'topic' or 'source'
          grade,
          subject,
          chapter,
          topic: aiTopic,
          sourceText: aiSourceText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed');

      setNotes(data.notes || '');
      setPracticeQuestions(data.practice_questions || EMPTY_QUESTIONS);
      setMindmap(data.mindmap || null);
      setMessage('✅ AI content generated below — review and save.');
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
    setAiLoading(false);
  }

  async function uploadFile(file, folder) {
    const cleanName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-]/g, '');
    const path = `${folder}/${Date.now()}-${cleanName}`;
    const { error } = await supabase.storage.from('chapter-files').upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  }

  async function handlePdfFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    setMessage('');
    try {
      const path = await uploadFile(file, 'notes-pdf');
      setPdfPath(path);
      setMessage('✅ PDF uploaded — it will attach when you save this chapter.');
    } catch (err) {
      setMessage('❌ PDF upload failed: ' + err.message);
    }
    setUploadingPdf(false);
  }

  async function handleModelFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingModel(true);
    setMessage('');
    try {
      const path = await uploadFile(file, 'models-3d');
      setModel3dPath(path);
      setMessage('✅ 3D model uploaded — it will attach when you save this chapter.');
    } catch (err) {
      setMessage('❌ 3D model upload failed: ' + err.message);
    }
    setUploadingModel(false);
  }

  async function handleShortAnswerPdfChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingShortPdf(true);
    setMessage('');
    try {
      const path = await uploadFile(file, 'short-answer-pdf');
      setShortAnswerPdfPath(path);
      setMessage('✅ Short-answer PDF uploaded — it will attach when you save this chapter.');
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message);
    }
    setUploadingShortPdf(false);
  }

  async function handleLongAnswerPdfChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLongPdf(true);
    setMessage('');
    try {
      const path = await uploadFile(file, 'long-answer-pdf');
      setLongAnswerPdfPath(path);
      setMessage('✅ Long-answer PDF uploaded — it will attach when you save this chapter.');
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message);
    }
    setUploadingLongPdf(false);
  }

  async function handleSave() {
    if (!chapter.trim()) {
      setMessage('❌ Please enter a chapter name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('content').insert({
      grade: Number(grade),
      subject,
      chapter: chapter.trim(),
      notes,
      practice_questions: practiceQuestions,
      mindmap,
      model_3d_url: model3dUrl || null,
      pdf_path: pdfPath || null,
      model_3d_path: model3dPath || null,
      short_answer_pdf_path: shortAnswerPdfPath || null,
      long_answer_pdf_path: longAnswerPdfPath || null,
      video_links: videoLinks,
      created_by: user.id,
    });

    setSaving(false);
    if (error) {
      setMessage('❌ ' + error.message);
      return;
    }
    setMessage('✅ Saved!');
    setChapter('');
    setNotes('');
    setPracticeQuestions(EMPTY_QUESTIONS);
    setMindmap(null);
    setModel3dUrl('');
    setPdfPath('');
    setModel3dPath('');
    setShortAnswerPdfPath('');
    setLongAnswerPdfPath('');
    setVideoLinks([]);
    loadContent();
  }

  async function handleDelete(id) {
    await supabase.from('content').delete().eq('id', id);
    loadContent();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (checking) return <div className="container">Checking access...</div>;

  return (
    <div>
      <div className="navbar">
        <div className="brand">🎓 CBSE Vidyasetu — Admin</div>
        <button className="btn secondary" style={{ padding: '6px 12px' }} onClick={handleLogout}>
          Log out
        </button>
      </div>

      <div className="container">
        <div className="tabs">
          <div className={`tab ${mode === 'chapters' ? 'active' : ''}`} onClick={() => setMode('chapters')}>
            Chapter Content
          </div>
          <div className={`tab ${mode === 'mocktests' ? 'active' : ''}`} onClick={() => setMode('mocktests')}>
            Mock Tests
          </div>
        </div>

        {mode === 'mocktests' ? (
          <MockTestsPanel />
        ) : (
        <div className="grid cols-2">
          {/* LEFT: Create/Generate content */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add chapter content</h3>

            <label>Grade</label>
            <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {[6, 7, 8, 9, 10].map((g) => (
                <option key={g} value={g}>Std {g}</option>
              ))}
            </select>

            <label>Subject</label>
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <label>Chapter name</label>
            <input className="input" value={chapter} onChange={(e) => setChapter(e.target.value)} />

            <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🤖 Generate with AI</div>

              <label>Option A — from a topic name</label>
              <input
                className="input"
                placeholder="e.g. Resources and Development"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
              <button className="btn secondary" style={{ marginBottom: 14 }} disabled={aiLoading} onClick={() => generateWithAI('topic')}>
                {aiLoading ? 'Generating...' : 'Generate from topic'}
              </button>

              <label>Option B — upload the chapter PDF (text will be extracted below)</label>
              <input
                className="input"
                type="file"
                accept="application/pdf"
                onChange={handleChapterPdfUpload}
                disabled={extractingPdf}
              />
              {extractingPdf && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Reading PDF...</div>}

              <label>...or paste text / textbook content directly</label>
              <textarea
                className="input"
                rows={5}
                placeholder="Paste chapter text here, or upload a PDF above to fill this in automatically..."
                value={aiSourceText}
                onChange={(e) => setAiSourceText(e.target.value)}
              />
              <button className="btn secondary" disabled={aiLoading} onClick={() => generateWithAI('source')}>
                {aiLoading ? 'Generating...' : 'Generate from pasted text'}
              </button>
            </div>

            <label>Notes</label>
            {typeof notes === 'string' ? (
              <>
                <textarea
                  className="input"
                  rows={8}
                  placeholder="Type manual notes here, or use 'Generate with AI' above for a nicely styled layout."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </>
            ) : (
              <div style={{ marginBottom: 14 }}>
                <div className="card" style={{ marginBottom: 10, maxHeight: 400, overflowY: 'auto' }}>
                  <NotesRenderer notes={notes} />
                </div>
                <button type="button" className="btn secondary" style={{ marginBottom: 10, fontSize: 13, padding: '6px 12px' }} onClick={() => setNotes('')}>
                  Clear & write manually instead
                </button>
                <label style={{ fontSize: 12 }}>Edit generated notes (advanced JSON)</label>
                <textarea
                  className="input"
                  rows={10}
                  value={JSON.stringify(notes, null, 2)}
                  onChange={(e) => {
                    try { setNotes(JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                  }}
                />
              </div>
            )}

            <div style={{ fontWeight: 700, fontSize: 15, margin: '18px 0 6px' }}>Practice questions</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: -4 }}>
              Fill these using AI above, or add manually below. Suggested counts: 20-30 very short answer, 10-12 short answer, 5-6 long answer.
            </p>

            <QABuilder
              label="Very Short Answer (aim for 20-30)"
              items={practiceQuestions.one_liners || []}
              onChange={(items) => setPracticeQuestions({ ...practiceQuestions, one_liners: items })}
              answerRows={2}
            />
            <QABuilder
              label="Short Answer (aim for 10-12)"
              items={practiceQuestions.short_answer || []}
              onChange={(items) => setPracticeQuestions({ ...practiceQuestions, short_answer: items })}
              answerRows={4}
            />
            <QABuilder
              label="Long Answer (aim for 5-6)"
              items={practiceQuestions.long_answer || []}
              onChange={(items) => setPracticeQuestions({ ...practiceQuestions, long_answer: items })}
              answerRows={7}
            />

            <button
              type="button"
              className="btn secondary"
              style={{ marginBottom: 10, fontSize: 13, padding: '6px 12px' }}
              onClick={() => setShowAdvancedJson(!showAdvancedJson)}
            >
              {showAdvancedJson ? 'Hide' : 'Show'} advanced JSON editor (also covers MCQs)
            </button>
            {showAdvancedJson && (
              <textarea
                className="input"
                rows={16}
                value={JSON.stringify(practiceQuestions, null, 2)}
                onChange={(e) => {
                  try { setPracticeQuestions(JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
                }}
              />
            )}

            <label>Mind map (JSON — auto-filled by AI, or edit manually)</label>
            <textarea
              className="input"
              rows={6}
              value={JSON.stringify(mindmap, null, 2)}
              onChange={(e) => {
                try { setMindmap(JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
              }}
            />

            <label>Upload Notes PDF (optional — shown to students alongside typed notes)</label>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={handlePdfFileChange}
              disabled={uploadingPdf}
            />
            {uploadingPdf && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Uploading...</div>}
            {pdfPath && !uploadingPdf && (
              <div style={{ fontSize: 13, color: '#35b7a3', marginTop: -8, marginBottom: 12 }}>✅ Attached: {pdfPath.split('/').pop()}</div>
            )}

            <label>Upload 3D Model file (.glb) — or paste a link below instead</label>
            <input
              className="input"
              type="file"
              accept=".glb"
              onChange={handleModelFileChange}
              disabled={uploadingModel}
            />
            {uploadingModel && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Uploading...</div>}
            {model3dPath && !uploadingModel && (
              <div style={{ fontSize: 13, color: '#35b7a3', marginTop: -8, marginBottom: 12 }}>✅ Attached: {model3dPath.split('/').pop()}</div>
            )}

            <label>...or 3D model URL (optional — used only if no file uploaded above)</label>
            <input className="input" value={model3dUrl} onChange={(e) => setModel3dUrl(e.target.value)} />

            <div style={{ fontWeight: 700, fontSize: 15, margin: '18px 0 6px' }}>Video Notes (YouTube)</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: -4 }}>
              Paste a YouTube link (watch, youtu.be, or shorts links all work) and give it a short title.
            </p>
            <VideoLinksBuilder items={videoLinks} onChange={setVideoLinks} />

            <label>Upload Short Answer questions PDF (optional — shown alongside manual entries above)</label>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={handleShortAnswerPdfChange}
              disabled={uploadingShortPdf}
            />
            {uploadingShortPdf && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Uploading...</div>}
            {shortAnswerPdfPath && !uploadingShortPdf && (
              <div style={{ fontSize: 13, color: '#35b7a3', marginTop: -8, marginBottom: 12 }}>✅ Attached: {shortAnswerPdfPath.split('/').pop()}</div>
            )}

            <label>Upload Long Answer questions PDF (optional — shown alongside manual entries above)</label>
            <input
              className="input"
              type="file"
              accept="application/pdf"
              onChange={handleLongAnswerPdfChange}
              disabled={uploadingLongPdf}
            />
            {uploadingLongPdf && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Uploading...</div>}
            {longAnswerPdfPath && !uploadingLongPdf && (
              <div style={{ fontSize: 13, color: '#35b7a3', marginTop: -8, marginBottom: 12 }}>✅ Attached: {longAnswerPdfPath.split('/').pop()}</div>
            )}

            {message && <div style={{ marginBottom: 12, fontSize: 14 }}>{message}</div>}

            <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={handleSave}>
              {saving ? 'Saving...' : 'Save chapter'}
            </button>
          </div>

          {/* RIGHT: Existing content list */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Existing chapters</h3>
            {existing.length === 0 && <p style={{ color: '#6b7280' }}>Nothing uploaded yet.</p>}
            {existing.map((c) => (
              <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e9f0' }}>
                <div style={{ fontWeight: 600 }}>{c.chapter}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
                  Std {c.grade} · {c.subject}
                </div>
                <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDelete(c.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Admin panel: create mock tests (MCQ sets), list them, and view/export
// student results as an Excel file.
function MockTestsPanel() {
  const [grade, setGrade] = useState('8');
  const [subject, setSubject] = useState('SST');
  const [title, setTitle] = useState('');
  const EMPTY_MCQS = [];
  const [questions, setQuestions] = useState(EMPTY_MCQS);
  const [showJson, setShowJson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [tests, setTests] = useState([]);
  const [resultsFor, setResultsFor] = useState(null); // test object or null
  const [attempts, setAttempts] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  const SUBJECTS = ['English', 'Odia', 'Math', 'Science', 'SST', 'Computer'];

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    const { data } = await supabase.from('mock_tests').select('*').order('created_at', { ascending: false });
    setTests(data || []);
  }

  async function handleCreateTest() {
    if (!title.trim()) {
      setMessage('❌ Please enter a test title.');
      return;
    }
    if (!questions || questions.length === 0) {
      setMessage('❌ Add at least one MCQ before creating the test.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('mock_tests').insert({
      grade: Number(grade),
      subject,
      title: title.trim(),
      questions,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      setMessage('❌ ' + error.message);
      return;
    }
    setMessage('✅ Test created!');
    setTitle('');
    setQuestions(EMPTY_MCQS);
    loadTests();
  }

  async function handleDeleteTest(id) {
    await supabase.from('mock_tests').delete().eq('id', id);
    if (resultsFor?.id === id) setResultsFor(null);
    loadTests();
  }

  async function viewResults(test) {
    setResultsFor(test);
    setLoadingResults(true);
    const { data } = await supabase
      .from('mock_test_attempts')
      .select('*')
      .eq('test_id', test.id)
      .order('submitted_at', { ascending: false });
    setAttempts(data || []);
    setLoadingResults(false);
  }

  async function exportToExcel() {
    const XLSX = await import('xlsx');
    const rows = attempts.map((a) => ({
      Name: a.student_name,
      'Unique ID': a.student_unique_id,
      Score: a.score,
      Total: a.total,
      Percentage: a.total > 0 ? Math.round((a.score / a.total) * 100) + '%' : '',
      'Submitted At': new Date(a.submitted_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `${resultsFor.title.replace(/\s+/g, '_')}_results.xlsx`);
  }

  return (
    <div className="grid cols-2">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create a mock test</h3>

        <label>Grade</label>
        <select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}>
          {[6, 7, 8, 9, 10].map((g) => <option key={g} value={g}>Std {g}</option>)}
        </select>

        <label>Subject</label>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <label>Test title</label>
        <input className="input" placeholder="e.g. Chapter 1-3 Mock Test" value={title} onChange={(e) => setTitle(e.target.value)} />

        <MCQBuilder items={questions} onChange={setQuestions} />

        <button
          type="button"
          className="btn secondary"
          style={{ marginBottom: 10, fontSize: 13, padding: '6px 12px' }}
          onClick={() => setShowJson(!showJson)}
        >
          {showJson ? 'Hide' : 'Show'} advanced JSON editor (paste a bulk MCQ set)
        </button>
        {showJson && (
          <textarea
            className="input"
            rows={12}
            value={JSON.stringify(questions, null, 2)}
            onChange={(e) => {
              try { setQuestions(JSON.parse(e.target.value)); } catch { /* ignore invalid JSON while typing */ }
            }}
          />
        )}

        {message && <div style={{ marginBottom: 12, fontSize: 14 }}>{message}</div>}
        <button className="btn" style={{ width: '100%' }} disabled={saving} onClick={handleCreateTest}>
          {saving ? 'Creating...' : 'Create test'}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Existing mock tests</h3>
        {tests.length === 0 && <p style={{ color: '#6b7280' }}>No mock tests yet.</p>}
        {tests.map((t) => (
          <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #e5e9f0' }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
              Std {t.grade} · {t.subject} · {t.questions?.length || 0} questions
            </div>
            <button className="btn secondary" style={{ padding: '4px 10px', fontSize: 12, marginRight: 8 }} onClick={() => viewResults(t)}>
              View Results
            </button>
            <button className="btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleDeleteTest(t.id)}>
              Delete
            </button>
          </div>
        ))}

        {resultsFor && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Results — {resultsFor.title}</div>
            {loadingResults ? (
              <p style={{ color: '#6b7280' }}>Loading...</p>
            ) : attempts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No student attempts yet.</p>
            ) : (
              <>
                <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                  <table className="notes-table">
                    <thead>
                      <tr><th>Name</th><th>ID</th><th>Score</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {attempts.map((a) => (
                        <tr key={a.id}>
                          <td>{a.student_name}</td>
                          <td>{a.student_unique_id}</td>
                          <td>{a.score}/{a.total}</td>
                          <td>{new Date(a.submitted_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="btn secondary" onClick={exportToExcel}>
                  ⬇ Export to Excel
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Manual entry form for building MCQs one at a time (used by mock tests).
function MCQBuilder({ items, onChange }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  function addItem() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2 || !answer.trim()) return;
    onChange([...items, { question: question.trim(), options: cleanOptions, answer: answer.trim(), explanation: explanation.trim() }]);
    setQuestion('');
    setOptions(['', '', '', '']);
    setAnswer('');
    setExplanation('');
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>MCQs — {items.length} added</div>

      <label>Question</label>
      <textarea className="input" rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />

      <label>Options</label>
      {options.map((opt, i) => (
        <input
          key={i}
          className="input"
          placeholder={`Option ${i + 1}`}
          value={opt}
          onChange={(e) => {
            const next = [...options];
            next[i] = e.target.value;
            setOptions(next);
          }}
        />
      ))}

      <label>Correct answer (must match one option exactly)</label>
      <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} />

      <label>Explanation (optional)</label>
      <input className="input" value={explanation} onChange={(e) => setExplanation(e.target.value)} />

      <button type="button" className="btn secondary" onClick={addItem}>
        + Add question
      </button>

      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px solid #e5e9f0', fontSize: 13 }}>
              <span style={{ flex: 1 }}>{i + 1}. {item.question.slice(0, 60)}{item.question.length > 60 ? '...' : ''}</span>
              <button type="button" className="btn danger" style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }} onClick={() => removeItem(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A friendly manual entry form for question types that aren't multiple choice
// (very short / short / long answer). Each item becomes a "tap to show answer"
// card for students — see QASection in app/dashboard/page.js.
// Manual entry form for per-chapter YouTube video links.
function VideoLinksBuilder({ items, onChange }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  function addItem() {
    if (!url.trim()) return;
    onChange([...items, { title: title.trim(), url: url.trim() }]);
    setTitle('');
    setUrl('');
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Videos — {items.length} added
      </div>
      <label>Title (optional)</label>
      <input className="input" placeholder="e.g. Introduction to Resources" value={title} onChange={(e) => setTitle(e.target.value)} />
      <label>YouTube URL</label>
      <input className="input" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={(e) => setUrl(e.target.value)} />
      <button type="button" className="btn secondary" onClick={addItem}>
        + Add video
      </button>

      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid #e5e9f0',
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1 }}>{item.title || item.url}</span>
              <button
                type="button"
                className="btn danger"
                style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
                onClick={() => removeItem(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QABuilder({ label, items, onChange, answerRows }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  function addItem() {
    if (!question.trim() || !answer.trim()) return;
    onChange([...items, { question: question.trim(), answer: answer.trim() }]);
    setQuestion('');
    setAnswer('');
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        {label} — {items.length} added
      </div>

      <label>Question</label>
      <textarea
        className="input"
        rows={2}
        placeholder="Type or paste the question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <label>Answer</label>
      <textarea
        className="input"
        rows={answerRows || 3}
        placeholder="Type or paste the model answer..."
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
      />
      <button type="button" className="btn secondary" onClick={addItem}>
        + Add question
      </button>

      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid #e5e9f0',
                fontSize: 13,
              }}
            >
              <span style={{ flex: 1 }}>
                {i + 1}. {item.question.length > 70 ? item.question.slice(0, 70) + '...' : item.question}
              </span>
              <button
                type="button"
                className="btn danger"
                style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }}
                onClick={() => removeItem(i)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
