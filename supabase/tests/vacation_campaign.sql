-- Vacation Campaign tests. Run as postgres after the vacation migration.
-- Cross-school access is N/A (one tenant DB per school); this suite covers
-- student vs student, student vs staff, windows, uniqueness, and streaks.

create or replace function public.vacation_set_auth(p_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
end;
$$;

create or replace function public.vacation_run_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid;
  v_teacher uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_camp uuid;
  v_today uuid;
  v_past uuid;
  v_inactive uuid;
  v_sub uuid;
  v_sub2 uuid;
  v_err text;
  v_attempts int;
  v_awards int;
  v_streak int;
  v_seen int;
  v_result jsonb := '[]'::jsonb;
  v_ok boolean;
begin
  select id into v_admin from public.profiles where role = 'admin' limit 1;
  select id into v_teacher from public.profiles where role = 'teacher' limit 1;
  select id into v_s1 from public.profiles where role = 'student' order by created_at limit 1;
  select id into v_s2 from public.profiles where role = 'student' and id <> v_s1 order by created_at limit 1;
  if v_admin is null or v_s1 is null or v_s2 is null then
    raise exception 'Need at least one admin and two students in profiles';
  end if;
  if v_teacher is null then v_teacher := v_admin; end if;

  delete from public.vacation_point_events;
  delete from public.vacation_student_progress;
  delete from public.vacation_submissions;
  delete from public.vacation_activities;
  delete from public.vacation_streak_milestones;
  delete from public.vacation_campaigns;

  insert into public.vacation_campaigns (title, status, start_date, end_date, timezone, default_points, max_award_points)
  values ('Test Campaign', 'active', current_date - 5, current_date + 5, 'Asia/Kolkata', 10, 50)
  returning id into v_camp;

  insert into public.vacation_streak_milestones (campaign_id, days, bonus_points)
  values (v_camp, 2, 5);

  insert into public.vacation_activities (campaign_id, title, instructions, activity_date, is_active, opens_at, closes_at)
  values (v_camp, 'Today', 'Do the thing', current_date, true,
          now() - interval '1 hour', now() + interval '2 hours')
  returning id into v_today;

  insert into public.vacation_activities (campaign_id, title, instructions, activity_date, is_active, opens_at, closes_at)
  values (v_camp, 'Past window', 'Closed', current_date - 1, true,
          now() - interval '2 days', now() - interval '1 day')
  returning id into v_past;

  insert into public.vacation_activities (campaign_id, title, instructions, activity_date, is_active)
  values (v_camp, 'Inactive draft', 'Hidden', current_date + 1, false)
  returning id into v_inactive;

  -- 1. submit outside window fails
  perform public.vacation_set_auth(v_s1);
  begin
    perform public.vacation_submit_activity(v_past, 'late', null);
    v_ok := false;
  exception when others then
    v_ok := sqlerrm like '%outside_submission_window%';
  end;
  v_result := v_result || jsonb_build_object('name', 'submit_outside_window', 'ok', v_ok);

  -- 2. first submit works; second same day fails
  perform public.vacation_submit_activity(v_today, 'my work', null);
  v_sub := (select id from public.vacation_submissions where student_id = v_s1 and activity_id = v_today);
  begin
    perform public.vacation_submit_activity(v_today, 'again', null);
    v_ok := false;
  exception when others then
    v_ok := sqlerrm like '%already_submitted%';
  end;
  v_result := v_result || jsonb_build_object('name', 'second_submit_same_day', 'ok', v_ok);

  -- 3. student cannot call review
  begin
    perform public.vacation_review_submission(v_sub, 'approve', 10, null);
    v_ok := false;
  exception when others then
    v_ok := sqlerrm like '%forbidden%';
  end;
  v_result := v_result || jsonb_build_object('name', 'student_review_denied', 'ok', v_ok);

  -- 4. student cannot see inactive activities or other students' submissions
  perform public.vacation_set_auth(v_s2);
  perform public.vacation_submit_activity(v_today, 's2 work', null);
  v_sub2 := (select id from public.vacation_submissions where student_id = v_s2 and activity_id = v_today);
  perform public.vacation_set_auth(v_s1);
  select count(*) into v_seen from public.vacation_activities where id = v_inactive and is_active = false;
  -- RLS: student select of inactive should be 0 when role is authenticated
  set local role authenticated;
  perform public.vacation_set_auth(v_s1);
  select count(*) into v_seen from public.vacation_activities where id = v_inactive;
  v_result := v_result || jsonb_build_object('name', 'inactive_hidden', 'ok', v_seen = 0);
  select count(*) into v_seen from public.vacation_submissions where student_id = v_s2;
  v_result := v_result || jsonb_build_object('name', 'other_student_hidden', 'ok', v_seen = 0);
  reset role;

  -- 5. reject then resubmit
  perform public.vacation_set_auth(v_teacher);
  perform public.vacation_review_submission(v_sub, 'reject', null, 'Please add a photo link');
  perform public.vacation_set_auth(v_s1);
  perform public.vacation_submit_activity(v_today, 'fixed writeup', 'https://example.com/work');
  select attempts into v_attempts from public.vacation_submissions where id = v_sub;
  v_result := v_result || jsonb_build_object('name', 'resubmit_after_reject', 'ok', v_attempts = 2);

  -- 6. concurrent double approve awards once
  perform public.vacation_set_auth(v_admin);
  perform public.vacation_review_submission(v_sub, 'approve', 10, null);
  begin
    perform public.vacation_review_submission(v_sub, 'approve', 10, null);
    v_ok := false;
  exception when others then
    v_ok := sqlerrm like '%already_reviewed%' or sqlerrm like '%already_awarded%';
  end;
  select count(*) into v_awards from public.vacation_point_events where submission_id = v_sub and kind = 'activity';
  v_result := v_result || jsonb_build_object('name', 'double_approve_once', 'ok', v_ok and v_awards = 1);

  -- 7. streak gap vs late approval
  -- Approve s2 today only (streak 1). Insert an approved day-before-yesterday for s2, then late-approve yesterday to fill the gap.
  update public.vacation_activities set opens_at = now() - interval '1 hour', closes_at = now() + interval '1 hour'
    where id = v_past;
  -- create a gap day activity
  insert into public.vacation_activities (campaign_id, title, instructions, activity_date, is_active, opens_at, closes_at)
  values (v_camp, 'Two days ago', 'Older', current_date - 2, true, now() - interval '1 hour', now() + interval '1 hour');

  perform public.vacation_set_auth(v_admin);
  perform public.vacation_review_submission(v_sub2, 'approve', 10, null);

  -- force-insert an approved older submission for s2 (late approval of day-2 then day-1)
  insert into public.vacation_submissions (campaign_id, activity_id, student_id, content, status, points_awarded, reviewed_by, reviewed_at)
  select v_camp, a.id, v_s2, 'old', 'pending', null, null, null
  from public.vacation_activities a where a.title = 'Two days ago';

  perform public.vacation_set_auth(v_s2);
  -- window was opened above; if unique already pending, skip
  begin
    perform public.vacation_submit_activity((select id from public.vacation_activities where title = 'Two days ago'), 'old work', null);
  exception when others then
    null;
  end;

  perform public.vacation_set_auth(v_admin);
  perform public.vacation_review_submission(
    (select id from public.vacation_submissions s join public.vacation_activities a on a.id = s.activity_id
     where s.student_id = v_s2 and a.title = 'Two days ago'),
    'approve', 10, null);

  -- gap: current streak should be 1 (today) not 3, because yesterday is missing
  select current_streak into v_streak from public.vacation_student_progress where student_id = v_s2 and campaign_id = v_camp;
  v_result := v_result || jsonb_build_object('name', 'streak_gap', 'ok', v_streak = 1);

  -- late-approve yesterday (v_past) to fill the gap → streak 3
  perform public.vacation_set_auth(v_s2);
  begin
    perform public.vacation_submit_activity(v_past, 'catch up', null);
  exception when others then
    null;
  end;
  perform public.vacation_set_auth(v_admin);
  perform public.vacation_review_submission(
    (select id from public.vacation_submissions where student_id = v_s2 and activity_id = v_past),
    'approve', 10, null);
  select current_streak, longest_streak into v_streak, v_awards
    from public.vacation_student_progress where student_id = v_s2 and campaign_id = v_camp;
  v_result := v_result || jsonb_build_object('name', 'late_approval_fills_gap', 'ok', v_streak >= 3 and v_awards >= 3);

  -- cleanup test campaign data
  delete from public.vacation_point_events where campaign_id = v_camp;
  delete from public.vacation_student_progress where campaign_id = v_camp;
  delete from public.vacation_submissions where campaign_id = v_camp;
  delete from public.vacation_activities where campaign_id = v_camp;
  delete from public.vacation_streak_milestones where campaign_id = v_camp;
  delete from public.vacation_campaigns where id = v_camp;

  return jsonb_build_object(
    'passed', (select bool_and((x->>'ok')::boolean) from jsonb_array_elements(v_result) x),
    'cases', v_result
  );
end;
$$;

grant execute on function public.vacation_run_tests() to service_role;
revoke execute on function public.vacation_run_tests() from public, anon, authenticated;
grant execute on function public.vacation_set_auth(uuid) to service_role;
revoke execute on function public.vacation_set_auth(uuid) from public, anon, authenticated;

-- select public.vacation_run_tests();
