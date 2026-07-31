# CBSE Learn — Setup & Deploy Guide (zero experience needed)

Follow these steps in order. Each one takes a few minutes. Don't skip ahead.

---

## STEP 1 — Create a free Supabase project (your database + login system)

1. Go to https://supabase.com → **Start your project** → sign up (free).
2. Click **New project**. Pick any name (e.g. "cbse-learn"), set a database password (save it somewhere), choose the region closest to India, click **Create**. Wait ~2 minutes.
3. In the left sidebar, click the **SQL Editor** icon → **New query**.
4. Open the file `supabase/schema.sql` from this project (in a text editor), copy ALL of it, paste it into the SQL editor, and click **Run**. This creates your tables and adds one sample Std 8 SST chapter.
5. In the left sidebar, click **Project Settings** (gear icon) → **API**. You'll see:
   - **Project URL** → copy this
   - **anon public** key → copy this
   - **service_role** key (click "reveal") → copy this — keep this one SECRET, never share it publicly.

Keep this tab open — you'll paste these into Vercel in Step 4.

---

## STEP 2 — Get a free Gemini API key (powers the AI content generator)

1. Go to https://aistudio.google.com/apikey → sign in with a Google account.
2. Click **Create API key**. Copy it.
3. The free tier includes generous usage; check current limits on the same page if you plan on heavy use.

---

## STEP 3 — Put the code on GitHub

1. Go to https://github.com → sign up (free).
2. Click the **+** icon (top right) → **New repository**. Name it `cbse-app`, keep it **Public** or **Private** (either works), click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag in ALL the files and folders from this project (the whole `cbse-app` folder contents — `app`, `components`, `lib`, `styles`, `supabase`, `package.json`, `next.config.js`, `.gitignore`, `.env.local.example`, `README.md`). GitHub supports drag-and-drop of folders in most browsers.
   - **Do NOT upload a `.env.local` file** if you ever create one locally — it contains secrets. It's already excluded via `.gitignore`.
5. Scroll down, click **Commit changes**.

---

## STEP 4 — Deploy to Vercel (free hosting)

1. Go to https://vercel.com → **Sign up** → choose **Continue with GitHub** (this links the two automatically).
2. Click **Add New... → Project**.
3. Find your `cbse-app` repo in the list → click **Import**.
4. Before clicking Deploy, open **Environment Variables** and add these four, one at a time (name → value):
   - `NEXT_PUBLIC_SUPABASE_URL` → (from Step 1)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → (from Step 1)
   - `SUPABASE_SERVICE_ROLE_KEY` → (from Step 1)
   - `GEMINI_API_KEY` → (from Step 2)
5. Click **Deploy**. Wait 1-2 minutes.
6. You'll get a live URL like `https://cbse-app-yourname.vercel.app` — this is your real, working website.

---

## STEP 5 — Make yourself an admin

1. Visit your live site → click **Sign up** → create an account normally (name, grade, a Unique ID, a password).
2. Go back to Supabase → **Table Editor** → `profiles` table.
3. Find the row with your Unique ID → click into the `role` cell → change `student` to `admin` → press Enter to save.
4. Now go to your site's `/admin/login` page and log in with the same Unique ID and password. You're in the admin dashboard.

---

## How to add content going forward

- **Admin dashboard** (`/admin/login`): pick Grade + Subject + Chapter name, then either:
  - Type a topic and click **Generate from topic** (AI writes notes, practice questions, and a mind map), or
  - Paste existing textbook text and click **Generate from pasted text** to summarize it, or
  - Just type/paste notes and questions manually — no AI required.
- Review/edit anything generated, then click **Save chapter**. It appears instantly for students in that grade/subject.
- For 3D models: upload a `.glb` 3D file anywhere you can get a direct link (e.g. a public Google Drive/GitHub link ending in `.glb`), paste that link into the "3D model URL" field.

## Video Notes (YouTube) + Mock Tests with Excel scoring

**Video Notes:** each chapter now has a "Video" tab. In the admin form, scroll to "Video Notes (YouTube)" — paste any YouTube link (watch/youtu.be/shorts all work) with an optional title, click "+ Add video". Multiple videos per chapter are supported. Students see them embedded directly in a new Video tab.

**Mock Tests:** a separate system from chapters, for whole-test MCQ sets you upload "when needed":
- In the admin dashboard, click the **"Mock Tests"** tab at the top (next to "Chapter Content")
- Build a test: pick Grade/Subject, give it a title, then add MCQs one at a time (question + options + correct answer + explanation) — or paste a bulk JSON array under "Show advanced JSON editor" if you have many questions ready to go
- Click **Create test** — it instantly becomes available to students in that grade

**Students** see a "Mock Tests" button in their dashboard navbar → pick a test → answer all questions → Submit → see their score immediately with right/wrong marked.

**Scoring, saved and exportable:** every submission is saved to the database (name, Unique ID, score, date). Back in the admin dashboard, click **"View Results"** on any test to see a table of every student's score, then click **"Export to Excel"** to download a `.xlsx` file of the full results — ready to share or archive. (This export is for the admin's own tracking use, separate from the no-download policy on chapter content.)

To enable both features, run `supabase/migration_5_video_and_mocktests.sql` in the SQL Editor.

## Upload a chapter PDF to generate content with AI

In the admin dashboard's "Generate with AI" box, Option B now includes a PDF upload — pick the chapter PDF and its text is automatically extracted into the paste-text box below, ready to review before clicking "Generate from pasted text". This works for regular text-based PDFs; scanned/photographed PDFs (image-only, no selectable text) can't be read this way — paste the text manually instead in that case. Very long PDFs are trimmed to keep the AI request a reasonable size.

This uses a library called `pdfjs-dist` — after pulling the latest code, Vercel will install it automatically on your next deploy (no extra setup needed).

## Styled notes template (like a real revision-notes PDF)

AI-generated notes now come out as a polished, structured layout instead of a plain text block — a colored header with badges, section headings, timeline (for history topics), styled tables, callout boxes for tricky terms, a glossary grid, and a "Quick Recap" box at the end. It renders directly in the app (not as a downloadable file), styled in the app's blue/teal palette.

Manually-typed notes still work exactly as before (plain text) — the app shows whichever format a chapter has. In the admin dashboard, once AI generates notes you'll see a live preview plus an "Edit generated notes (advanced JSON)" box if you want to tweak specific blocks; click "Clear & write manually instead" to go back to a plain textbox.

To enable this, run `supabase/migration_4_notes_jsonb.sql` in the SQL Editor (in addition to the earlier migrations) — it safely converts the notes column and preserves any notes you've already saved.

## Manual question entry + updated AI targets

Both AI and manual entry now target these counts per chapter:
- MCQ: 15-20
- Very Short Answer (one-liners): 20-30
- Short Answer: 10-12
- Long Answer: 5-6

**Manual entry:** in the admin dashboard, each of the three non-MCQ types now has its own form — a Question box and a (bigger) Answer box, with an "Add question" button. Added questions appear as a list below with a ✕ to remove. Students see these as "Show answer" cards. MCQs still use the JSON format (via "Show advanced JSON editor") since they need multiple options + explanations.

**PDF uploads:** in addition to the Notes PDF, you can now upload a separate PDF for Short Answer questions and one for Long Answer questions — these display embedded (toolbar hidden) above the manually-entered questions in that section, using the same short-lived signed link approach as other files.

**Student-friendly notes:** the AI prompt now explicitly asks for short sentences, plain language with terms defined on first use, a friendly explaining tone, one real-life example per major concept, and a "Quick Recap" at the end.

To enable the two new PDF fields, run `supabase/migration_3_qa_pdfs.sql` in the SQL Editor (in addition to the earlier migrations).

## Practice question types (MCQ, One-Liners, Short & Long Answer)

The AI generator now produces 30-50 questions per chapter split into four sections: MCQs, quick one-liners, short-answer, and long-answer — each with a model answer. Students see these as tabs within the Practice Set view, with a "Show answer" button for the non-MCQ types.

If you're editing the JSON by hand instead of using AI, use this shape:
```json
{
  "mcq": [{ "question": "...", "options": ["A","B","C","D"], "answer": "B", "explanation": "..." }],
  "one_liners": [{ "question": "...", "answer": "..." }],
  "short_answer": [{ "question": "...", "answer": "..." }],
  "long_answer": [{ "question": "...", "answer": "..." }]
}
```
Older chapters saved before this update (plain array of MCQs) still display correctly — no need to redo them.

## Adding file uploads (PDF notes, 3D model files)

This was added after initial deploy. To enable it:

1. In Supabase → **SQL Editor → New query**, paste in the contents of `supabase/migration_2_file_uploads.sql` and click **Run**. (Don't re-run the original `schema.sql` — it would duplicate the sample chapter.)
2. Redeploy your latest code (push the updated files to GitHub the same way as before — Vercel redeploys automatically).
3. In the admin dashboard you'll now see file pickers for **Notes PDF** and **3D Model (.glb)**, in addition to the existing text/link fields.

**Important honesty note on "not downloadable":** nothing shown in a browser can be made 100% impossible to save — a student can always screenshot or screen-record. What this build *does* do:
- Files sit in a **private** storage bucket, never a public URL
- Students only ever get a link that **expires in 5 minutes**, generated fresh each time they open a chapter
- The PDF viewer's toolbar (which normally has a download button) is hidden

This meaningfully raises the effort needed to save/share a file, but isn't a hard guarantee.

## Notes on what's built vs. what's a starting point

- Fully working: signup/login/logout, forgot ID & password recovery, admin vs student roles, subject/chapter browsing, notes, interactive practice sets with instant feedback, mind maps, and a 3D model viewer.
- Only **Std 8 SST** has a sample chapter pre-loaded — everything else is an empty shelf waiting for content, which the AI tool can fill in quickly per chapter.
- The mind map is a simple, clean nested-box style (no extra library needed) — it can be upgraded to a fancier animated version later if you want.
