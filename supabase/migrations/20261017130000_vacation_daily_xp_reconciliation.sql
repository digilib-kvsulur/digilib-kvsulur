-- Admin-only repair path for approved vacation submissions whose activity
-- award is missing from the idempotent point ledger.
create or replace function public.vacation_reconcile_daily_xp(
  p_campaign uuid,
  p_day date,
  p_apply boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_eligible integer := 0;
  v_already_credited integer := 0;
  v_credited integer := 0;
  v_xp_credited bigint := 0;
  v_award_id uuid;
  v_row record;
  v_students uuid[] := array[]::uuid[];
  v_student uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.vacation_is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_campaign is null or p_day is null then
    raise exception 'campaign_and_day_required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.vacation_campaigns where id = p_campaign) then
    raise exception 'campaign_not_found' using errcode = 'P0002';
  end if;

  select
    count(*) filter (where event.id is null)::integer,
    count(*) filter (where event.id is not null)::integer
  into v_eligible, v_already_credited
  from public.vacation_submissions submission
  join public.vacation_activities activity
    on activity.id = submission.activity_id
  left join public.vacation_point_events event
    on event.submission_id = submission.id and event.kind = 'activity'
  where submission.campaign_id = p_campaign
    and activity.activity_date = p_day
    and submission.status = 'approved';

  if coalesce(p_apply, false) then
    for v_row in
      select submission.id, submission.student_id,
             coalesce(submission.points_awarded, activity.reward_points, campaign.default_points)::integer as points
      from public.vacation_submissions submission
      join public.vacation_activities activity
        on activity.id = submission.activity_id
      join public.vacation_campaigns campaign
        on campaign.id = submission.campaign_id
      left join public.vacation_point_events event
        on event.submission_id = submission.id and event.kind = 'activity'
      where submission.campaign_id = p_campaign
        and activity.activity_date = p_day
        and submission.status = 'approved'
        and event.id is null
      order by submission.student_id, submission.id
      for update of submission
    loop
      v_award_id := null;
      insert into public.vacation_point_events
        (campaign_id, student_id, kind, points, submission_id, created_by)
      values
        (p_campaign, v_row.student_id, 'activity', v_row.points, v_row.id, v_uid)
      on conflict (submission_id) where kind = 'activity' do nothing
      returning id into v_award_id;

      -- The profile XP balance is changed only when this transaction creates
      -- the unique activity ledger row. Repeated or concurrent runs add zero.
      if v_award_id is not null then
        update public.profiles
           set points = coalesce(points, 0) + (v_row.points * 5)
         where id = v_row.student_id;
        v_credited := v_credited + 1;
        v_xp_credited := v_xp_credited + (v_row.points::bigint * 5);
        if not (v_row.student_id = any(v_students)) then
          v_students := array_append(v_students, v_row.student_id);
        end if;
      else
        v_already_credited := v_already_credited + 1;
      end if;
    end loop;

    foreach v_student in array v_students loop
      perform public.vacation_refresh_progress(p_campaign, v_student, p_day);
    end loop;
  end if;

  return jsonb_build_object(
    'campaign_id', p_campaign,
    'activity_date', p_day,
    'eligible', v_eligible,
    'already_credited', v_already_credited,
    'credited', v_credited,
    'xp_credited', v_xp_credited,
    'applied', coalesce(p_apply, false)
  );
end;
$$;

revoke all on function public.vacation_reconcile_daily_xp(uuid, date, boolean) from public;
grant execute on function public.vacation_reconcile_daily_xp(uuid, date, boolean) to authenticated;
