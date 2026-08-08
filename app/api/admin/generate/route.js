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
      { "question": "string", "options": ["string","string","string","string"], "answer": "string (must match one option exactly)", "explanation": "string", "image": "OPTIONAL — omit entirely unless needed. If present: {caption, page?, crop?, search_query?}, same shape as an IMAGE BLOCK below. Only when the question genuinely can't be answered without a figure/diagram." }
    ],
    "one_liners": [
      { "question": "string, a quick fact-recall question", "answer": "string, a short one-sentence or few-word answer" }
    ],
    "short_answer": [
      { "question": "string", "answer": "string", "image": "OPTIONAL — omit entirely unless needed. Same {caption, page?, crop?, search_query?} shape as above." }
    ],
    "long_answer": [
      { "question": "string", "answer": "string", "image": "OPTIONAL — omit entirely unless needed. Same {caption, page?, crop?, search_query?} shape as above." }
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
IMAGE BLOCKS — "image" ({caption, page?, crop?, search_query?}):
- STRONG PREFERENCE FOR "page": if you were shown ANY page photos at all, you must actively check every one of them for a map/diagram/figure before ever using "search_query". If the map/diagram this section needs appears on ANY of the shown pages — even if it's small, mid-page, or not the main subject of that page — use "page" with that exact page number. Only fall back to "search_query" if you were shown zero page photos, or you have checked every single page photo you were given and none of them contain what's needed here. Do not default to "search_query" out of convenience when a page photo actually has it — the page photo is always the more accurate, exact image and must win.
- WHEN USING "page", ALSO INCLUDE "crop": most pages have a lot of body text around the actual figure — you must tell us exactly where the diagram/map/photo sits on the page so we can crop OUT the surrounding paragraphs and show just the figure. Set "crop" to {"x": number, "y": number, "width": number, "height": number}, all as fractions from 0 to 1 of the full page (x/y = top-left corner of the figure, width/height = how much of the page it spans). Look carefully at the page photo and estimate this as tightly as you reasonably can around just the figure (plus its own caption/labels if it has them) — err on the side of a slightly generous box rather than cutting off part of the figure, but do NOT include unrelated paragraphs of body text if you can avoid it. If the figure basically fills the page (e.g. a full-page map), it's fine to use something close to {"x":0,"y":0,"width":1,"height":1}. If you can't confidently estimate a tight box, you may omit "crop" and the full page will be used instead.
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
- "image" — use for geometric figures/diagrams a real textbook would draw (a labelled triangle, a graph, a solid shape, a number line). See IMAGE BLOCKS rules below. Use 3-10 per chapter, as many as the chapter genuinely needs — don't force a fixed count, but don't under-illustrate a visual-heavy chapter either.
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

QUESTION FIGURES — geometry questions routinely can't be answered without their figure (e.g. a real board question reads "In fig.1, ∠DBC equals..." and is meaningless without seeing fig.1). Whenever a question you write depends on a diagram like this — a labelled triangle/polygon with marked angles, a coordinate-geometry plot, a solid shape for mensuration, a number line — attach an "image" field to that question object, following the same IMAGE BLOCKS rules as above (prefer "page"+"crop" from a shown source page; "search_query" only for a generic well-known figure; skip the question's image and instead write the question so it's self-contained with numbers stated in words if no figure can be resolved). Never write a question that assumes an unseen figure and then fail to attach one.

Cover the full breadth of the topic so questions don't repeat the same sub-point. Also produce a mind map with 2 levels of depth covering the key sub-topics/methods.`;

// Std 9-10 Math answers must read like an actual CBSE board-exam marking
// scheme credits a student's script: concise, step-marked, formal working —
// not a tutorial explanation. Modeled directly on a real SA-I Class IX
// Math marking scheme (blueprint + sample paper + step-wise solutions).
// This is appended to MATH_PROMPT only for grade 9 and grade 10; Std 6-8
// keep the friendlier, more explanatory worked-example style above.
const MATH_BOARD_STYLE_RULES = `
STD 9-10 BOARD-EXAM ANSWER-WRITING STYLE (this OVERRIDES the Short-answer/Long-answer "answer" formatting above, and also applies to "worked_example" blocks in the notes, for this grade level only — modeled on real CBSE SA-I marking schemes):
- Skip conversational scaffolding ("Let's solve this step by step", "First, we need to...") — go straight into the mathematical working, exactly like a topper's answer script, not a tutorial.
- Use standard mathematical shorthand throughout: "⇒" for an implied/derived next step, "∴" for a concluding statement, proper roots/exponents/fractions written out in full (e.g. "√(5+2√6)", "x²-4x+1=0") — not spelled-out words for these symbols.
- Every line should be exactly one identifiable working step (one substitution, one simplification, one application of a formula/identity/theorem) — this is how each line earns its own mark in a real marking scheme. Don't merge multiple steps into one dense line, and don't split a single step across two lines.
- For algebraic problems: if a substitution simplifies the working (e.g. "Let x²+7x = p, 2x-1 = q"), state it once, then work entirely in the substituted form until the final resubstitution — don't re-explain the substitution at every step.
- For geometry proofs: name the exact justification for every deduction, the way a board answer would — the specific theorem, postulate, axiom, or congruence criterion used (e.g. "AD=BC, AB=AB, ∠DAB=∠CBA ⇒ ΔDAB≅ΔCBA (SAS)", or "Euclid's Axiom: if equals are subtracted from equals, the remainders are equal"). Never state a conclusion without naming what justifies it.
- End every solved answer with the final result isolated on its own last line (e.g. "∴ x = 115°"), not buried mid-paragraph.
- Word problems should state what's being found in one short formal line before the working starts — not a friendly lead-in sentence.
This board-exam style applies only to the "answer" field of short-answer/long-answer practice questions and to "worked_example" steps — it does NOT apply to "paragraph"/"heading" explanatory text elsewhere in the notes, which should stay in the plain, friendly teaching language instructed above. Only the solved-problem working itself should read like an exam script.`;

const MATH_PROMPT_SENIOR = `${MATH_PROMPT}
${MATH_BOARD_STYLE_RULES}`;

const LANGUAGE_PROMPT = `You are a CBSE language curriculum content writer for Indian school students (Std 6-10), writing for a language/literature subject (English, Odia, Hindi, or Sanskrit).
Given a topic, poem, chapter, or source text, ${JSON_SHAPE}

NOTES FORMAT — language subjects need vocabulary, grammar, and comprehension focus, not history-style timelines. Allowed block types:
- "heading" ({text}) and "paragraph" ({text}) — summarize the chapter/poem's content, theme, and message in simple words.
- "callout" ({title, text}) — use to explain literary devices (simile, metaphor, alliteration, etc.), the poet/author's background, or a key message — 1-3 per chapter.
- "glossary" ({items: [{term, definition}]}) — this is IMPORTANT for language subjects: include a solid vocabulary block, 12-20 difficult/new words from the text with simple meanings (this is word-meanings, not just technical jargon). Do not undershoot this — vocabulary is one of the main things students need from these notes.
- "table" ({columns: [string,...], rows: [[string,...],...]}) — REQUIRED whenever the text has any grammar angle at all (verb tenses, parts of speech, sentence patterns used in the chapter, conjugation, spelling rules) — a grammar rules/examples table. If the chapter genuinely has zero grammar content, you may skip this, but check carefully first.
- "list" ({items: [string,...]}) — for straightforward points like a character's traits, or steps in a grammar rule.
- "image" — ONLY if a provided page photo shows a real illustration belonging to the story/poem. Language chapters often don't have many of these — never invent one — but if the source pages contain multiple genuine illustrations, include all of them, up to 3-10 per chapter. Skip entirely if there are none.
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

// Odia specifically follows the BSE Odisha board-exam answer conventions for
// long-answer questions, which are written in Odia script using named
// structured sections rather than a bulleted list or free paragraph. This
// overrides just the long-answer instruction from LANGUAGE_PROMPT above.
const ODIA_LONG_ANSWER_RULES = `
ODIA LONG-ANSWER FORMAT (overrides the generic "Long-answer" line above for this subject only): each long_answer item's "question" and "answer" must be written entirely in formal, standard literary Odia script (not English, not Romanized/transliterated Odia). For each question, decide which of these two BSE Odisha board-exam answer structures fits it, and format the "answer" accordingly as labelled paragraphs, each on its own line separated by "\\n\\n" (do not use bullets "- " for these):

1. ସପ୍ରସଙ୍ଗ ସରଳାର୍ଥ (Contextual Explanation) — use when the question quotes or points to specific lines from a poem/epic and asks the student to explain them in context. Three labelled paragraphs, in this exact order, each starting with its Odia label followed by a colon:
   - "ଉପକ୍ରମ: " — name the poem/chapter, its epic or literary origin if applicable, and a one-line note on the poet/author's background.
   - "ପ୍ରସଙ୍ଗ: " — 1-2 sentences on what these particular lines are doing in the larger text.
   - "ବ୍ୟାଖ୍ୟା: " — a deep, analytical, textbook-standard explanation of the lines' meaning.

2. ଦୀର୍ଘ ଉତ୍ତରମୂଳକ ପ୍ରଶ୍ନ (Long Answer Question) — use for essay-style questions (theme, character analysis, chapter summary, "explain why..."). Three labelled paragraphs, in this exact order, each starting with its Odia label followed by a colon:
   - "ଭୂମିକା: " — introduce the theme of the chapter/poem and set up the answer.
   - "ମୂଳ ବିଷୟବସ୍ତୁ: " — the detailed answer body, covering every point a full-marks answer needs.
   - "ଉପସଂହାର: " — a brief closing statement giving the moral/lesson/takeaway.

WORD COUNT for the whole answer (all three sections combined):
- Grade 9 and Grade 10: 150-200 words.
- Grade 6, 7, and 8: 100-150 words.
Use standard literary Odia vocabulary suitable for scoring full marks in a Matriculation-style exam — formal register, grammatically accurate, not conversational. This structured format applies ONLY to long_answer; one_liners and short_answer for Odia still follow the general language-subject instructions above (short_answer as a flowing paragraph in Odia, not bulleted).`;

const ODIA_PROMPT = `${LANGUAGE_PROMPT}
${ODIA_LONG_ANSWER_RULES}`;

// Std 9-10 CBSE English Literature answers follow specific board-exam
// conventions: extract-based questions (quoting real lines from the text,
// then asking several questions about that specific extract) are the
// dominant format, and answers are graded on Content/Expression/Accuracy
// within strict word-count bands. Modeled on a real Class X English SQP +
// marking scheme. Appended to LANGUAGE_PROMPT only for English, grade 9-10.
const ENGLISH_SENIOR_RULES = `
STD 9-10 ENGLISH LITERATURE — BOARD-EXAM CONVENTIONS (this refines, not replaces, the general Short-answer/Long-answer instructions above):

1. EXTRACT-BASED QUESTIONS — this is the single most common CBSE Class 9-10 English literature question format. Whenever you were given the actual source text (not just a topic name), write SOME long_answer and short_answer items this way: open the "question" with a genuine extract quoted VERBATIM from the provided source text (3-6 lines for poetry, 3-5 sentences for prose) — copy it exactly, never paraphrase or invent it — followed by a line break ("\\n") and then 1-3 analytical sub-questions about that specific extract (inference, tone, what a phrase suggests, a literary device used, what a character reveals). If you were only given a topic name with no source text, skip this format entirely — never fabricate a quote you don't actually have; use the general essay-style questions instead.
2. WORD COUNT & STRUCTURE — a real board answer is continuous analytical prose (not bullets — this already matches the general instruction above), but keep answers within realistic exam word bands so they read like an actual student's scoring answer: roughly 40-60 words for a question worth 2-3 marks (most short_answer items), and 100-120 words for a full essay-style long_answer question. Within that length, the answer should still move from a brief framing/context sentence, into developed reasoning that references specific details or wording from the text, and where it fits naturally, a closing sentence — but written as flowing prose, not labelled sections.
3. Keep doing plain word-meaning/comprehension one-liners and grammar-flavoured MCQs as already instructed above — this section only refines short_answer/long_answer for literature content.`;

const ENGLISH_PROMPT_SENIOR = `${LANGUAGE_PROMPT}
${ENGLISH_SENIOR_RULES}`;

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

// Std 9-10 CBSE Grammar sections have two very characteristic, recurring
// task types beyond plain MCQs/fill-blanks — modeled on a real Class X
// English SQP + marking scheme. Appended to GRAMMAR_PROMPT only for
// grade 9-10; Std 6-8 grammar stays at the simpler level already instructed.
const GRAMMAR_SENIOR_RULES = `
STD 9-10 GRAMMAR ADDITIONS (modeled on real CBSE board sample papers) — work a few of these into the short-answer items:
1. ERROR + CORRECTION: present a sentence containing one grammatical error, then ask the student to identify and correct it. Format the "answer" as exactly two labelled parts on their own lines: "Error: <the wrong word/phrase>\\nCorrection: <the fix>".
2. REPORTED SPEECH: give a line of direct speech (a statement, question, or command) and ask the student to report it in indirect/reported speech. The "answer" should be the single correctly-transformed sentence.
Include a handful of these (2-4 combined) among the short-answer items — don't replace the existing transform/correct/complete style entirely, just add these two recognizable formats into the mix.`;

const GRAMMAR_PROMPT_SENIOR = `${GRAMMAR_PROMPT}
${GRAMMAR_SENIOR_RULES}`;

const GENERAL_PROMPT = `You are a CBSE curriculum content writer for Indian school students (Std 6-10).
Given a topic or source text, ${JSON_SHAPE}

NOTES FORMAT — build "blocks" like a polished revision-notes document, choosing whichever block types genuinely fit the topic:
- Start with 1-2 "heading" + "paragraph" blocks giving an overview.
- Use "callout" blocks to explain any tricky term or highlight one especially interesting fact — don't overuse, 1-3 per chapter is plenty.
- Use a "timeline" block ({items: [{date, text}, ...]}) for history/social-science topics with a chronological sequence of events/dates. For SST/History chapters specifically, this is IMPORTANT and should almost always be included: pull out every date-worthy event in the chapter (not just 4-6 — include all of them, this could be 8-15+ for a dense chapter) as one-line "date: what happened" entries, in chronological order. This is one of the most useful revision tools for history, so don't skimp on it.
- Use a "table" block ({columns: [string,...], rows: [[string,...],...]}) for comparisons, classifications, or listing key figures/items with their features (e.g. rulers and their achievements, types of resources, parts of a cell).
- Use "list" blocks ({items: [string,...]}) for straightforward bullet points that don't need a table.
- Use "image" blocks for maps (SST — political/physical/historical maps, movement of trade routes, locations), diagrams (Science — cycles, body systems, apparatus, processes), and illustrations (Computer — device/network diagrams). This subject group benefits the most from images — actively look for good places to add them, using 3-10 per chapter as many as the chapter genuinely needs, not just as an afterthought. See IMAGE BLOCKS rules below.
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

QUESTION FIGURES — some SST/Science/Computer questions genuinely need a map, diagram, or labelled figure to be answerable (e.g. "identify the marked regions on the map", "label the parts shown in the diagram"). Whenever a question you write depends on this, attach an "image" field to that question object, following the same IMAGE BLOCKS rules as above. Don't force this — most questions here are answerable from text alone — but where a real exam would show a figure, do the same, and never write a question that assumes an unseen figure without attaching one.

Cover the full breadth of the topic so questions don't repeat the same sub-point — spread them across all the key ideas in the chapter. Also produce a mind map with 2 levels of depth covering the key sub-topics.`;

// Std 9-10 additions to GENERAL_PROMPT, modeled on a real CBSE Class X
// Science board sample paper + marking scheme: (1) numerical/formula-based
// answers need the same board-exam step style as Math, not generic bullets;
// (2) Assertion-Reason is a real, recurring MCQ subtype at this level.
const GENERAL_BOARD_STYLE_RULES = `
STD 9-10 ADDITIONS (modeled on real CBSE board sample papers):

1. NUMERICAL/FORMULA-BASED ANSWERS (mainly Science — Physics topics like electricity, light, motion, work & energy): when a short-answer or long-answer question requires solving with a formula rather than describing/explaining, format its "answer" the same way a board marking scheme credits it — NOT as bullet points of ideas:
   - State the relevant formula on its own line first.
   - Then substitute the given values and simplify, one step per line (use "\\n" between steps), using "⇒" for a derived next step.
   - End with the final numeric answer (with correct unit) isolated on its own last line, e.g. "∴ f = 30 mm".
   - Skip conversational lead-ins ("Let's solve this...") — go straight to the formula and substitution, like a topper's answer script.
   This does NOT apply to descriptive/explanatory Science, SST, or Computer answers — those keep the bulleted-key-points format described above.

2. ASSERTION-REASON MCQs: include 2-4 of the "mcq" items (out of the 25-40) as Assertion-Reason questions, a standard CBSE board format. For these: "question" should present "Assertion (A): ..." and "Reason (R): ..." as two labelled sentences (use "\\n" between them), and "options" must be exactly these four, in this exact wording and order:
   ["Both A and R are true, and R is the correct explanation of A.", "Both A and R are true, and R is not the correct explanation of A.", "A is true but R is false.", "A is false but R is true."]
   "answer" must match one of these four option strings exactly. Use this sparingly (2-4 questions, not more) and only where a genuine cause-and-effect or true/false relationship between two statements exists — don't force it onto content that doesn't fit this pattern.`;

const GENERAL_PROMPT_SENIOR = `${GENERAL_PROMPT}
${GENERAL_BOARD_STYLE_RULES}`;

function getSystemPrompt(subject, contentType, grade) {
  const s = (subject || '').toLowerCase();
  const isLanguage = ['english', 'odia', 'hindi', 'sanskrit'].includes(s);
  const g = parseInt(grade, 10);
  if (isLanguage && contentType === 'grammar') {
    return g >= 9 ? GRAMMAR_PROMPT_SENIOR : GRAMMAR_PROMPT;
  }
  if (s === 'math') return g >= 9 ? MATH_PROMPT_SENIOR : MATH_PROMPT;
  if (s === 'odia') return ODIA_PROMPT;
  if (s === 'english') return g >= 9 ? ENGLISH_PROMPT_SENIOR : LANGUAGE_PROMPT;
  if (isLanguage) return LANGUAGE_PROMPT;
  // SST, Science, Computer
  return g >= 9 ? GENERAL_PROMPT_SENIOR : GENERAL_PROMPT;
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

async function uploadPageImageToStorage(base64Data, mimeType, pageNumber, crop) {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `pdf-page/${Date.now()}-p${pageNumber}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  let buffer = Buffer.from(base64Data, 'base64');

  // Crop out just the figure if the model gave us a bounding box, instead of
  // uploading the whole page (which drags in unrelated body text). Fractions
  // are validated and clamped so a slightly-off box from the model can't
  // crash the crop — worst case it falls back to the full page.
  if (
    crop &&
    typeof crop === 'object' &&
    [crop.x, crop.y, crop.width, crop.height].every((n) => typeof n === 'number' && isFinite(n))
  ) {
    try {
      const sharp = (await import('sharp')).default;
      const img = sharp(buffer);
      const meta = await img.metadata();
      if (meta.width && meta.height) {
        const clamp01 = (n) => Math.min(1, Math.max(0, n));
        const x = clamp01(crop.x);
        const y = clamp01(crop.y);
        const w = clamp01(crop.width);
        const h = clamp01(crop.height);
        const left = Math.round(x * meta.width);
        const top = Math.round(y * meta.height);
        const width = Math.max(1, Math.min(meta.width - left, Math.round(w * meta.width)));
        const height = Math.max(1, Math.min(meta.height - top, Math.round(h * meta.height)));
        if (width > 20 && height > 20) {
          buffer = await sharp(buffer).extract({ left, top, width, height }).toBuffer();
        }
      }
    } catch {
      // Cropping is best-effort — if it fails for any reason, upload the
      // full, uncropped page image rather than losing the figure entirely.
    }
  }

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

// Resolves a single {page?, crop?, search_query?} hint (from either a notes
// "image" block or a practice question's "image" field) into a real,
// permanently-hosted imageUrl. Returns null if it can't be resolved — the
// caller should drop the image rather than show something broken.
async function resolveImageHint(hint, pageImagesByNumber) {
  if (!hint) return null;
  try {
    if (hint.page && pageImagesByNumber.has(Number(hint.page))) {
      const src = pageImagesByNumber.get(Number(hint.page));
      const imageUrl = await uploadPageImageToStorage(src.dataBase64, src.mimeType, hint.page, hint.crop);
      if (imageUrl) {
        return { caption: hint.caption || '', imageUrl };
      }
    }
    if (hint.search_query) {
      const found = await searchWikimediaImage(hint.search_query);
      if (found) {
        return { caption: hint.caption || '', imageUrl: found.imageUrl, attribution: found.attribution };
      }
    }
  } catch {
    // Image resolution is best-effort; never let it fail the whole chapter.
  }
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
    const found = await resolveImageHint(block, pageImagesByNumber);
    if (found) {
      resolved.push({ type: 'image', ...found });
    }
    // else: couldn't resolve this one — drop it rather than showing a broken image.
  }
  notes.blocks = resolved;
}

// Walks mcq/short_answer/long_answer practice questions and turns each
// question's optional "image" hint into a real imageUrl, the same way notes
// image blocks are resolved. Questions that had a hint that couldn't be
// resolved just lose the "image" field (the question text itself still
// stands on its own — the AI was instructed to only add a hint it could
// plausibly resolve, but this is a safety net).
async function resolveQuestionImages(practiceQuestions, pageImagesByNumber) {
  if (!practiceQuestions) return;
  for (const key of ['mcq', 'short_answer', 'long_answer']) {
    const list = practiceQuestions[key];
    if (!Array.isArray(list)) continue;
    for (const q of list) {
      if (!q || !q.image) continue;
      const found = await resolveImageHint(q.image, pageImagesByNumber);
      if (found) {
        q.image = found;
      } else {
        delete q.image;
      }
    }
  }
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

  const systemPrompt = getSystemPrompt(subject, contentType, grade);

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
    await resolveQuestionImages(parsed.practice_questions, pageImagesByNumber);

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to generate content: ' + err.message }, { status: 500 });
  }
}
