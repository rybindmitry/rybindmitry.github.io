create table if not exists public.problem_submissions (
  id uuid primary key default gen_random_uuid(),
  problem_statement text not null check (char_length(problem_statement) between 20 and 20000),
  author_name text not null check (char_length(author_name) between 1 and 200),
  submitter_contact text check (submitter_contact is null or char_length(submitter_contact) <= 300),
  submitter_website text check (submitter_website is null or char_length(submitter_website) <= 500),
  verification_notes text check (verification_notes is null or char_length(verification_notes) <= 10000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'rejected', 'spam')),
  created_at timestamptz not null default now()
);

create table if not exists public.solution_submissions (
  id uuid primary key default gen_random_uuid(),
  problem_id integer not null check (problem_id > 0),
  submitter_name text check (submitter_name is null or char_length(submitter_name) <= 200),
  submitter_contact text check (submitter_contact is null or char_length(submitter_contact) <= 300),
  submitter_website text check (submitter_website is null or char_length(submitter_website) <= 500),
  solution_text text not null check (char_length(solution_text) between 20 and 30000),
  solution_url text check (solution_url is null or char_length(solution_url) <= 1000),
  notes text check (notes is null or char_length(notes) <= 10000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'rejected', 'spam')),
  created_at timestamptz not null default now()
);

alter table public.problem_submissions enable row level security;
alter table public.solution_submissions enable row level security;

grant usage on schema public to anon, authenticated;
grant insert on public.problem_submissions to anon, authenticated;
grant insert on public.solution_submissions to anon, authenticated;

drop policy if exists "Anyone can submit problem requests" on public.problem_submissions;
create policy "Anyone can submit problem requests"
on public.problem_submissions
for insert
to anon, authenticated
with check (status = 'new');

drop policy if exists "Anyone can submit solution requests" on public.solution_submissions;
create policy "Anyone can submit solution requests"
on public.solution_submissions
for insert
to anon, authenticated
with check (status = 'new');

create index if not exists problem_submissions_created_at_idx
on public.problem_submissions(created_at desc);

create index if not exists problem_submissions_status_created_at_idx
on public.problem_submissions(status, created_at desc);

create index if not exists solution_submissions_problem_id_created_at_idx
on public.solution_submissions(problem_id, created_at desc);

create index if not exists solution_submissions_status_created_at_idx
on public.solution_submissions(status, created_at desc);
