create or replace function public.vacation_revert_submission_evaluation(p_submission uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.vacation_submissions%rowtype;
  v_activity_date date;
  v_activity_points int := 0;
  v_removed_bonus_points int := 0;
  v_bonus_points int;
  v_longest_streak int := 0;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.vacation_is_staff() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_sub
    from public.vacation_submissions
   where id = p_submission
   for update;
  if not found then
    raise exception 'submission_not_found' using errcode = 'P0002';
  end if;
  if v_sub.status not in ('approved', 'rejected') then
    raise exception 'submission_not_evaluated' using errcode = 'P0001';
  end if;

  select activity_date into v_activity_date
    from public.vacation_activities where id = v_sub.activity_id;

  if v_sub.status = 'approved' then
    delete from public.vacation_point_events
     where submission_id = v_sub.id and kind = 'activity'
     returning points into v_activity_points;
    v_activity_points := coalesce(v_activity_points, v_sub.points_awarded, 0);
  end if;

  update public.vacation_submissions
     set status = 'pending', points_awarded = null, marks_awarded = null,
         reviewed_by = null, reviewed_at = null, review_note = null
   where id = v_sub.id;

  if v_sub.status = 'approved' then
    -- Keep streak bonuses only when the remaining approved entries still form
    -- a streak at least as long as the bonus milestone.
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

    update public.profiles
       set points = greatest(0, coalesce(points, 0) - ((v_activity_points + v_removed_bonus_points) * 5))
     where id = v_sub.student_id;
  end if;

  perform public.vacation_refresh_progress(v_sub.campaign_id, v_sub.student_id, v_activity_date);
  perform public.vacation_notify(v_sub.student_id,
    'Vacation evaluation reverted',
    'Your entry is pending review again. Contact staff if you have questions.');

  return jsonb_build_object(
    'status', 'pending',
    'activity_points_removed', v_activity_points,
    'streak_bonus_points_removed', v_removed_bonus_points
  );
end;
$$;

revoke execute on function public.vacation_revert_submission_evaluation(uuid) from public, anon;
grant execute on function public.vacation_revert_submission_evaluation(uuid) to authenticated, service_role;
