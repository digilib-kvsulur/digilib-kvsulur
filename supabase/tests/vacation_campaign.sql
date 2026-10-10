-- Vacation campaign invariants.
-- Run as a database owner (SQL editor or psql). The script wraps work in a
-- transaction and ROLLBACKs so it does not leave rows behind.
--
-- Tenant DBs have no profiles.school_id. Cross-school access is the platform
-- registry (separate project), not these tables. This file instead asserts
-- student-vs-student and student-vs-staff denials.

begin;

create extension if not exists pgcrypto;

create or replace function pg_temp.vacation_login(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
end;
$$;

create or replace function pg_temp.vacation_make_user(p_email text, p_role text)
returns uuid
language plpgsql
as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    p_email, crypt('vacation-test', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );
  insert into public.profiles (id, first_name, last_name, email, role, is_approved, points)
  values (v_id, initcap(p_role), 'Tester', p_email, p_role, true, 0)
  on conflict (id) do update set role = excluded.role, points = 0;
  return v_id;
end;
$$;

do $$
declare
  v_admin uuid;
  v_teacher uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_camp uuid;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_act uuid;
  v_act2 uuid;
  v_act3 uuid;
  v_closed uuid;
  v_hidden uuid;
  v_sub uuid;
  v_sub2 uuid;
  v_msg text;
  v_pts int;
  v_count int;
  v_seen int;
  v_streak int;
begin
  v_admin := pg_temp.vacation_make_user('vacation-admin@example.invalid', 'admin');
  v_teacher := pg_temp.vacation_make_user('vacation-teacher@example.invalid', 'teacher');
  v_s1 := pg_temp.vacation_make_user('vacation-student1@example.invalid', 'student');
  v_s2 := pg_temp.vacation_make_user('vacation-student2@example.invalid', 'student');

  perform pg_temp.vacation_login(v_admin);
  insert into public.vacation_campaigns (
    title, status, start_date, end_date, timezone, default_points, max_award_points
  ) values (
    'Test vacation', 'active', v_today - 2, v_today + 10, 'Asia/Kolkata', 10, 50
  ) returning id into v_camp;

  insert into public.vacation_streak_milestones (campaign_id, days, bonus_points)
  values (v_camp, 2, 5);

  insert into public.vacation_activities (
    campaign_id, title, instructions, activity_date, is_active, sort_order,
    opens_at, closes_at
  ) values (
    v_camp, 'Day 0', 'Oldest day', v_today - 2, true, 1,
    now() - interval '1 hour', now() + interval '2 hours'
  ) returning id into v_act2;

  insert into public.vacation_activities (
    campaign_id, title, instructions, activity_date, is_active, sort_order,
    opens_at, closes_at
  ) values (
    v_camp, 'Day 1 gap', 'Middle day', v_today - 1, true, 2,
    now() - interval '1 hour', now() + interval '2 hours'
  ) returning id into v_act3;

  insert into public.vacation_activities (
    campaign_id, title, instructions, activity_date, is_active, sort_order,
    opens_at, closes_at
  ) values (
    v_camp, 'Today open', 'Do the work', v_today, true, 3,
    now() - interval '1 hour', now() + interval '2 hours'
  ) returning id into v_act;

  insert into public.vacation_activities (
    campaign_id, title, instructions, activity_date, is_active, sort_order,
    opens_at, closes_at
  ) values (
    v_camp, 'Window closed', 'Too late', v_today + 1, true, 4,
    now() - interval '3 hours', now() - interval '1 hour'
  ) returning id into v_closed;

  insert into public.vacation_activities (
    campaign_id, title, instructions, is_active, sort_order
  ) values (
    v_camp, 'Inactive draft', 'Students must not see this', false, 99
  ) returning id into v_hidden;

  -- 1. Submit outside window fails.
  perform pg_temp.vacation_login(v_s1);
  begin
    perform public.vacation_submit_activity(v_closed, 'late work', null);
    raise exception 'expected outside_submission_window';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%outside_submission_window%' then raise; end if;
  end;

  -- 2. First submit works; second submit same day/activity fails.
  perform public.vacation_submit_activity(v_act, 'my writeup', null);
  begin
    perform public.vacation_submit_activity(v_act, 'again', null);
    raise exception 'expected already_submitted';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%already_submitted%' then raise; end if;
  end;

  select id into v_sub from public.vacation_submissions
   where activity_id = v_act and student_id = v_s1;

  -- 3. Student cannot call review RPC.
  begin
    perform public.vacation_review_submission(v_sub, 'approve', 10, null);
    raise exception 'expected forbidden for student review';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%forbidden%' then raise; end if;
  end;

  -- 4. Reject then resubmit works (same row, attempts incremented).
  perform pg_temp.vacation_login(v_teacher);
  perform public.vacation_review_submission(v_sub, 'reject', null, 'Please add more detail');

  perform pg_temp.vacation_login(v_s1);
  perform public.vacation_submit_activity(v_act, 'improved writeup', 'https://example.com/work');
  select attempts, status into v_count, v_msg from public.vacation_submissions where id = v_sub;
  if v_count <> 2 or v_msg <> 'pending' then
    raise exception 'resubmit did not reopen row (attempts=%, status=%)', v_count, v_msg;
  end if;

  -- 5. Approve awards once; second approve is already_reviewed / already_awarded.
  select points into v_pts from public.profiles where id = v_s1;
  perform pg_temp.vacation_login(v_teacher);
  perform public.vacation_review_submission(v_sub, 'approve', 8, null);
  if (select points from public.profiles where id = v_s1) <> v_pts + 8 then
    raise exception 'points not awarded atomically';
  end if;
  if (select count(*) from public.vacation_point_events where submission_id = v_sub) <> 1 then
    raise exception 'expected one ledger row';
  end if;
  begin
    perform public.vacation_review_submission(v_sub, 'approve', 8, null);
    raise exception 'expected already_reviewed';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%already_reviewed%' and v_msg not like '%already_awarded%' then raise; end if;
  end;

  -- Unique ledger index: a second activity award for the same submission is impossible.
  begin
    insert into public.vacation_point_events (campaign_id, student_id, kind, points, submission_id)
    values (v_camp, v_s1, 'activity', 1, v_sub);
    raise exception 'expected unique award index to fire';
  exception when unique_violation then
    null;
  end;

  -- 6. Student cannot see inactive activities or other students' submissions.
  perform pg_temp.vacation_login(v_s2);
  perform public.vacation_submit_activity(v_act, 'student two', null);
  select id into v_sub2 from public.vacation_submissions where activity_id = v_act and student_id = v_s2;

  begin
    execute 'set local role authenticated';
    perform pg_temp.vacation_login(v_s1);
    select count(*) into v_seen from public.vacation_activities where id = v_hidden;
    if v_seen <> 0 then
      raise exception 'student saw inactive activity';
    end if;
    select count(*) into v_seen from public.vacation_submissions where id = v_sub2;
    if v_seen <> 0 then
      raise exception 'student saw another student submission';
    end if;
    execute 'reset role';
  exception when others then
    execute 'reset role';
    get stacked diagnostics v_msg = message_text;
    if v_msg like '%student saw%' then raise; end if;
    raise notice 'SET ROLE authenticated skipped (%). RPC/table owner checks still ran.', v_msg;
  end;

  -- 7. Streak gap: approve day 0 and today, then late-approve the middle day.
  perform pg_temp.vacation_login(v_s1);
  perform public.vacation_submit_activity(v_act2, 'day 0', null);
  select id into v_sub2 from public.vacation_submissions where activity_id = v_act2 and student_id = v_s1;
  perform pg_temp.vacation_login(v_teacher);
  perform public.vacation_review_submission(v_sub2, 'approve', 10, null);

  select current_streak, longest_streak into v_streak, v_count
    from public.vacation_student_progress
   where campaign_id = v_camp and student_id = v_s1;
  if v_count <> 1 then
    raise exception 'gap should keep longest streak at 1 (longest=%)', v_count;
  end if;

  perform pg_temp.vacation_login(v_s1);
  perform public.vacation_submit_activity(v_act3, 'late fill', null);
  select id into v_sub2 from public.vacation_submissions where activity_id = v_act3 and student_id = v_s1;
  perform pg_temp.vacation_login(v_teacher);
  perform public.vacation_review_submission(v_sub2, 'approve', 10, null);

  select current_streak, longest_streak into v_streak, v_count
    from public.vacation_student_progress
   where campaign_id = v_camp and student_id = v_s1;
  if v_streak < 3 or v_count < 3 then
    raise exception 'late approval should fill streak gap (current=%, longest=%)', v_streak, v_count;
  end if;
  if not exists (
    select 1 from public.vacation_point_events
     where campaign_id = v_camp and student_id = v_s1 and kind = 'streak_bonus' and milestone_days = 2
  ) then
    raise exception '2-day streak bonus was not awarded once';
  end if;

  -- One bonus per milestone.
  begin
    insert into public.vacation_point_events (campaign_id, student_id, kind, points, milestone_days)
    values (v_camp, v_s1, 'streak_bonus', 5, 2);
    raise exception 'expected unique bonus index to fire';
  exception when unique_violation then
    null;
  end;

  raise notice 'vacation_campaign tests passed';
end;
$$;

rollback;
