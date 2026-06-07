create table if not exists public.problem_comments (
  id uuid primary key default gen_random_uuid(),
  problem_id integer not null check (problem_id > 0),
  parent_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 4000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (problem_id, id),
  foreign key (problem_id, parent_id)
    references public.problem_comments(problem_id, id)
    on delete cascade
);

alter table public.problem_comments enable row level security;

drop policy if exists "Anyone can read visible comments" on public.problem_comments;
create policy "Anyone can read visible comments"
on public.problem_comments
for select
using (is_deleted = false);

drop policy if exists "Authenticated users can create own comments" on public.problem_comments;
create policy "Authenticated users can create own comments"
on public.problem_comments
for insert
to authenticated
with check ((select auth.uid()) = user_id and is_deleted = false);

drop policy if exists "Users can update own comments" on public.problem_comments;
create policy "Users can update own comments"
on public.problem_comments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists problem_comments_problem_id_created_at_idx
on public.problem_comments(problem_id, created_at);

create index if not exists problem_comments_parent_id_idx
on public.problem_comments(parent_id);

create or replace function public.set_problem_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists problem_comments_set_updated_at on public.problem_comments;
create trigger problem_comments_set_updated_at
before update on public.problem_comments
for each row
execute function public.set_problem_comment_updated_at();
