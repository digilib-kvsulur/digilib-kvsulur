-- Vacation Campaign: tables, RLS, grants, transactional RPCs.
-- Tenant DBs have no profiles.school_id. One active campaign per tenant.
-- Display name is first_name + last_name. Notifications use public.notify_user.

begin;

create or replace function public.vacation_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.vacation_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'teacher')
  );
$$;

create or replace function public.vacation_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.vacation_profile_display_name(p_first text, p_last text)
returns text
language sql
immutable
as $$
  select nullif(btrim(concat_ws(' ', nullif(btrim(p_first), ''), nullif(btrim(p_last), ''))), '');
$$;

create table public.vacation_campaigns (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 1 and 120),
  status           text not null default 'draft'
                   check (status in ('draft', 'active', 'paused', 'ended')),
  start_date       date not null,
  end_date         date not null,
  timezone         text not null default 'Asia/Kolkata',
  default_points   int  not null default 10 check (default_points >= 0),
  max_award_points int  not null default 100 check (max_award_points >= 0),
  banner_enabled   boolean not null default false,
  banner_text      text check (banner_text is null or char_length(banner_text) <= 300),
  banner_link      text check (banner_link is null or banner_link ~* '^(https?://|/)'),
  created_at       timestamptz not null default now(),
  check (end_date >= start_date)
);

create unique index vacation_one_active_campaign
  on public.vacation_campaigns ((true)) where status = 'active';

create table public.vacation_streak_milestones (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.vacation_campaigns(id) on delete cascade,
  days         int  not null check (days > 0),
  bonus_points int not null check (bonus_points > 0),
  unique (campaign_id, days)
);

create table public.vacation_activities (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references public.vacation_campaigns(id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 160),
  instructions  text,
  reward_points int check (reward_points is null or reward_points >= 0),
  activity_date date,
  opens_at      timestamptz,
  closes_at     timestamptz,
  is_active     boolean not null default false,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  check (opens_at is null or closes_at is null or closes_at > opens_at)
);

create unique index vacation_one_activity_per_day
  on public.vacation_activities (campaign_id, activity_date) where activity_date is not null;

create table public.vacation_submissions (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.vacation_campaigns(id) on delete restrict,
  activity_id    uuid not null references public.vacation_activities(id) on delete restrict,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  content        text check (content is null or char_length(content) <= 5000),
  link           text check (link is null or (char_length(link) <= 2000 and link ~* '^https?://')),
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  attempts       int  not null default 1,
  submitted_at   timestamptz not null default now(),
  reviewed_by    uuid,
  reviewed_at    timestamptz,
  review_note    text check (review_note is null or char_length(review_note) <= 1000),
  points_awarded int check (points_awarded is null or points_awarded >= 0),
  check (status <> 'approved' or points_awarded is not null),
  unique (activity_id, student_id)
);

create index vacation_sub_queue_idx on public.vacation_submissions (campaign_id, status, submitted_at);
create index vacation_sub_student_idx on public.vacation_submissions (student_id, campaign_id);

create table public.vacation_point_events (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references public.vacation_campaigns(id) on delete restrict,
  student_id     uuid not null references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('activity', 'streak_bonus')),
  points         int  not null check (points >= 0),
  submission_id  uuid references public.vacation_submissions (id) on delete restrict,
  milestone_days int,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  check ((kind = 'activity' and submission_id is not null and milestone_days is null)
      or (kind = 'streak_bonus' and submission_id is null and milestone_days is not null))
);

create unique index vacation_one_award_per_submission
  on public.vacation_point_events (submission_id) where kind = 'activity';
create unique index vacation_one_bonus_per_milestone
  on public.vacation_point_events (campaign_id, student_id, milestone_days) where kind = 'streak_bonus';

create table public.vacation_student_progress (
  campaign_id        uuid not null references public.vacation_campaigns(id) on delete restrict,
  student_id         uuid not null references public.profiles(id) on delete cascade,
  total_points       int  not null default 0,
  approved_count     int  not null default 0,
  current_streak     int  not null default 0,
  longest_streak     int  not null default 0,
  last_approved_date date,
  updated_at         timestamptz not null default now(),
  primary key (campaign_id, student_id)
);

create index vacation_progress_rank_idx
  on public.vacation_student_progress (campaign_id, total_points desc);

create or replace function public.vacation_activity_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare c public.vacation_campaigns%rowtype;
begin
  select * into c from public.vacation_campaigns where id = new.campaign_id;
  if new.activity_date is not null
     and (new.activity_date < c.start_date or new.activity_date > c.end_date) then
    raise exception 'date_outside_campaign' using errcode = 'P0001';
  end if;
  if new.is_active and new.activity_date is null then
    raise exception 'date_required_to_activate' using errcode = 'P0001';
  end if;
  if new.is_active and coalesce(btrim(new.instructions), '') = '' then
    raise exception 'instructions_required_to_activate' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE'
     and new.activity_date is distinct from old.activity_date
     and exists (select 1 from public.vacation_submissions where activity_id = old.id) then
    raise exception 'cannot_move_activity_with_submissions' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger vacation_activity_guard_trg
  before insert or update on public.vacation_activities
  for each row execute function public.vacation_activity_guard();

create or replace function public.vacation_notify(p_user uuid, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(p_user, p_title, p_body, 'info');
end;
$$;

create or replace function public.vacation_refresh_progress(
  p_campaign uuid, p_student uuid, p_anchor date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_longest int; v_latest int; v_last date; v_anchor int;
begin
  with d as (
    select distinct a.activity_date as dt
    from public.vacation_submissions s
    join public.vacation_activities a on a.id = s.activity_id
    where s.campaign_id = p_campaign and s.student_id = p_student
      and s.status = 'approved' and a.activity_date is not null),
  g as (select dt, dt - (row_number() over (order by dt))::int as grp from d),
  runs as (select min(dt) as s, max(dt) as e, count(*)::int as len from g group by grp)
  select coalesce(max(len), 0),
         coalesce((select len from runs order by e desc limit 1), 0),
         (select max(e) from runs),
         coalesce((select len from runs where p_anchor between s and e), 0)
    into v_longest, v_latest, v_last, v_anchor
  from runs;

  insert into public.vacation_student_progress as sp
    (campaign_id, student_id, total_points, approved_count,
     current_streak, longest_streak, last_approved_date, updated_at)
  values (p_campaign, p_student,
    (select coalesce(sum(points), 0) from public.vacation_point_events
       where campaign_id = p_campaign and student_id = p_student),
    (select count(*) from public.vacation_submissions
       where campaign_id = p_campaign and student_id = p_student and status = 'approved'),
    v_latest, v_longest, v_last, now())
  on conflict (campaign_id, student_id) do update set
    total_points = excluded.total_points, approved_count = excluded.approved_count,
    current_streak = excluded.current_streak, longest_streak = excluded.longest_streak,
    last_approved_date = excluded.last_approved_date, updated_at = now();

  return v_anchor;
end;
$$;

create or replace function public.vacation_submit_activity(
  p_activity uuid, p_content text default null, p_link text default null)
returns public.vacation_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  v_act public.vacation_activities%rowtype;
  v_camp public.vacation_campaigns%rowtype;
  v_sub public.vacation_submissions%rowtype;
  v_open timestamptz;
  v_close timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'student' then
    raise exception 'students_only' using errcode = '42501';
  end if;

  select * into v_act from public.vacation_activities where id = p_activity;
  if not found or not v_act.is_active then
    raise exception 'activity_not_available' using errcode = 'P0002';
  end if;
  select * into v_camp from public.vacation_campaigns where id = v_act.campaign_id;
  if v_camp.status <> 'active' then
    raise exception 'campaign_not_active' using errcode = 'P0001';
  end if;

  v_open  := coalesce(v_act.opens_at,
              v_act.activity_date::timestamp at time zone v_camp.timezone);
  v_close := coalesce(v_act.closes_at,
              (v_act.activity_date + 1)::timestamp at time zone v_camp.timezone);
  if now() < v_open or now() >= v_close then
    raise exception 'outside_submission_window' using errcode = 'P0001';
  end if;

  p_content := nullif(btrim(p_content), '');
  p_link    := nullif(btrim(p_link), '');
  if p_content is null and p_link is null then
    raise exception 'empty_submission' using errcode = '22023';
  end if;
  if p_link is not null and p_link !~* '^https?://' then
    raise exception 'invalid_link' using errcode = '22023';
  end if;

  select * into v_sub from public.vacation_submissions
   where activity_id = p_activity and student_id = v_uid for update;

  if not found then
    insert into public.vacation_submissions
      (campaign_id, activity_id, student_id, content, link)
    values (v_camp.id, p_activity, v_uid, p_content, p_link)
    returning * into v_sub;
  elsif v_sub.status = 'rejected' then
    update public.vacation_submissions
       set content = p_content, link = p_link, status = 'pending',
           attempts = attempts + 1, submitted_at = now(),
           reviewed_by = null, reviewed_at = null, review_note = null,
           points_awarded = null
     where id = v_sub.id
    returning * into v_sub;
  else
    raise exception 'already_submitted' using errcode = '23505';
  end if;
  return v_sub;
end;
$$;

create or replace function public.vacation_review_submission(
  p_submission uuid, p_decision text, p_points int default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.vacation_submissions%rowtype;
  v_act public.vacation_activities%rowtype;
  v_camp public.vacation_campaigns%rowtype;
  v_pts int; v_run int; v_bonus int := 0; v_ins uuid; m record;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select * into v_sub from public.vacation_submissions where id = p_submission for update;
  if not found then raise exception 'submission_not_found' using errcode = 'P0002'; end if;
  if not public.vacation_is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_sub.status <> 'pending' then
    raise exception 'already_reviewed' using errcode = 'P0001';
  end if;

  select * into v_act  from public.vacation_activities where id = v_sub.activity_id;
  select * into v_camp from public.vacation_campaigns  where id = v_sub.campaign_id;

  if p_decision = 'reject' then
    if coalesce(btrim(p_note), '') = '' then
      raise exception 'rejection_reason_required' using errcode = '22023';
    end if;
    update public.vacation_submissions
       set status = 'rejected', reviewed_by = v_uid, reviewed_at = now(),
           review_note = btrim(p_note), points_awarded = null
     where id = v_sub.id;
    perform public.vacation_notify(v_sub.student_id,
      'Vacation activity needs changes',
      format('"%s" was not approved: %s', v_act.title, btrim(p_note)));
    return jsonb_build_object('status', 'rejected');

  elsif p_decision = 'approve' then
    v_pts := coalesce(p_points, v_act.reward_points, v_camp.default_points);
    if v_pts < 0 or v_pts > v_camp.max_award_points then
      raise exception 'invalid_points' using errcode = '22023';
    end if;

    insert into public.vacation_point_events
      (campaign_id, student_id, kind, points, submission_id, created_by)
    values (v_sub.campaign_id, v_sub.student_id, 'activity', v_pts, v_sub.id, v_uid)
    on conflict (submission_id) where kind = 'activity' do nothing
    returning id into v_ins;
    if v_ins is null then raise exception 'already_awarded' using errcode = 'P0001'; end if;

    update public.vacation_submissions
       set status = 'approved', points_awarded = v_pts, reviewed_by = v_uid,
           reviewed_at = now(), review_note = nullif(btrim(p_note), '')
     where id = v_sub.id;
    update public.profiles set points = coalesce(points, 0) + v_pts
     where id = v_sub.student_id;

    v_run := public.vacation_refresh_progress(
      v_sub.campaign_id, v_sub.student_id, v_act.activity_date);

    for m in select * from public.vacation_streak_milestones
              where campaign_id = v_sub.campaign_id and days <= v_run order by days loop
      v_ins := null;
      insert into public.vacation_point_events
        (campaign_id, student_id, kind, points, milestone_days, created_by)
      values (v_sub.campaign_id, v_sub.student_id,
              'streak_bonus', m.bonus_points, m.days, v_uid)
      on conflict (campaign_id, student_id, milestone_days) where kind = 'streak_bonus' do nothing
      returning id into v_ins;
      if v_ins is not null then v_bonus := v_bonus + m.bonus_points; end if;
    end loop;

    if v_bonus > 0 then
      update public.profiles set points = coalesce(points, 0) + v_bonus
       where id = v_sub.student_id;
      perform public.vacation_refresh_progress(
        v_sub.campaign_id, v_sub.student_id, v_act.activity_date);
    end if;

    perform public.vacation_notify(v_sub.student_id,
      'Vacation activity approved',
      format('"%s" earned %s points%s.', v_act.title, v_pts,
             case when v_bonus > 0 then format(' + %s streak bonus', v_bonus) else '' end));
    return jsonb_build_object('status', 'approved', 'points', v_pts, 'streak_bonus', v_bonus);
  else
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.vacation_seed_poster_drafts(p_campaign uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare c public.vacation_campaigns%rowtype;
begin
  select * into c from public.vacation_campaigns where id = p_campaign;
  if not found or not public.vacation_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.vacation_activities where campaign_id = p_campaign) then
    return 0;
  end if;

  insert into public.vacation_activities
    (campaign_id, title, instructions, sort_order, is_active)
  select p_campaign, t.title, t.descr, t.ord, false
  from (values
    (1,  'STEAM Challenge',
         E'Tagline: Build • Solve • Innovate\n\nChallenge:\nTeams get a real-world problem (e.g. build a bridge, design a water filter, or create a simple machine) using limited materials. They must present their solution and explain the science behind it.\n\nWhat students learn:\n• Creative thinking\n• Problem solving\n• Science & technology concepts\n• Teamwork & communication\n\nSubmission: Write a summary of your model/solution and attach photos or a video drive link.'),
    (2,  'Digital Quest',
         E'Tagline: Scan • Solve • Move Forward\n\nChallenge:\nTeams solve clues, answer questions and complete tasks using QR codes, Google Forms and online resources. The clues are based on different subjects like science, history, general knowledge and current affairs.\n\nWhat students learn:\n• Research & information skills\n• Digital literacy\n• General knowledge\n• Team coordination\n\nSubmission: Submit your completion code, clue answers, or proof screenshot link.'),
    (3,  'Eco-Innovation Challenge',
         E'Tagline: Reduce • Reuse • Reimagine\n\nChallenge:\nStudents create useful products from waste materials or design solutions for environmental problems (e.g., water saving, clean energy, plastic reduction). They present their idea and its impact.\n\nWhat students learn:\n• Environmental awareness\n• Innovation & creativity\n• Hands-on skills\n• Presentation skills\n\nSubmission: Describe your eco-innovation, materials used, and share a photo or link to your prototype.'),
    (4,  'Cyber Safety & Digital Literacy Quiz',
         E'Tagline: Think • Click • Stay Safe\n\nChallenge:\nA fun quiz with real-life scenarios about online safety, digital footprints, cyber bullying, fake news and responsible internet use. Includes short videos, MCQs and group challenges.\n\nWhat students learn:\n• Online safety rules\n• Critical thinking\n• Media literacy\n• Responsible digital behaviour\n\nSubmission: Submit your quiz score, reflections on digital footprint, and your key takeaways.'),
    (5,  'Functional English & Communication Show',
         E'Tagline: Speak • Express • Inspire\n\nChallenge:\nStudents take part in fun activities like role plays, debates, storytelling, news reading, or "shark tank" style presentations (product pitch). Focus on real-life communication and confidence.\n\nWhat students learn:\n• Communication skills\n• Creativity & imagination\n• Confidence\n• Public speaking\n\nSubmission: Provide your speech/script write-up, role-play topic, or link to your recorded presentation.'),
    (6,  'History Detective',
         E'Tagline: Discover • Decide • Defend\n\nChallenge:\nTeams solve clues, match timelines, identify historical figures, and complete challenges about India and the world. Includes map puzzles, "guess the leader", and "what happened next?" rounds.\n\nWhat students learn:\n• History & geography\n• Critical thinking\n• Decision making\n• Teamwork\n\nSubmission: Write down your investigative conclusions, identified historical figures, and timeline matches.'),
    (7,  'Math Marathon',
         E'Tagline: Think • Calculate • Win\n\nChallenge:\nFun rounds with logic puzzles, mental maths, budgeting games, pattern challenges and real-life problem solving (e.g., planning a trip within a budget).\n\nWhat students learn:\n• Logical reasoning\n• Quick calculation\n• Financial awareness\n• Confidence with numbers\n\nSubmission: Provide your calculations, budget breakdown, and puzzle solutions.'),
    (8,  'Creative Arts & Innovation Expo',
         E'Tagline: Imagine • Create • Make a Difference\n\nChallenge:\nStudents create digital art, short films, posters, or DIY projects using simple materials. The theme could be "Future of Education", "My Dream India" or "A Better Planet".\n\nWhat students learn:\n• Creativity & design thinking\n• Digital skills\n• Self-expression\n• Awareness of real-world issues\n\nSubmission: Explain your artwork concept and provide an image upload link or digital file link.'),
    (9,  'Mystery Code Breakers',
         E'Tagline: Crack • Decode • Unlock\n\nChallenge:\nStudents crack riddles, decode secret messages, solve pattern puzzles, and follow clues to unlock a final mystery as a team.\n\nWhat students learn:\n• Logical thinking\n• Pattern recognition\n• Problem-solving\n• Teamwork\n\nSubmission: Submit the decoded secret message along with the logic/ciphers used to solve it.'),
    (10, 'Future Makers Pitch',
         E'Tagline: Small Ideas • Big Impact\n\nChallenge:\nStudents invent a simple solution to a real-life problem, build a mini model or draw a prototype, then pitch their idea in 60 seconds to a friendly judging panel.\n\nWhat students learn:\n• Innovation\n• Design thinking\n• Confidence\n• Persuasive speaking\n\nSubmission: Share your 60-second pitch script, prototype photo/video link, and problem-solution summary.')
  ) as t(ord, title, descr);
  return 10;
end;
$$;

create or replace function public.vacation_student_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_camp public.vacation_campaigns%rowtype;
  v_prog public.vacation_student_progress%rowtype;
  v_today date; v_streak int; v_act public.vacation_activities%rowtype;
  v_open timestamptz; v_close timestamptz;
begin
  select * into v_camp from public.vacation_campaigns
   where status in ('active', 'paused', 'ended')
   order by case status when 'active' then 0 when 'paused' then 1 else 2 end, created_at desc
   limit 1;
  if not found then return jsonb_build_object('campaign', null); end if;

  v_today := (now() at time zone v_camp.timezone)::date;
  select * into v_prog from public.vacation_student_progress
   where campaign_id = v_camp.id and student_id = auth.uid();
  v_streak := case when v_prog.last_approved_date >= v_today - 1
                   then v_prog.current_streak else 0 end;

  select * into v_act from public.vacation_activities
   where campaign_id = v_camp.id and activity_date = v_today and is_active;

  if v_act.id is not null then
    v_open  := coalesce(v_act.opens_at, v_act.activity_date::timestamp at time zone v_camp.timezone);
    v_close := coalesce(v_act.closes_at, (v_act.activity_date + 1)::timestamp at time zone v_camp.timezone);
  end if;

  return jsonb_build_object(
    'campaign', jsonb_build_object('id', v_camp.id, 'title', v_camp.title,
      'status', v_camp.status,
      'start_date', v_camp.start_date, 'end_date', v_camp.end_date,
      'banner_enabled', v_camp.banner_enabled, 'banner_text', v_camp.banner_text,
      'banner_link', v_camp.banner_link),
    'today', v_today,
    'activity', case when v_act.id is null then null else jsonb_build_object(
      'id', v_act.id, 'title', v_act.title, 'instructions', v_act.instructions,
      'reward_points', coalesce(v_act.reward_points, v_camp.default_points),
      'opens_at', v_open, 'closes_at', v_close,
      'window_open', (now() >= v_open and now() < v_close)) end,
    'submission', (select to_jsonb(s) from public.vacation_submissions s
                   where s.activity_id = v_act.id and s.student_id = auth.uid()),
    'progress', jsonb_build_object(
      'total_points', coalesce(v_prog.total_points, 0),
      'approved_count', coalesce(v_prog.approved_count, 0),
      'current_streak', coalesce(v_streak, 0),
      'longest_streak', coalesce(v_prog.longest_streak, 0)),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('activity_id', s.activity_id, 'title', a.title,
               'date', a.activity_date, 'status', s.status,
               'points_awarded', s.points_awarded, 'review_note', s.review_note)
             order by a.activity_date desc)
      from public.vacation_submissions s
      join public.vacation_activities a on a.id = s.activity_id
      where s.campaign_id = v_camp.id and s.student_id = auth.uid()), '[]'::jsonb)
  );
end;
$$;

create or replace function public.vacation_leaderboard(p_campaign uuid, p_limit int default 25)
returns table (rank bigint, student_id uuid, display_name text,
               total_points int, approved_count int, longest_streak int, is_me boolean)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select rank() over (order by sp.total_points desc, sp.approved_count desc) as rnk,
           sp.student_id as sid,
           coalesce(public.vacation_profile_display_name(p.first_name, p.last_name), p.username, 'Student') as nm,
           sp.total_points as tp, sp.approved_count as ac, sp.longest_streak as ls
    from public.vacation_student_progress sp
    join public.profiles p on p.id = sp.student_id
    where sp.campaign_id = p_campaign
  )
  select rnk, sid, nm, tp, ac, ls, (sid = auth.uid())
  from ranked
  where rnk <= least(greatest(coalesce(p_limit, 25), 1), 100) or sid = auth.uid()
  order by rnk;
$$;

create or replace function public.vacation_participation_stats(p_campaign uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.vacation_campaigns%rowtype;
begin
  select * into c from public.vacation_campaigns where id = p_campaign;
  if not found or not public.vacation_is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'participating_students',
      (select count(distinct student_id) from public.vacation_submissions where campaign_id = p_campaign),
    'total_submissions',
      (select count(*) from public.vacation_submissions where campaign_id = p_campaign),
    'points_awarded',
      (select coalesce(sum(points), 0) from public.vacation_point_events where campaign_id = p_campaign),
    'by_activity', coalesce((
      select jsonb_agg(jsonb_build_object(
        'activity_id', a.id, 'title', a.title, 'date', a.activity_date,
        'submitted', count(s.id),
        'pending',  count(s.id) filter (where s.status = 'pending'),
        'approved', count(s.id) filter (where s.status = 'approved'),
        'rejected', count(s.id) filter (where s.status = 'rejected'))
        order by a.activity_date nulls last)
      from public.vacation_activities a
      left join public.vacation_submissions s on s.activity_id = a.id
      where a.campaign_id = p_campaign
      group by a.id, a.title, a.activity_date), '[]'::jsonb));
end;
$$;

create or replace function public.vacation_export_rows(p_campaign uuid)
returns table (activity_date date, activity_title text, student_name text, status text,
               points_awarded int, submitted_at timestamptz, reviewed_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.vacation_campaigns%rowtype;
begin
  select * into c from public.vacation_campaigns where id = p_campaign;
  if not found or not public.vacation_is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select a.activity_date, a.title,
           coalesce(public.vacation_profile_display_name(p.first_name, p.last_name), p.username, 'Student'),
           s.status,
           s.points_awarded, s.submitted_at, s.reviewed_at
    from public.vacation_submissions s
    join public.vacation_activities a on a.id = s.activity_id
    join public.profiles p on p.id = s.student_id
    where s.campaign_id = p_campaign
    order by a.activity_date, 3;
end;
$$;

alter table public.vacation_campaigns          enable row level security;
alter table public.vacation_streak_milestones  enable row level security;
alter table public.vacation_activities         enable row level security;
alter table public.vacation_submissions        enable row level security;
alter table public.vacation_point_events       enable row level security;
alter table public.vacation_student_progress   enable row level security;

create policy vc_select on public.vacation_campaigns for select to authenticated
  using (status = 'active' or public.vacation_is_staff());
create policy vc_insert on public.vacation_campaigns for insert to authenticated
  with check (public.vacation_is_admin());
create policy vc_update on public.vacation_campaigns for update to authenticated
  using (public.vacation_is_admin()) with check (public.vacation_is_admin());
create policy vc_delete on public.vacation_campaigns for delete to authenticated
  using (public.vacation_is_admin());

create policy vm_select on public.vacation_streak_milestones for select to authenticated
  using (true);
create policy vm_write on public.vacation_streak_milestones for all to authenticated
  using (public.vacation_is_admin()) with check (public.vacation_is_admin());

create policy va_select on public.vacation_activities for select to authenticated
  using (public.vacation_is_staff()
         or (is_active and exists (select 1 from public.vacation_campaigns c
                                   where c.id = campaign_id and c.status = 'active')));
create policy va_write on public.vacation_activities for all to authenticated
  using (public.vacation_is_admin()) with check (public.vacation_is_admin());

create policy vs_select on public.vacation_submissions for select to authenticated
  using (student_id = auth.uid() or public.vacation_is_staff());
create policy vpe_select on public.vacation_point_events for select to authenticated
  using (student_id = auth.uid() or public.vacation_is_staff());
create policy vsp_select on public.vacation_student_progress for select to authenticated
  using (student_id = auth.uid() or public.vacation_is_staff());

revoke all on public.vacation_campaigns, public.vacation_streak_milestones,
              public.vacation_activities, public.vacation_submissions,
              public.vacation_point_events, public.vacation_student_progress
  from anon, authenticated, public;

grant select, insert, update, delete on
  public.vacation_campaigns, public.vacation_streak_milestones, public.vacation_activities
  to authenticated;
grant select on
  public.vacation_submissions, public.vacation_point_events, public.vacation_student_progress
  to authenticated;
grant all on
  public.vacation_campaigns, public.vacation_streak_milestones, public.vacation_activities,
  public.vacation_submissions, public.vacation_point_events, public.vacation_student_progress
  to service_role;

revoke execute on function
  public.vacation_my_role(),
  public.vacation_is_staff(), public.vacation_is_admin(),
  public.vacation_profile_display_name(text, text),
  public.vacation_submit_activity(uuid, text, text),
  public.vacation_review_submission(uuid, text, int, text),
  public.vacation_seed_poster_drafts(uuid),
  public.vacation_student_overview(),
  public.vacation_leaderboard(uuid, int),
  public.vacation_participation_stats(uuid),
  public.vacation_export_rows(uuid),
  public.vacation_notify(uuid, text, text),
  public.vacation_refresh_progress(uuid, uuid, date),
  public.vacation_activity_guard()
  from public, anon, authenticated;

grant execute on function
  public.vacation_my_role(),
  public.vacation_is_staff(), public.vacation_is_admin(),
  public.vacation_submit_activity(uuid, text, text),
  public.vacation_review_submission(uuid, text, int, text),
  public.vacation_seed_poster_drafts(uuid),
  public.vacation_student_overview(),
  public.vacation_leaderboard(uuid, int),
  public.vacation_participation_stats(uuid),
  public.vacation_export_rows(uuid)
  to authenticated;

grant execute on function
  public.vacation_my_role(),
  public.vacation_is_staff(), public.vacation_is_admin(),
  public.vacation_submit_activity(uuid, text, text),
  public.vacation_review_submission(uuid, text, int, text),
  public.vacation_seed_poster_drafts(uuid),
  public.vacation_student_overview(),
  public.vacation_leaderboard(uuid, int),
  public.vacation_participation_stats(uuid),
  public.vacation_export_rows(uuid),
  public.vacation_notify(uuid, text, text),
  public.vacation_refresh_progress(uuid, uuid, date),
  public.vacation_activity_guard()
  to service_role;

commit;
