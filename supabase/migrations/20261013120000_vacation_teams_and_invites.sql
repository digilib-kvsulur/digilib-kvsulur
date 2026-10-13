-- ====================================================================
-- Vacation Teams, Peer Search & Invitation Acceptance Migration
-- Supports 14 October Registration & Team Formation
-- Tenant DBs: no school_id, one active campaign per tenant
-- ====================================================================

create table if not exists public.vacation_teams (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.vacation_campaigns(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  event_title text not null,
  activity_id text,
  leader_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vacation_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.vacation_teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('leader', 'member')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists idx_vacation_teams_leader on public.vacation_teams(leader_id);
create index if not exists idx_vacation_team_members_user on public.vacation_team_members(user_id);
create index if not exists idx_vacation_team_members_team on public.vacation_team_members(team_id);

alter table public.vacation_teams enable row level security;
alter table public.vacation_team_members enable row level security;

-- Policies: Authenticated users can read teams and members
create policy "Vacation teams are readable by authenticated users"
  on public.vacation_teams for select to authenticated using (true);

create policy "Leaders can insert vacation teams"
  on public.vacation_teams for insert to authenticated
  with check (leader_id = auth.uid());

create policy "Leaders can delete their own vacation teams"
  on public.vacation_teams for delete to authenticated
  using (leader_id = auth.uid());

create policy "Vacation team members are readable by authenticated users"
  on public.vacation_team_members for select to authenticated using (true);

create policy "Leaders can insert vacation team members"
  on public.vacation_team_members for insert to authenticated
  with check (
    exists (
      select 1 from public.vacation_teams t
      where t.id = team_id and t.leader_id = auth.uid()
    )
  );

create policy "Users can update their own invitation status"
  on public.vacation_team_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Search peers by Admission Number OR Name across all student grades
create or replace function public.vacation_search_peers(p_query text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  student_class text,
  admission_number text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.student_class,
    p.admission_number,
    p.avatar_url
  from public.profiles p
  where p.role = 'student'
    and p.is_approved = true
    and (
      p.admission_number ilike '%' || btrim(p_query) || '%'
      or p.first_name ilike '%' || btrim(p_query) || '%'
      or p.last_name ilike '%' || btrim(p_query) || '%'
      or p.username ilike '%' || btrim(p_query) || '%'
    )
  order by p.first_name asc
  limit 15;
$$;

grant execute on function public.vacation_search_peers(text) to authenticated;
