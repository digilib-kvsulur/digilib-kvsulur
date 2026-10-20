alter table public.vacation_submissions
  add column if not exists marks_awarded numeric(8, 2)
  check (marks_awarded is null or (marks_awarded >= 0 and marks_awarded <= 1000));

create or replace function public.vacation_review_submission_with_marks(
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
  v_result jsonb;
begin
  if p_marks is not null and (p_marks < 0 or p_marks > 1000) then
    raise exception 'invalid_marks' using errcode = '22023';
  end if;

  v_result := public.vacation_review_submission(p_submission, p_decision, p_points, p_note);

  if p_marks is not null then
    update public.vacation_submissions
       set marks_awarded = p_marks
     where id = p_submission;
    v_result := v_result || jsonb_build_object('marks_awarded', p_marks);
  end if;

  return v_result;
end;
$$;

revoke execute on function public.vacation_review_submission_with_marks(uuid, text, int, text, numeric)
  from public, anon;
grant execute on function public.vacation_review_submission_with_marks(uuid, text, int, text, numeric)
  to authenticated, service_role;
