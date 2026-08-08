'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';
import NotesRenderer from '../../../components/NotesRenderer';

const SUBJECTS = ['English', 'Odia', 'Hindi', 'Sanskrit', 'Math', 'Science', 'SST', 'Computer'];

export default function AdminDashboard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState('chapters'); // 'chapters' | 'mocktests' | 'feedback'
  const [existing, setExisting] = useState([]);

  const [grade, setGrade] = useState('8');
  const [subject, setSubject] = useState('SST');
  const [chapter, setChapter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [notes, setNotes] = useState('');
  const EMPTY_QUESTIONS = { mcq: [], one_liners: [], short_answer: [], long_answer: [] };
  const [practiceQuestions, setPracticeQuestions] = useState(EMPTY_QUESTIONS);
  const [mindmap, setMindmap] = useState(null);
  const [model3dLinks, setModel3dLinks] = useState([]);
  const [videoLinks, setVideoLinks] = useState([]);
  const [pdfPath, setPdfPath] = useState('');
  const [shortAnswerPdfPath, setShortAnswerPdfPath] = useState('');
  const [longAnswerPdfPath, setLongAnswerPdfPath] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadingShortPdf, setUploadingShortPdf] = useState(false);
  const [uploadingLongPdf, setUploadingLongPdf] = useState(false);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);

  const [aiTopic, setAiTopic] = useState('');
  const [isGrammarTopic, setIsGrammarTopic] = useState(false);
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
    const { data } = await supabase
      .from('content')
      .select('*')
      .order('grade', { ascending: true })
      .order('subject', { ascending: true })
      .order('order_index', { ascending: true });
    setExisting(data || []);
  }

  async function moveChapter(id, direction) {
    const chapter = existing.find((c) => c.id === id);
    if (!chapter) return;
    const siblings = existing
      .filter((c) => c.grade === chapter.grade && c.subject === chapter.subject)
      .sort((a, b) => a.order_index - b.order_index);
    const idx = siblings.findIndex((c) => c.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];

    await supabase.from('content').update({ order_index: other.order_index }).eq('id', chapter.id);
    await supabase.from('content').update({ order_index: chapter.order_index }).eq('id', other.id);
    loadContent();
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
      // Cap how many pages we render to photos (matches server's MAX_PAGE_IMAGES).
      // NCERT-style chapters commonly run 20-50 pages; the app's hosting (Vercel
      // Serverless Functions) caps request bodies at ~4.5MB, so this cap + the
      // downscaled JPEG size below are tuned together to stay safely under that.
      const MAX_PAGE_IMAGES = 45;
      const pageImages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item) => item.str).join(' ') + '\n\n';

        if (i <= MAX_PAGE_IMAGES) {
          // Render the page to a downscaled, fairly compressed JPEG so the AI can
          // still see any diagrams/maps/illustrations on it (for "image" blocks),
          // while keeping total request size well under hosting limits even for
          // a 40-50 page chapter (target: roughly 40-60KB per page once encoded).
          const baseViewport = page.getViewport({ scale: 1 });
          const targetWidth = 650;
          const scale = targetWidth / baseViewport.width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
          pageImages.push({ page: i, mimeType: 'image/jpeg', dataBase64: dataUrl.split(',')[1] });
        }
      }

      // Keep the request a sane size — trim only extremely long chapter PDFs.
      // (Gemini 3.6 Flash's context window comfortably fits a full chapter's
      // worth of text; this is just a safety cap for pathological inputs.)
      const MAX_CHARS = 400000;
      const trimmed = fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) : fullText;
      setAiSourceText(trimmed);

      // Auto-fill the chapter name from the PDF's filename if it's empty,
      // so you don't have to type it before generating.
      let chapterTitle = chapter.trim();
      if (!chapterTitle) {
        chapterTitle = file.name
          .replace(/\.pdf$/i, '')
          .replace(/[_-]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setChapter(chapterTitle);
      }

      setExtractingPdf(false);
      setMessage(
        fullText.length > MAX_CHARS
          ? `⚠️ This PDF is very long (${pdf.numPages} pages) — trimmed to fit. Generating now; for full coverage on very long chapters, consider splitting into 2 chapters.`
          : pdf.numPages > MAX_PAGE_IMAGES
          ? `📄 Read ${pdf.numPages} page(s) — generating content now. Note: only the first ${MAX_PAGE_IMAGES} pages could be sent as photos for diagrams/maps, so any figures past page ${MAX_PAGE_IMAGES} will use a substitute reference image instead of the exact one from this PDF.`
          : `📄 Read ${pdf.numPages} page(s) — generating content now...`
      );

      // Go straight into generation — no separate click needed.
      await generateWithAI('source', trimmed, chapterTitle, pageImages);
    } catch (err) {
      setExtractingPdf(false);
      setMessage(
        "❌ Could not read that PDF: " + err.message + " (scanned/image-only PDFs can't be read this way — try pasting the text instead.)"
      );
    }
  }

  async function generateWithAI(mode, sourceTextOverride, chapterOverride, pageImages) {
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
          chapter: chapterOverride ?? chapter,
          topic: aiTopic,
          sourceText: sourceTextOverride ?? aiSourceText,
          contentType: isGrammarTopic ? 'grammar' : undefined,
          pageImages: pageImages || [],
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

    const row = {
      grade: Number(grade),
      subject,
      chapter: chapter.trim(),
      notes,
      practice_questions: practiceQuestions,
      mindmap,
      pdf_path: pdfPath || null,
      short_answer_pdf_path: shortAnswerPdfPath || null,
      long_answer_pdf_path: longAnswerPdfPath || null,
      video_links: videoLinks,
      model_3d_links: model3dLinks,
    };

    let error;
    if (editingId) {
      // order_index is intentionally left out of `row` on edit — it stays
      // whatever it already was, so editing a chapter never changes its position.
      ({ error } = await supabase.from('content').update(row).eq('id', editingId));
    } else {
      // New chapters go to the end of their grade+subject group.
      const siblings = existing.filter((c) => c.grade === Number(grade) && c.subject === subject);
      const nextOrderIndex = siblings.length > 0 ? Math.max(...siblings.map((c) => c.order_index || 0)) + 1 : 0;
      ({ error } = await supabase.from('content').insert({ ...row, order_index: nextOrderIndex, created_by: user.id }));
    }

    setSaving(false);
    if (error) {
      setMessage('❌ ' + error.message);
      return;
    }
    setMessage(editingId ? '✅ Chapter updated!' : '✅ Saved!');
    handleCancelEdit();
    loadContent();
  }

  function handleEditChapter(c) {
    setEditingId(c.id);
    setGrade(String(c.grade));
    setSubject(c.subject);
    setChapter(c.chapter);
    setNotes(c.notes || '');
    setPracticeQuestions(c.practice_questions || EMPTY_QUESTIONS);
    setMindmap(c.mindmap || null);
    setPdfPath(c.pdf_path || '');
    setShortAnswerPdfPath(c.short_answer_pdf_path || '');
    setLongAnswerPdfPath(c.long_answer_pdf_path || '');
    setVideoLinks(c.video_links || []);
    setModel3dLinks(c.model_3d_links || []);
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setChapter('');
    setNotes('');
    setPracticeQuestions(EMPTY_QUESTIONS);
    setMindmap(null);
    setPdfPath('');
    setShortAnswerPdfPath('');
    setLongAnswerPdfPath('');
    setVideoLinks([]);
    setModel3dLinks([]);
  }

  async function handleDelete(id) {
    await supabase.from('content').delete().eq('id', id);
    if (editingId === id) handleCancelEdit();
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
          <div className={`tab ${mode === 'feedback' ? 'active' : ''}`} onClick={() => setMode('feedback')}>
            💬 Feedback
          </div>
        </div>

        {mode === 'mocktests' ? (
          <MockTestsPanel />
        ) : mode === 'feedback' ? (
          <FeedbackPanel />
        ) : (
        <div className="grid cols-2">
          {/* LEFT: Create/Generate content */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{editingId ? 'Editing chapter' : 'Add chapter content'}</h3>
            {editingId && (
              <div style={{ background: '#fff8e6', border: '1px solid #f0d98a', borderRadius: 10, padding: '8px 12px', fontSize: 13, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✏️ Editing "{chapter}" — changes will update this chapter, not create a new one.</span>
                <button type="button" className="btn secondary" style={{ padding: '3px 10px', fontSize: 12, flexShrink: 0, marginLeft: 8 }} onClick={handleCancelEdit}>
                  Cancel
                </button>
              </div>
            )}

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

              {['English', 'Odia', 'Hindi', 'Sanskrit'].includes(subject) && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 400 }}>
                  <input
                    type="checkbox"
                    checked={isGrammarTopic}
                    onChange={(e) => setIsGrammarTopic(e.target.checked)}
                  />
                  This is a Grammar / Vocabulary topic (not a poem or story — e.g. "Tenses", "Active-Passive Voice")
                </label>
              )}

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

              <label>Option B — upload the chapter PDF (generates content automatically, no chapter name needed first)</label>
              <input
                className="input"
                type="file"
                accept="application/pdf"
                onChange={handleChapterPdfUpload}
                disabled={extractingPdf || aiLoading}
              />
              {extractingPdf && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Reading PDF...</div>}
              {aiLoading && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Generating content, this can take a minute...</div>}

              <label>...or paste text / textbook content directly (then click Generate below)</label>
              <textarea
                className="input"
                rows={5}
                placeholder="Paste chapter text here — or just upload a PDF above and skip this box entirely..."
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

            <div style={{ fontWeight: 700, fontSize: 15, margin: '18px 0 6px' }}>3D Models</div>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: -4 }}>
              Add as many as you like — upload a .glb file, or paste a direct link instead.
            </p>
            <Model3DLinksBuilder items={model3dLinks} onChange={setModel3dLinks} />

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
              {saving ? 'Saving...' : editingId ? 'Update chapter' : 'Save chapter'}
            </button>
          </div>

          {/* RIGHT: Existing content list */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Existing chapters</h3>
            {existing.length === 0 && <p style={{ color: '#6b7280' }}>Nothing uploaded yet.</p>}
            {Object.entries(
              existing.reduce((groups, c) => {
                const gradeKey = `Std ${c.grade}`;
                groups[gradeKey] = groups[gradeKey] || {};
                groups[gradeKey][c.subject] = groups[gradeKey][c.subject] || [];
                groups[gradeKey][c.subject].push(c);
                return groups;
              }, {})
            ).map(([gradeLabel, subjects]) => (
              <div key={gradeLabel} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-dark)', marginTop: 10 }}>{gradeLabel}</div>
                {Object.entries(subjects).map(([subjectName, chapters]) => (
                  <div key={subjectName} style={{ marginTop: 8, marginLeft: 8 }}>
                    <div className="badge" style={{ marginBottom: 6 }}>{subjectName}</div>
                    {chapters
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((c, i, arr) => (
                        <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e9f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <button
                              className="btn secondary"
                              style={{ padding: '0 6px', fontSize: 11, lineHeight: '18px' }}
                              onClick={() => moveChapter(c.id, 'up')}
                              disabled={i === 0}
                            >
                              ▲
                            </button>
                            <button
                              className="btn secondary"
                              style={{ padding: '0 6px', fontSize: 11, lineHeight: '18px' }}
                              onClick={() => moveChapter(c.id, 'down')}
                              disabled={i === arr.length - 1}
                            >
                              ▼
                            </button>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.chapter}</div>
                            <div style={{ marginTop: 4 }}>
                              <button className="btn secondary" style={{ padding: '3px 9px', fontSize: 11, marginRight: 6 }} onClick={() => handleEditChapter(c)}>
                                Edit
                              </button>
                              <button className="btn danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleDelete(c.id)}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
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
// Admin panel: view student feedback ("how did you feel about this session?").
// Private to admins only — not a public wall, since unmoderated student
// messages showing publicly isn't appropriate for a school app.
const MOOD_ICONS = { great: '😃', good: '🙂', okay: '😐', confused: '😕', frustrated: '😞' };
const MOOD_LABELS = { great: 'Great', good: 'Good', okay: 'Okay', confused: 'Confused', frustrated: 'Frustrated' };

function FeedbackPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moodFilter, setMoodFilter] = useState('all');
  const [displayNames, setDisplayNames] = useState({});
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
    setEntries(data || []);
    setDisplayNames(Object.fromEntries((data || []).map((e) => [e.id, e.display_name || ''])));
    setLoading(false);
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('feedback').delete().eq('id', id);
    if (error) {
      setActionMessage('❌ ' + error.message);
      return;
    }
    loadFeedback();
  }

  async function toggleApprove(id) {
    const current = entries.find((e) => e.id === id);
    const { error } = await supabase
      .from('feedback')
      .update({ approved: !current.approved, display_name: (displayNames[id] || '').trim() || null })
      .eq('id', id);
    if (error) {
      setActionMessage('❌ ' + error.message);
      return;
    }
    setActionMessage('');
    loadFeedback();
  }

  async function saveDisplayName(id) {
    const { error } = await supabase
      .from('feedback')
      .update({ display_name: (displayNames[id] || '').trim() || null })
      .eq('id', id);
    if (error) setActionMessage('❌ ' + error.message);
  }

  const filtered = moodFilter === 'all' ? entries : entries.filter((e) => e.mood === moodFilter);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Student Feedback</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginTop: -8 }}>
        Private to admins only. {entries.length} total.
      </p>
      {actionMessage && <div className="error-text">{actionMessage}</div>}

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {['all', 'great', 'good', 'okay', 'confused', 'frustrated'].map((m) => (
          <div key={m} className={`tab ${moodFilter === m ? 'active' : ''}`} onClick={() => setMoodFilter(m)}>
            {m === 'all' ? 'All' : `${MOOD_ICONS[m]} ${MOOD_LABELS[m]}`}
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No feedback yet.</p>
      ) : (
        filtered.map((e) => (
          <div key={e.id} className="card" style={{ marginBottom: 10, boxShadow: 'none', background: '#f9fafc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <span style={{ fontSize: 20, marginRight: 8 }}>{MOOD_ICONS[e.mood] || '❓'}</span>
                {e.rating && <span style={{ color: '#e8b93a', marginRight: 8 }}>{'★'.repeat(e.rating)}{'☆'.repeat(5 - e.rating)}</span>}
                <strong>{e.student_name || 'Unknown student'}</strong>
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                  {new Date(e.created_at).toLocaleString()}
                </span>
                {e.approved && (
                  <span className="badge" style={{ marginLeft: 8, background: '#eafaf6', color: '#1f7a6c' }}>
                    ✅ Public
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  className="btn secondary"
                  style={{ padding: '2px 10px', fontSize: 11 }}
                  onClick={() => toggleApprove(e.id)}
                  disabled={!e.message}
                  title={!e.message ? 'No message to show publicly' : ''}
                >
                  {e.approved ? 'Unapprove' : 'Approve to show publicly'}
                </button>
                <button className="btn danger" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => handleDelete(e.id)}>
                  ✕
                </button>
              </div>
            </div>
            {e.message && (
              <p style={{ fontSize: 14, marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}>{e.message}</p>
            )}
            {e.message && (
              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11 }}>Public display name (shown instead of real name if approved)</label>
                <input
                  className="input"
                  style={{ marginBottom: 0, padding: '6px 10px', fontSize: 13 }}
                  placeholder="e.g. A Std 8 Student — leave blank for 'A student'"
                  value={displayNames[e.id] ?? ''}
                  onChange={(ev) => setDisplayNames({ ...displayNames, [e.id]: ev.target.value })}
                  onBlur={() => saveDisplayName(e.id)}
                />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

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
  const [passage, setPassage] = useState('');
  const [generatingFromPassage, setGeneratingFromPassage] = useState(false);
  const [importChapters, setImportChapters] = useState([]);
  const [importChapterId, setImportChapterId] = useState('');
  const [importSectionLabel, setImportSectionLabel] = useState('');

  const SUBJECTS = ['English', 'Odia', 'Hindi', 'Sanskrit', 'Math', 'Science', 'SST', 'Computer'];

  useEffect(() => {
    loadTests();
  }, []);

  // Fetch the list of chapters (grade+subject already-generated content) an
  // admin can pull MCQs from — e.g. a Grammar chapter's MCQs for the
  // Grammar section of a full mock test, or a Literature chapter's for the
  // Literature section. Re-runs whenever grade/subject changes.
  useEffect(() => {
    async function loadImportChapters() {
      const { data } = await supabase
        .from('content')
        .select('id, chapter, practice_questions')
        .eq('grade', Number(grade))
        .eq('subject', subject)
        .order('order_index', { ascending: true });
      setImportChapters(data || []);
      setImportChapterId('');
    }
    loadImportChapters();
  }, [grade, subject]);

  // Pulls the MCQs from a chapter's existing practice set into this mock
  // test, tagged with a section label the admin chooses (e.g. "Grammar",
  // "Literature") so a single test can combine Reading + Grammar +
  // Literature/Topic questions like a real full-length exam paper.
  function importFromChapter() {
    const chapterRow = importChapters.find((c) => String(c.id) === String(importChapterId));
    if (!chapterRow) {
      setMessage('❌ Pick a chapter to import from first.');
      return;
    }
    const chapterMcqs = chapterRow.practice_questions?.mcq || [];
    if (chapterMcqs.length === 0) {
      setMessage(`❌ "${chapterRow.chapter}" has no MCQs in its practice set.`);
      return;
    }
    const label = importSectionLabel.trim() || chapterRow.chapter;
    const tagged = chapterMcqs.map((q) => ({ ...q, section: label }));
    setQuestions([...questions, ...tagged]);
    setMessage(`✅ Imported ${tagged.length} MCQs from "${chapterRow.chapter}" as section "${label}" — review them below before saving.`);
  }

  async function loadTests() {
    const { data } = await supabase
      .from('mock_tests')
      .select('*')
      .order('grade', { ascending: true })
      .order('subject', { ascending: true })
      .order('created_at', { ascending: false });
    setTests(data || []);
  }

  // Unseen-passage reading comprehension: paste a passage, AI drafts 8-10
  // MCQs testing it. Admin reviews/edits the drafted MCQs below (via
  // MCQBuilder or the JSON editor) before saving — this doesn't save
  // anything on its own.
  async function generateFromPassage() {
    if (!passage.trim()) {
      setMessage('❌ Paste an unseen passage first.');
      return;
    }
    setGeneratingFromPassage(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/generate-mock-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade, subject, passage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const tagged = (data.questions || []).map((q) => ({ ...q, section: q.section || 'Reading Comprehension' }));
      setQuestions([...questions, ...tagged]);
      setMessage(`✅ Added ${tagged.length} questions from the passage — review them below before saving.`);
    } catch (err) {
      setMessage('❌ ' + err.message);
    }
    setGeneratingFromPassage(false);
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
      passage: passage.trim() || null,
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
    setPassage('');
    setImportSectionLabel('');
    setImportChapterId('');
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

        <label>Unseen passage (optional — for reading comprehension tests)</label>
        <textarea
          className="input"
          rows={8}
          placeholder="Paste an unseen passage here. Students will see it above the questions when taking the test."
          value={passage}
          onChange={(e) => setPassage(e.target.value)}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ marginBottom: 14, fontSize: 13, padding: '6px 12px' }}
          disabled={generatingFromPassage}
          onClick={generateFromPassage}
        >
          {generatingFromPassage ? 'Generating...' : '✨ Generate MCQs from this passage (AI)'}
        </button>

        <div style={{ background: '#f9fafc', border: '1px solid #e5e9f0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
            Import MCQs from a chapter (e.g. a Grammar or Literature chapter, to build a full composite test)
          </div>
          <label>Chapter (from Std {grade} {subject})</label>
          <select className="input" value={importChapterId} onChange={(e) => setImportChapterId(e.target.value)}>
            <option value="">— Select a chapter —</option>
            {importChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.chapter} ({c.practice_questions?.mcq?.length || 0} MCQs)
              </option>
            ))}
          </select>
          <label>Section label (e.g. "Grammar", "Literature" — defaults to the chapter name)</label>
          <input className="input" placeholder={importChapters.find((c) => String(c.id) === String(importChapterId))?.chapter || 'Section label'} value={importSectionLabel} onChange={(e) => setImportSectionLabel(e.target.value)} />
          <button type="button" className="btn secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={importFromChapter}>
            📥 Import MCQs from this chapter
          </button>
        </div>

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
        {Object.entries(
          tests.reduce((groups, t) => {
            const gradeKey = `Std ${t.grade}`;
            groups[gradeKey] = groups[gradeKey] || {};
            groups[gradeKey][t.subject] = groups[gradeKey][t.subject] || [];
            groups[gradeKey][t.subject].push(t);
            return groups;
          }, {})
        ).map(([gradeLabel, subjects]) => (
          <div key={gradeLabel} style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--primary-dark)', marginTop: 10 }}>{gradeLabel}</div>
            {Object.entries(subjects).map(([subjectName, subjectTests]) => (
              <div key={subjectName} style={{ marginTop: 6, marginLeft: 8 }}>
                <div className="badge" style={{ marginBottom: 6 }}>{subjectName}</div>
                {subjectTests.map((t) => (
                  <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e9f0' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                      {t.questions?.length || 0} questions{t.passage ? ' · 📖 with reading passage' : ''}
                    </div>
                    <button className="btn secondary" style={{ padding: '3px 9px', fontSize: 11, marginRight: 6 }} onClick={() => viewResults(t)}>
                      View Results
                    </button>
                    <button className="btn danger" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => handleDeleteTest(t.id)}>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ))}
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
  const [section, setSection] = useState('');
  const [editingIndex, setEditingIndex] = useState(null); // null = adding new; number = editing items[index]

  function resetForm() {
    setQuestion('');
    setOptions(['', '', '', '']);
    setAnswer('');
    setExplanation('');
    setSection('');
    setEditingIndex(null);
  }

  function addItem() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2 || !answer.trim()) return;
    const newItem = { question: question.trim(), options: cleanOptions, answer: answer.trim(), explanation: explanation.trim(), section: section.trim() || undefined };
    if (editingIndex !== null) {
      onChange(items.map((it, i) => (i === editingIndex ? newItem : it)));
    } else {
      onChange([...items, newItem]);
    }
    resetForm();
  }

  function editItem(index) {
    const item = items[index];
    setQuestion(item.question || '');
    // Pad to at least 4 option boxes so the form has room to add more.
    const padded = [...(item.options || [])];
    while (padded.length < 4) padded.push('');
    setOptions(padded);
    setAnswer(item.answer || '');
    setExplanation(item.explanation || '');
    setSection(item.section || '');
    setEditingIndex(index);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  }

  return (
    <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        MCQs — {items.length} added
        {editingIndex !== null && (
          <span style={{ color: '#5b7fdb', fontWeight: 600 }}> · editing question {editingIndex + 1}</span>
        )}
      </div>

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

      <label>Section (optional — e.g. "Reading", "Grammar", "Literature", for a combined test)</label>
      <input className="input" value={section} onChange={(e) => setSection(e.target.value)} />

      <button type="button" className="btn secondary" onClick={addItem}>
        {editingIndex !== null ? '✓ Save changes' : '+ Add question'}
      </button>
      {editingIndex !== null && (
        <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={resetForm}>
          Cancel edit
        </button>
      )}

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
                background: editingIndex === i ? '#eef2fc' : 'transparent',
              }}
            >
              <span style={{ flex: 1 }}>
                {item.section && <span style={{ color: '#5b7fdb', fontWeight: 700 }}>[{item.section}] </span>}
                {i + 1}. {item.question.slice(0, 60)}{item.question.length > 60 ? '...' : ''}
              </span>
              <button type="button" className="btn secondary" style={{ padding: '2px 8px', fontSize: 11, flexShrink: 0 }} onClick={() => editItem(i)}>
                Edit
              </button>
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
// Manual entry form for multiple 3D models per chapter — each is either an
// uploaded .glb file (private storage, signed URL at view-time) or a pasted link.
function Model3DLinksBuilder({ items, onChange }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [pendingPath, setPendingPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const cleanName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-]/g, '');
      const path = `models-3d/${Date.now()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from('chapter-files').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      setPendingPath(path);
      setUrl('');
    } catch (err) {
      setError('Upload failed: ' + err.message);
    }
    setUploading(false);
  }

  function addItem() {
    if (!pendingPath && !url.trim()) return;
    onChange([...items, { title: title.trim(), path: pendingPath || null, url: pendingPath ? null : url.trim() }]);
    setTitle('');
    setUrl('');
    setPendingPath('');
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="card" style={{ background: '#f9fafc', boxShadow: 'none', marginBottom: 14 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        3D Models — {items.length} added
      </div>

      <label>Title (optional)</label>
      <input className="input" placeholder="e.g. Human Heart" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label>Upload .glb file</label>
      <input className="input" type="file" accept=".glb" onChange={handleFileChange} disabled={uploading} />
      {uploading && <div style={{ fontSize: 13, color: '#6b7280', marginTop: -8, marginBottom: 12 }}>Uploading...</div>}
      {pendingPath && !uploading && (
        <div style={{ fontSize: 13, color: '#35b7a3', marginTop: -8, marginBottom: 12 }}>✅ Ready: {pendingPath.split('/').pop()}</div>
      )}
      {error && <div className="error-text" style={{ marginTop: -8 }}>{error}</div>}

      <label>...or paste a direct link instead</label>
      <input
        className="input"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={!!pendingPath}
      />

      <button type="button" className="btn secondary" onClick={addItem}>
        + Add 3D model
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
              <span style={{ flex: 1 }}>
                {item.title || (item.path ? item.path.split('/').pop() : item.url)}
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
