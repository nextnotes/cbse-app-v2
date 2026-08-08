import { NextResponse } from 'next/server';

// Generates CBSE-style unseen-passage reading comprehension MCQs from a
// passage the admin pastes in, for use in Mock Tests (which are independent
// of chapters — see supabase/migration_5_video_and_mocktests.sql). Mock
// tests are MCQ-only and auto-scored, so every question here — including
// question types that a real board paper would phrase as short written
// answers — is converted into a 4-option multiple-choice question that
// still genuinely tests the same reading skill. Works for any language
// subject (English, Odia, Hindi, Sanskrit) — the questions and options are
// always written in the SAME language as the passage itself, not forced
// into English, so this isn't an English-only feature.
const PASSAGE_MCQ_PROMPT = `You are a CBSE curriculum content writer for Indian school students (Std 6-10), writing unseen-passage reading comprehension questions for a mock test, modeled on real CBSE board Reading Skills sections.

You will be given the subject, a grade level, and an unseen passage (discursive/factual, or case-based/data-driven). Produce STRICT JSON with this exact shape and nothing else (no markdown fences, no preamble):

{
  "questions": [
    { "question": "string", "options": ["string","string","string","string"], "answer": "string (must match one option exactly)", "explanation": "string, 1-2 sentences on why that option is correct, referencing the passage" }
  ]
}

CRITICAL LANGUAGE RULE: write every question, option, and explanation in the SAME language and script as the passage itself — if the passage is in Odia, write in Odia (Odia script); if Hindi, write in Hindi (Devanagari); if English, write in English. Never translate the passage's language into a different one, regardless of what the "subject" field says.

Produce 8-10 questions, covering the range of real board-exam reading question types — all converted into 4-option MCQ form since this test is auto-scored:
- Main idea / gist of a specific paragraph.
- Vocabulary-in-context: what a specific word or phrase means AS USED in the passage (not just its dictionary meaning).
- Inference: what a statement or phrase implies, requiring reading between the lines, not just locating a sentence.
- "All of the following EXCEPT" / "which is NOT true" elimination-style questions.
- A complete-the-analogy or complete-the-sentence question using a word/relationship from the passage.
- One question testing overall understanding of the passage's central argument or purpose.

Rules:
- Every question and its correct answer must be fully supported by the passage itself — never introduce outside facts.
- Distractor options (the 3 wrong choices) should be plausible — close paraphrases, partial truths, or common misreadings — not obviously silly, so the question genuinely tests comprehension.
- Reference specific paragraphs where helpful (e.g. "According to paragraph 2, ...") the way real board questions do.
- Write for the stated grade level's reading ability — Std 6-8 should use simpler sentence structure and vocabulary in the questions themselves than Std 9-10.
- PLAIN TEXT ONLY — no HTML tags, no Markdown formatting (no **bold**, no bullet dashes) inside any field.
- Do not quote or reproduce large verbatim chunks of the passage inside a question — refer to it (e.g. "the writer's tone in paragraph 3") rather than repeating long spans of the original text.`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set on the server. Add it in Vercel > Settings > Environment Variables.' },
      { status: 500 }
    );
  }

  const { grade, subject, passage } = await request.json();
  if (!passage || !passage.trim()) {
    return NextResponse.json({ error: 'Paste an unseen passage first.' }, { status: 400 });
  }

  const userPrompt = `Grade: ${grade}, Subject: ${subject || '(unspecified)'}.\n\nHere is the unseen passage:\n\n${passage}`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: PASSAGE_MCQ_PROMPT }] },
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API error');
    }

    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ questions: parsed.questions || [] });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate questions: ' + err.message }, { status: 500 });
  }
}
