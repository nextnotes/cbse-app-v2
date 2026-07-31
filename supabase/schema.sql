-- ============================================
-- CBSE Learning App — Database Schema
-- Run this in Supabase: Dashboard > SQL Editor > New Query > Run
-- ============================================

-- Profiles table: stores name + unique_id for every account (student or admin)
-- We map unique_id -> a hidden pseudo-email for Supabase Auth internally.
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  unique_id text not null unique,
  role text not null default 'student' check (role in ('student', 'admin')),
  grade int, -- 6,7,8,9,10 (null for admin)
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Allow insert during signup
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- Content table: notes, practice sets, mind maps, 3D module links
-- ============================================
create table if not exists public.content (
  id uuid default gen_random_uuid() primary key,
  grade int not null,
  subject text not null,
  chapter text not null,
  notes text,                -- rich text / markdown notes
  practice_questions jsonb,  -- [{question, options, answer, explanation}]
  mindmap jsonb,             -- {title, children: [...]}
  model_3d_url text,         -- link to a .glb/.gltf 3D model (optional)
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.content enable row level security;

-- Everyone (logged in) can read content
create policy "Anyone logged in can view content"
  on public.content for select
  using (auth.role() = 'authenticated');

-- Only admins can insert/update/delete content
create policy "Admins can insert content"
  on public.content for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update content"
  on public.content for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can delete content"
  on public.content for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================
-- Seed: one admin-created sample chapter for Std 8 SST so the app has data on first run
-- (You can delete this later from the admin dashboard)
-- ============================================
insert into public.content (grade, subject, chapter, notes, practice_questions, mindmap)
values (
  8,
  'SST',
  'Resources and Development',
  '# Resources and Development

A resource is everything available in our environment that can be used to satisfy our needs, provided it is technologically accessible, economically feasible, and culturally acceptable.

**Types of Resources:**
- On the basis of origin: Biotic and Abiotic
- On the basis of exhaustibility: Renewable and Non-renewable
- On the basis of ownership: Individual, Community, National, International
- On the basis of status of development: Potential, Developed, Stock, Reserve

Land is a resource of vital importance. It supports natural vegetation, wildlife, human life, economic activities, and transport and communication systems.',
  '[
    {"question":"Which of the following is a renewable resource?","options":["Coal","Solar energy","Petroleum","Natural gas"],"answer":"Solar energy","explanation":"Solar energy is inexhaustible and replenishes naturally."},
    {"question":"Land which is not available for cultivation is called?","options":["Fallow land","Wasteland","Net sown area","Gross cropped area"],"answer":"Wasteland","explanation":"Wasteland refers to land that cannot be used for agriculture due to its nature or location."}
  ]'::jsonb,
  '{
    "title": "Resources and Development",
    "children": [
      {"title":"Types of Resources","children":[
        {"title":"By Origin","children":[{"title":"Biotic"},{"title":"Abiotic"}]},
        {"title":"By Exhaustibility","children":[{"title":"Renewable"},{"title":"Non-renewable"}]},
        {"title":"By Ownership","children":[{"title":"Individual"},{"title":"Community"},{"title":"National"},{"title":"International"}]}
      ]},
      {"title":"Land Resources","children":[{"title":"Land Use"},{"title":"Land Degradation"},{"title":"Conservation"}]}
    ]
  }'::jsonb
)
on conflict do nothing;
