import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const JSON_SHAPE = `Produce study material as STRICT JSON with this exact shape and nothing else
(no markdown fences, no preamble):

{
  "notes": {
    "title": "string, the chapter title",
    "subtitle": "string, e.g. 'Quick Revision Notes • Grade X <Subject>'",
    "badges": ["short tag strings, e.g. 'NCERT Aligned', 'Chapter name/number', a date range or key scope"],
    "blocks": [ /* see block types allowed below */ ]
  },
  "practice_questions": {
    "mcq": [
      { "question": "string", "options": ["string","string","string","string"], "answer": "string (must match one option exactly)", "explanation": "string" }
    ],
    "one_liners": [
      { "question": "string, a quick fact-recall question", "answer": "string, a short one-sentence or few-word answer" }
    ],
    "short_answer": [
      { "question": "string", "answer": "string" }
    ],
    "long_answer": [
      { "question": "string", "answer": "string" }
    ]
  },
  "mindmap": { "title": "string", "children": [ { "title": "string", "children": [...] } ] }
}`;

const SHARED_LANGUAGE_RULES = `
STUDENT-FRIENDLY LANGUAGE — apply throughout every block's text:
- Write for the stated grade level — short sentences, everyday words.
- Any technical term must be defined in plain language the first time it appears.
- Friendly, encouraging tone, like a favorite teacher explaining it one-on-one, not a dry textbook.
- Include at least one simple, relatable real-life example or analogy per major concept.
- PLAIN TEXT ONLY — never include HTML tags (no <b>, <i>, <br>, <ul>, <li>, etc.) or Markdown formatting (no **bold**, *italic*, # headings, - bullets) inside any text field, anywhere, in any block. The app's own styling handles bold/emphasis/spacing — raw tags or Markdown symbols will show up as literal ugly text on the page. For a "label: explanation" style list item, just write it as plain text with a colon, e.g. "Eastern Ganga Kingdom: repelled Sultanate invasions..." — no markup around the label.`;

// Shared instructions for the "image" block. Photos of the actual source PDF pages
// are sent to you (labelled "Page 1", "Page 2", ...) whenever they're available —
// look at them. Only ever use an "image" block for a genuine diagram / map / figure /
// illustration, never for a page that is plain body text.
const IMAGE_BLOCK_RULES = `
IMAGE BLOCKS — "image" ({caption, page?, search_query?}):
- STRONG PREFERENCE FOR "page": if you were shown ANY page photos at all, you must actively check every one of them for a map/diagram/figure before ever using "search_query". If the map/diagram this section needs appears on ANY of the shown pages — even if it's small, mid-page, or not the main subject of that page — use "page" with that exact page number. Only fall back to "search_query" if you were shown zero page photos, or you have checked every single page photo you were given and none of them contain what's needed here. Do not default to "search_query" out of convenience when a page photo actually has it — the page photo is always the more accurate, exact image and must win.
- If using "search_query" (no matching page photo available): use a short, specific, well-known search phrase (2-6 words) for a REAL, commonly-photographed/illustrated subject (e.g. "Taj Mahal", "human digestive system diagram", "political map of India today") — something that plausibly exists as a real photo/diagram online. Do NOT use search_query for a custom, textbook-specific illustration (e.g. a hand-drawn map showing one specific dynasty's territory with invented labels, or a diagram unique to this book) — that kind of image will not exist on the open web, and forcing a search for it just returns an unrelated substitute image, which is worse than no image at all. If what's needed is that specific to this source and wasn't shown to you as a page photo, skip the image block entirely rather than searching for it.
- Never invent a page number that wasn't shown to you. If you're not looking at any page photos and can't think of a genuinely findable search_query, skip the image block entirely rather than guessing.
- Don't force it — only add an image block where a real textbook would actually put a figure.`;

const MATH_PROMPT = `You are a CBSE Math curriculum content writer for Indian school students (Std 6-10).
Given a topic or source text, ${JSON_SHAPE}

NOTES FORMAT — Math needs worked examples and formulas, not history-style timelines. Allowed block types:
- "heading" ({text}) and "paragraph" ({text}) — explain concepts step by step, building from simple to complex.
- "formula" ({title, expression, note?}) — isolate every important formula in its own block so it's easy to spot and revise. expression should be plain-text math notation (e.g. "Area = pi x r^2"), not LaTeX.
- "worked_example" ({problem, steps: [string,...], answer}) — at least 2-4 of these per chapter, each a fully solved problem showing every step, not just the final answer.
- "callout" ({title, text}) — use for common mistakes students make, or quick tips/shortcuts.
- "table" ({columns: [string,...], rows: [[string,...],...]}) — for comparing methods, formulas, or properties (e.g. types of triangles and their properties).
- "list" ({items: [string,...]}) — for straightforward bullet points, like properties or steps of a method.
- "image" — use for geometric figures/diagrams a real textbook would draw (a labelled triangle, a graph, a solid shape, a number line). See IMAGE BLOCKS rules below. 1-3 per chapter where genuinely useful.
- "glossary" — one block near the end with 5-8 key terms (e.g. "coefficient", "variable") and plain definitions.
- ALWAYS end with a "recap" block ({items: [string,...]}): 4-6 short bullet points summarizing the whole chapter's key formulas/methods.
Do NOT use a "timeline" block — it doesn't fit Math content.
${IMAGE_BLOCK_RULES}
${SHARED_LANGUAGE_RULES}

PRACTICE QUESTIONS — Math needs actual problems to solve, not just recall:
- MCQs: 25-40, a mix of conceptual questions and ones requiring a quick calculation.
- One-liners: 15-20, quick formula/definition recall (e.g. "What is the formula for the area of a circle?").
- Short-answer: 8-10 — each should be a problem to solve; the "answer" must be formatted as numbered steps (one step per line, using "\n" between steps, e.g. "1. ...\n2. ...\n3. Final answer: ..."), not a paragraph.
- Long-answer: 5-6 — multi-step word problems; the "answer" must be formatted as numbered steps (one step per line using "\n"), ending with the final answer clearly stated on its own line.

Cover the full breadth of the topic so questions don't repeat the same sub-point. Also produce a mind map with 2 levels of depth covering the key sub-topics/methods.`;

const LANGUAGE_PROMPT = `You are a CBSE language curriculum content writer for Indian school students (Std 6-10), writing for a language/literature subject (English, Odia, Hindi, or Sanskrit).
Given a topic, poem, chapter, or source text, ${JSON_SHAPE}

NOTES FORMAT — language subjects need vocabulary, grammar, and comprehension focus, not history-style timelines. Allowed block types:
- "heading" ({text}) and "paragraph" ({text}) — summarize the chapter/poem's content, theme, and message in simple words.
- "callout" ({title, text}) — use to explain literary devices (simile, metaphor, alliteration, etc.), the poet/author's background, or a key message — 1-3 per chapter.
- "glossary" ({items: [{term, definition}]}) — this is IMPORTANT for language subjects: include a solid vocabulary block, 12-20 difficult/new words from the text with simple meanings (this is word-meanings, not just technical jargon). Do not undershoot this — vocabulary is one of the main things students need from these notes.
- "table" ({columns: [string,...], rows: [[string,...],...]}) — REQUIRED whenever the text has any grammar angle at all (verb tenses, parts of speech, sentence patterns used in the chapter, conjugation, spelling rules) — a grammar rules/examples table. If the chapter genuinely has zero grammar content, you may skip this, but check carefully first.
- "list" ({items: [string,...]}) — for straightforward points like a character's traits, or steps in a grammar rule.
- "image" — ONLY if a provided page photo shows a real illustration belonging to the story/poem. Language chapters rarely need this — skip unless there's a genuine illustration on a shown page.
- ALWAYS end with a "recap" block ({items: [string,...]}): 4-6 short bullet points summarizing the chapter/poem's key ideas.
Do NOT use "timeline", "formula", or "worked_example" blocks — they don't fit language content.
${IMAGE_BLOCK_RULES}
${SHARED_LANGUAGE_RULES}

PRACTICE QUESTIONS — language subjects need comprehension and expression practice, not just fact recall:
- MCQs: 25-40 — mix of word-meaning questions, grammar correctness, and comprehension of the text.
- One-liners: 15-20 — quick word-meaning or fact recall from the text.
- Short-answer: 10-12 — comprehension-style, e.g. "Explain in your own words why...". Format the "answer" as 2-4 short bullet points (one point per line using "\n- "), not a flowing paragraph.
- Long-answer: 5-6 — essay-style: character analysis, chapter summary, or "explain the central theme/message". Format the "answer" as a bulleted list of key points (one point per line using "\n- ", covering all the main ideas a full-mark answer would need), not a continuous paragraph.

Cover the full breadth of the text so questions don't repeat the same sub-point. Also produce a mind map with 2 levels of depth covering the chapter's key ideas/characters/themes.`;

// Standalone grammar / vocabulary topic — NOT tied to a literature passage
// (e.g. "Tenses", "Active-Passive Voice", "Word Building"). Used when the admin
// flags a language-subject topic as a grammar/vocabulary topic instead of a
// literature chapter.
const GRAMMAR_PROMPT = `You are a CBSE language curriculum content writer for Indian school students (Std 6-10), writing a GRAMMAR/VOCABULARY topic (not a literature chapter — there is no poem or story here, only the language rule itself).
Given a topic or source text, ${JSON_SHAPE}

NOTES FORMAT — this is a grammar/vocabulary reference, built almost entirely around rules, patterns and word-building, not story analysis. Allowed block types:
- "heading" ({text}) and "paragraph" ({text}) — explain the rule itself in plain words: what it is, when to use it, why it matters.
- "table" ({columns: [string,...], rows: [[string,...],...]}) — the MAIN block type here: rule patterns, tense charts, conjugation tables, before/after examples (e.g. active vs passive), word-formation patterns. Include at least 2-3 tables.
- "list" ({items: [string,...]}) — for exceptions to the rule, common mistakes, or step-by-step "how to form it" points.
- "callout" ({title, text}) — 2-4 of these for tricky exceptions or easily-confused cases.
- "glossary" ({items: [{term, definition}]}) — 12-20 vocabulary words relevant to the topic (or, for pure grammar topics, key grammar terms like "auxiliary verb", "subject-verb agreement") with simple meanings and one example sentence each folded into the definition.
- ALWAYS end with a "recap" block ({items: [string,...]}): 4-6 short bullet points summarizing the rule.
Do NOT use "timeline", "formula", "worked_example", or "image" blocks — they don't fit this topic.
${SHARED_LANGUAGE_RULES}

PRACTICE QUESTIONS — heavy on applying the rule, not just remembering it:
- MCQs: 25-40 — mostly "choose the correct form" / "identify the correct usage" style.
- One-liners: 15-20 — quick rule recall or a single word-transformation each (e.g. "Change to past tense: 'I go'").
- Short-answer: 10-12 — each a short set of sentences to transform/correct/complete; format the "answer" as one corrected item per line using "\n".
- Long-answer: 4-5 — a short paragraph to rewrite applying the rule throughout, or a "explain the rule with 5 of your own examples" style question; format the "answer" as a bulleted list using "\n- ".

Cover every sub-rule/pattern of the topic so questions don't repeat the same case. Also produce a mind map with 2 levels of depth covering the rule's sub-patterns/cases.`;

const GENERAL_PROMPT = `You are a CBSE curriculum content writer for Indian school students (Std 6-10).
Given a topic or source text, ${JSON_SHAPE}

NOTES FORMAT — build "blocks" like a polished revision-notes document, choosing whichever block types genuinely fit the topic:
- Start with 1-2 "heading" + "paragraph" blocks giving an overview.
- Use "callout" blocks to explain any tricky term or highlight one especially interesting fact — don't overuse, 1-3 per chapter is plenty.
- Use a "timeline" block ({items: [{date, text}, ...]}) for history/social-science topics with a chronological sequence of events/dates. For SST/History chapters specifically, this is IMPORTANT and should almost always be included: pull out every date-worthy event in the chapter (not just 4-6 — include all of them, this could be 8-15+ for a dense chapter) as one-line "date: what happened" entries, in chronological order. This is one of the most useful revision tools for history, so don't skimp on it.
- Use a "table" block ({columns: [string,...], rows: [[string,...],...]}) for comparisons, classifications, or listing key figures/items with their features (e.g. rulers and their achievements, types of resources, parts of a cell).
- Use "list" blocks ({items: [string,...]}) for straightforward bullet points that don't need a table.
- Use "image" blocks for maps (SST — political/physical/historical maps, movement of trade routes, locations), diagrams (Science — cycles, body systems, apparatus, processes), and illustrations (Computer — device/network diagrams). This subject group benefits the most from images — actively look for 2-5 good places to add one per chapter, not just as an afterthought. See IMAGE BLOCKS rules below.
- Include exactly one "glossary" block near the end with 5-10 key terms and short, plain definitions.
- Include exactly one "quick_facts" block ({items: [string,...]}) near the end, right before the recap: a comprehensive set of one-line factual statements covering the ENTIRE chapter, not just the highlights. This is different from "recap" (which is just 4-6 top takeaways) — quick_facts should be exhaustive: aim for 15-30 short, standalone, revision-ready statements (one fact per line, no sub-points), pulled from every section of the chapter — definitions, names, numbers/dates, causes/effects, examples, everything worth knowing, in the order they appear in the chapter. Each line should make sense on its own without needing the surrounding text.
- ALWAYS end with exactly one "recap" block ({items: [string,...]}): 4-6 short bullet points summarizing the whole chapter.
${IMAGE_BLOCK_RULES}
${SHARED_LANGUAGE_RULES}

PRACTICE QUESTIONS — produce these counts:
- MCQs: 25-40
- One-liners (very short answer): 20-30
- Short-answer: 10-12 — format the "answer" as 2-4 short bullet points (one point per line using "\n- "), not a flowing paragraph.
- Long-answer: 5-6 — format the "answer" as a bulleted list of key points (one point per line using "\n- ", covering all the main ideas a full-mark answer would need), not a continuous paragraph.

Cover the full breadth of the topic so questions don't repeat the same sub-point — spread them across all the key ideas in the chapter. Also produce a mind map with 2 levels of depth covering the key sub-topics.`;

function getSystemPrompt(subject, contentType) {
  const s = (subject || '').toLowerCase();
  const isLanguage = ['english', 'odia', 'hindi', 'sanskrit'].includes(s);
  if (isLanguage && contentType === 'grammar') return GRAMMAR_PROMPT;
  if (s === 'math') return MATH_PROMPT;
  if (isLanguage) return LANGUAGE_PROMPT;
  return GENERAL_PROMPT; // SST, Science, Computer
}

// Cap how many page photos we send to Gemini per request — keeps payload size
// and token cost sane. Chapters longer than this still get full TEXT coverage;
// they just rely on "search_query" images instead of "page" images for anything
// past this cutoff.
// Cap how many page photos we send to Gemini per request. NCERT-style chapters
// commonly run 20-50 pages; the app's hosting (Vercel Serverless Functions) caps
// request bodies at ~4.5MB, so this cap + the downscaled JPEG size below are
// tuned together to comfortably stay under that for a 40-50 page chapter.
// Chapters longer than this still get full TEXT coverage — pages past the
// cutoff just fall back to "search_query" images instead of "page" images.
const MAX_PAGE_IMAGES = 45;

async function uploadPageImageToStorage(base64Data, mimeType, pageNumber) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `pdf-page/${Date.now()}-p${pageNumber}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(base64Data, 'base64');
  const { error } = await supabaseAdmin.storage
    .from('chapter-images')
    .upload(path, buffer, { contentType: mimeType, upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from('chapter-images').getPublicUrl(path);
  return data?.publicUrl || null;
}

async function searchWikimediaImage(query) {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=8' +
    '&gsrsearch=' + encodeURIComponent(`${query} filetype:bitmap`) +
    '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=800&format=json&origin=*';
  const res = await fetch(url, { headers: { 'User-Agent': 'cbse-app/1.0 (study notes generator)' } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  // Relevance guard: Wikimedia's search will always return *something*, even for
  // a query nothing real matches — and a confidently-wrong substitute image is
  // worse than no image. Only accept a result if a meaningful chunk of the query
  // words actually show up in that file's title, so we'd rather show nothing
  // than show an unrelated picture.
  const stopWords = new Set(['of', 'the', 'a', 'an', 'in', 'and', 'to', 'diagram', 'map', 'photo', 'picture', 'image']);
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const candidates = Object.values(pages)
    .filter((p) => p?.imageinfo?.[0])
    .map((p) => ({ page: p, title: (p.title || '').toLowerCase() }));

  for (const { page, title } of candidates) {
    const matchCount = queryWords.filter((w) => title.includes(w)).length;
    // Require at least half the meaningful query words (min 1) to appear in the
    // filename/title before trusting it as a real match.
    if (queryWords.length === 0 || matchCount >= Math.max(1, Math.ceil(queryWords.length / 2))) {
      const info = page.imageinfo[0];
      return {
        imageUrl: info.thumburl || info.url,
        attribution: 'Image: Wikimedia Commons',
      };
    }
  }
  // Nothing was a good enough match — better to skip the image than show a
  // random unrelated one.
  return null;
}

// Walks the flat notes.blocks array and turns each "image" block's "page" or
// "search_query" hint into a real, permanently-hosted imageUrl. Blocks that
// can't be resolved to a real image are dropped rather than left broken.
async function resolveImageBlocks(notes, pageImagesByNumber) {
  if (!notes?.blocks?.length) return;
  const resolved = [];
  for (const block of notes.blocks) {
    if (block.type !== 'image') {
      resolved.push(block);
      continue;
    }
    try {
      if (block.page && pageImagesByNumber.has(Number(block.page))) {
        const src = pageImagesByNumber.get(Number(block.page));
        const imageUrl = await uploadPageImageToStorage(src.dataBase64, src.mimeType, block.page);
        if (imageUrl) {
          resolved.push({ type: 'image', caption: block.caption || '', imageUrl });
          continue;
        }
      }
      if (block.search_query) {
        const found = await searchWikimediaImage(block.search_query);
        if (found) {
          resolved.push({
            type: 'image',
            caption: block.caption || '',
            imageUrl: found.imageUrl,
            attribution: found.attribution,
          });
          continue;
        }
      }
      // Couldn't resolve this one — drop it rather than showing a broken image.
    } catch {
      // Image resolution is best-effort; never let it fail the whole chapter.
    }
  }
  notes.blocks = resolved;
}

// Defense in depth: even with the plain-text instruction above, models don't
// always comply. Strip any HTML tags that slip into generated text fields so
// they never show up as literal "<b>...</b>" on the page — this keeps the
// text content, just removes the tag characters around it.
function stripHtmlTags(value) {
  if (typeof value === 'string') {
    return value.replace(/<\/?[a-z][a-z0-9]*\b[^<>]*>/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(stripHtmlTags);
  }
  if (value && typeof value === 'object') {
    const cleaned = {};
    for (const key of Object.keys(value)) {
      cleaned[key] = stripHtmlTags(value[key]);
    }
    return cleaned;
  }
  return value;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set on the server. Add it in Vercel > Settings > Environment Variables.' },
      { status: 500 }
    );
  }

  const { mode, grade, subject, chapter, topic, sourceText, contentType, pageImages } = await request.json();

  const userPromptIntro =
    mode === 'source'
      ? `Grade: ${grade}, Subject: ${subject}, Chapter: ${chapter || '(untitled)'}.\n\nHere is source text to base the notes and questions on:\n\n${sourceText}`
      : `Grade: ${grade}, Subject: ${subject}, Chapter: ${chapter || topic}.\n\nGenerate CBSE-aligned study material for the topic: "${topic}".`;

  const systemPrompt = getSystemPrompt(subject, contentType);

  // Build the page-photo parts (if any were sent) and an index for later
  // re-uploading whichever pages the model actually picks.
  const usablePageImages = Array.isArray(pageImages) ? pageImages.slice(0, MAX_PAGE_IMAGES) : [];
  const pageImagesByNumber = new Map();
  const imageParts = [];
  for (const img of usablePageImages) {
    if (!img?.dataBase64 || !img?.page) continue;
    pageImagesByNumber.set(Number(img.page), img);
    imageParts.push({ text: `Page ${img.page}:` });
    imageParts.push({ inlineData: { mimeType: img.mimeType || 'image/jpeg', data: img.dataBase64 } });
  }

  const parts = [{ text: userPromptIntro }, ...imageParts];

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
          contents: [{ role: 'user', parts }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 32768,
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
    let parsed = JSON.parse(cleaned);
    parsed = stripHtmlTags(parsed);

    await resolveImageBlocks(parsed.notes, pageImagesByNumber);

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate content: ' + err.message }, { status: 500 });
  }
}
