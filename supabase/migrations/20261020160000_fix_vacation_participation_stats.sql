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
        'activity_id', activity_id,
        'title', title,
        'date', activity_date,
        'submitted', submitted,
        'pending', pending,
        'approved', approved,
        'rejected', rejected
      ) order by activity_date nulls last)
      from (
        select a.id as activity_id,
               a.title,
               a.activity_date,
               count(s.id) as submitted,
               count(s.id) filter (where s.status = 'pending') as pending,
               count(s.id) filter (where s.status = 'approved') as approved,
               count(s.id) filter (where s.status = 'rejected') as rejected
        from public.vacation_activities a
        left join public.vacation_submissions s on s.activity_id = a.id
        where a.campaign_id = p_campaign
        group by a.id, a.title, a.activity_date
      ) activity_stats
    ), '[]'::jsonb)
  );
end;
$$;
