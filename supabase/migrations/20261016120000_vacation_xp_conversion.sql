-- Vacation campaign points are displayed at 5 XP per point; credit profiles using that conversion.
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

  select * into v_act from public.vacation_activities where id = v_sub.activity_id;
  select * into v_camp from public.vacation_campaigns where id = v_sub.campaign_id;

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
    update public.profiles set points = coalesce(points, 0) + (v_pts * 5)
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
      update public.profiles set points = coalesce(points, 0) + (v_bonus * 5)
       where id = v_sub.student_id;
      perform public.vacation_refresh_progress(
        v_sub.campaign_id, v_sub.student_id, v_act.activity_date);
    end if;

    perform public.vacation_notify(v_sub.student_id,
      'Vacation activity approved',
      format('"%s" earned %s points (%s XP)%s.', v_act.title, v_pts, v_pts * 5,
             case when v_bonus > 0 then format(' + %s streak bonus (%s XP)', v_bonus, v_bonus * 5) else '' end));
    return jsonb_build_object('status', 'approved', 'points', v_pts, 'xp', v_pts * 5,
                              'streak_bonus', v_bonus, 'streak_bonus_xp', v_bonus * 5);
  else
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
end;
$$;
