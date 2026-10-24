-- Migration: vacation_edit_submission_review
-- Allows staff (teachers and admins) to edit points, marks, and feedback on vacation submissions,
-- or change evaluation decisions (approve <-> reject) while keeping points, XP ledger, and streaks in sync.

create or replace function public.vacation_edit_submission_review(
  p_submission uuid,
  p_decision text,
  p_points int default null,
  p_note text default null,
  p_marks numeric default null
)
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
  v_old_pts int := 0;
  v_new_pts int;
  v_diff int := 0;
  v_run int;
  v_bonus int := 0;
  v_activity_points int := 0;
  v_removed_bonus_points int := 0;
  v_bonus_points int;
  v_longest_streak int := 0;
  m record;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.vacation_is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  if p_marks is not null and (p_marks < 0 or p_marks > 1000) then
    raise exception 'invalid_marks' using errcode = '22023';
  end if;

  select * into v_sub
    from public.vacation_submissions
   where id = p_submission
   for update;
  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;

  select * into v_act
    from public.vacation_activities
   where id = v_sub.activity_id;

  select * into v_camp
    from public.vacation_campaigns
   where id = v_sub.campaign_id;

  -- If submission was pending, delegate to the standard review function
  if v_sub.status = 'pending' then
    return public.vacation_review_submission_with_marks(
      p_submission, p_decision, p_points, p_note, p_marks
    );
  end if;

  -- ── CASE 1: Currently APPROVED ─────────────────────────────────────────────
  if v_sub.status = 'approved' then
    v_old_pts := coalesce(v_sub.points_awarded, 0);

    -- Sub-case 1A: Remains APPROVED (updating points, marks, note)
    if p_decision = 'approve' then
      v_new_pts := coalesce(p_points, v_act.reward_points, v_camp.default_points);
      if v_new_pts < 0 or v_new_pts > v_camp.max_award_points then
        raise exception 'invalid_points' using errcode = '22023';
      end if;

      v_diff := v_new_pts - v_old_pts;

      -- Update point event
      update public.vacation_point_events
         set points = v_new_pts,
             created_by = v_uid,
             created_at = now()
       where submission_id = v_sub.id
         and kind = 'activity';

      if not found then
        insert into public.vacation_point_events
          (campaign_id, student_id, kind, points, submission_id, created_by)
        values (v_sub.campaign_id, v_sub.student_id, 'activity', v_new_pts, v_sub.id, v_uid);
      end if;

      -- Adjust profile points (XP conversion is 5 XP per point)
      if v_diff <> 0 then
        update public.profiles
           set points = greatest(0, coalesce(points, 0) + (v_diff * 5))
         where id = v_sub.student_id;
      end if;

      -- Update submission
      update public.vacation_submissions
         set points_awarded = v_new_pts,
             marks_awarded = p_marks,
             reviewed_by = v_uid,
             reviewed_at = now(),
             review_note = nullif(btrim(p_note), '')
       where id = v_sub.id;

      perform public.vacation_refresh_progress(v_sub.campaign_id, v_sub.student_id, v_act.activity_date);

      perform public.vacation_notify(
        v_sub.student_id,
        'Vacation activity points updated',
        format('"%s" was updated to %s points (%s XP).', v_act.title, v_new_pts, v_new_pts * 5)
      );

      return jsonb_build_object(
        'status', 'approved',
        'points', v_new_pts,
        'xp', v_new_pts * 5,
        'delta_points', v_diff,
        'delta_xp', v_diff * 5,
        'marks_awarded', p_marks
      );

    -- Sub-case 1B: Changed from APPROVED to REJECTED
    else
      if coalesce(btrim(p_note), '') = '' then
        raise exception 'rejection_reason_required' using errcode = '22023';
      end if;

      -- Delete activity point event
      delete from public.vacation_point_events
       where submission_id = v_sub.id
         and kind = 'activity'
       returning points into v_activity_points;
      v_activity_points := coalesce(v_activity_points, v_sub.points_awarded, 0);

      -- Update submission record to rejected
      update public.vacation_submissions
         set status = 'rejected',
             points_awarded = null,
             marks_awarded = p_marks,
             reviewed_by = v_uid,
             reviewed_at = now(),
             review_note = btrim(p_note)
       where id = v_sub.id;

      -- Recalculate streaks and remove invalidated streak bonuses
      with approved_days as (
        select distinct a.activity_date as activity_date
          from public.vacation_submissions s
          join public.vacation_activities a on a.id = s.activity_id
         where s.campaign_id = v_sub.campaign_id
           and s.student_id = v_sub.student_id
           and s.status = 'approved'
           and a.activity_date is not null
      ), grouped_days as (
        select activity_date,
               activity_date - row_number() over (order by activity_date)::int as grp
          from approved_days
      ), streaks as (
        select count(*)::int as streak_length from grouped_days group by grp
      )
      select coalesce(max(streak_length), 0) into v_longest_streak from streaks;

      for v_bonus_points in
        delete from public.vacation_point_events
         where campaign_id = v_sub.campaign_id
           and student_id = v_sub.student_id
           and kind = 'streak_bonus'
           and milestone_days > v_longest_streak
         returning points
      loop
        v_removed_bonus_points := v_removed_bonus_points + v_bonus_points;
      end loop;

      -- Deduct lost activity points + lost streak bonus XP
      update public.profiles
         set points = greatest(0, coalesce(points, 0) - ((v_activity_points + v_removed_bonus_points) * 5))
       where id = v_sub.student_id;

      perform public.vacation_refresh_progress(v_sub.campaign_id, v_sub.student_id, v_act.activity_date);

      perform public.vacation_notify(
        v_sub.student_id,
        'Vacation activity needs changes',
        format('"%s" was changed to not approved: %s', v_act.title, btrim(p_note))
      );

      return jsonb_build_object(
        'status', 'rejected',
        'activity_points_removed', v_activity_points,
        'streak_bonus_points_removed', v_removed_bonus_points,
        'marks_awarded', p_marks
      );
    end if;

  -- ── CASE 2: Currently REJECTED ─────────────────────────────────────────────
  elsif v_sub.status = 'rejected' then

    -- Sub-case 2A: Changed from REJECTED to APPROVED
    if p_decision = 'approve' then
      v_new_pts := coalesce(p_points, v_act.reward_points, v_camp.default_points);
      if v_new_pts < 0 or v_new_pts > v_camp.max_award_points then
        raise exception 'invalid_points' using errcode = '22023';
      end if;

      insert into public.vacation_point_events
        (campaign_id, student_id, kind, points, submission_id, created_by)
      values (v_sub.campaign_id, v_sub.student_id, 'activity', v_new_pts, v_sub.id, v_uid)
      on conflict (submission_id) where kind = 'activity'
      do update set points = v_new_pts, created_by = v_uid, created_at = now();

      update public.vacation_submissions
         set status = 'approved',
             points_awarded = v_new_pts,
             marks_awarded = p_marks,
             reviewed_by = v_uid,
             reviewed_at = now(),
             review_note = nullif(btrim(p_note), '')
       where id = v_sub.id;

      update public.profiles
         set points = coalesce(points, 0) + (v_new_pts * 5)
       where id = v_sub.student_id;

      v_run := public.vacation_refresh_progress(
        v_sub.campaign_id, v_sub.student_id, v_act.activity_date
      );

      for m in select * from public.vacation_streak_milestones
                where campaign_id = v_sub.campaign_id and days <= v_run order by days loop
        insert into public.vacation_point_events
          (campaign_id, student_id, kind, points, milestone_days, created_by)
        values (v_sub.campaign_id, v_sub.student_id, 'streak_bonus', m.bonus_points, m.days, v_uid)
        on conflict (campaign_id, student_id, milestone_days) where kind = 'streak_bonus' do nothing;
      end loop;

      perform public.vacation_notify(
        v_sub.student_id,
        'Vacation activity approved',
        format('"%s" earned %s points (%s XP).', v_act.title, v_new_pts, v_new_pts * 5)
      );

      return jsonb_build_object(
        'status', 'approved',
        'points', v_new_pts,
        'xp', v_new_pts * 5,
        'marks_awarded', p_marks
      );

    -- Sub-case 2B: Remains REJECTED (updating marks, feedback note)
    else
      if coalesce(btrim(p_note), '') = '' then
        raise exception 'rejection_reason_required' using errcode = '22023';
      end if;

      update public.vacation_submissions
         set marks_awarded = p_marks,
             reviewed_by = v_uid,
             reviewed_at = now(),
             review_note = btrim(p_note)
       where id = v_sub.id;

      perform public.vacation_notify(
        v_sub.student_id,
        'Vacation feedback updated',
        format('"%s" feedback updated: %s', v_act.title, btrim(p_note))
      );

      return jsonb_build_object(
        'status', 'rejected',
        'marks_awarded', p_marks
      );
    end if;

  else
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.vacation_edit_submission_review(uuid, text, int, text, numeric)
  from public, anon;
grant execute on function public.vacation_edit_submission_review(uuid, text, int, text, numeric)
  to authenticated, service_role;
