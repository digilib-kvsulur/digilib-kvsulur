-- Student learning loop invariants: exams, flashcards, practice mastery,
-- checkpoints, mock tests, weekly goals, My Day, and skills.
-- Run as a database owner (SQL editor or psql). The script wraps work in a
-- transaction and ROLLBACKs so it does not leave rows behind.

begin;

create extension if not exists pgcrypto;

create or replace function pg_temp.learning_login(p_uid uuid)
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

create or replace function pg_temp.learning_make_user(
  p_email text,
  p_role text,
  p_class text default null
)
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
    p_email, crypt('learning-test', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );
  insert into public.profiles (id, first_name, last_name, email, role, student_class, is_approved, points)
  values (v_id, initcap(p_role), 'Tester', p_email, p_role, p_class, true, 0)
  on conflict (id) do update
    set role = excluded.role,
        student_class = excluded.student_class,
        points = 0;
  return v_id;
end;
$$;

do $$
declare
  v_admin uuid;
  v_teacher uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_exam10 uuid;
  v_practice uuid;
  v_checkpoint uuid;
  v_mock uuid;
  v_flashcard_set uuid;
  v_card uuid;
  v_add jsonb;
  v_due jsonb;
  v_review jsonb;
  v_reward jsonb;
  v_practice_result jsonb;
  v_mastery jsonb;
  v_checkpoint_result jsonb;
  v_start jsonb;
  v_mock_result jsonb;
  v_attempt uuid;
  v_today jsonb;
  v_week jsonb;
  v_report jsonb;
  v_count int;
  v_points int;
  v_msg text;
begin
  v_admin := pg_temp.learning_make_user('learning-admin@example.invalid', 'admin');
  v_teacher := pg_temp.learning_make_user('learning-teacher@example.invalid', 'teacher');
  v_s1 := pg_temp.learning_make_user('learning-student1@example.invalid', 'student', 'Class 10');
  v_s2 := pg_temp.learning_make_user('learning-student2@example.invalid', 'student', '10');

  perform pg_temp.learning_login(v_admin);
  insert into public.exam_schedule (
    class_number, subject, exam_name, exam_date, syllabus, created_by
  ) values (
    '10', 'Mathematics', 'Half-yearly examination', current_date + 5,
    '["Real Numbers", "Polynomials"]'::jsonb, v_admin
  ) returning id into v_exam10;

  insert into public.exam_schedule (
    class_number, subject, exam_name, exam_date, syllabus, created_by
  ) values (
    '9', 'Science', 'Class 9 science test', current_date + 3, '[]'::jsonb, v_admin
  );

  insert into public.study_materials (
    title, description, subject, student_class, chapter_title, topic, resource_type,
    academic_session, file_url, markdown_content, review_status, uploaded_by
  ) values (
    'Real Numbers practice', 'Practice set', 'Mathematics', '10', 'Real Numbers', 'Euclid''s division lemma',
    'chapter_practice', '2026-27', '',
    '{"questions":[
      {"prompt":"HCF of 12 and 18?","options":["6","9","12"],"correct_index":0,"explanation":"6 divides both."},
      {"prompt":"Is 1.414... rational?","options":["Yes","No"],"correct_index":1,"explanation":"It is irrational."}
    ]}'::text,
    'approved', v_admin
  ) returning id into v_practice;

  insert into public.study_materials (
    title, description, subject, student_class, chapter_title, topic, resource_type,
    academic_session, file_url, markdown_content, review_status, uploaded_by
  ) values (
    'Real Numbers checkpoint', 'Chapter checkpoint', 'Mathematics', '10', 'Real Numbers', 'Real Numbers',
    'checkpoint', '2026-27', '',
    '{"questions":[
      {"prompt":"HCF of 12 and 18?","options":["6","9","12"],"correct_index":0,"explanation":"6 divides both."},
      {"prompt":"Is 1.414... rational?","options":["Yes","No"],"correct_index":1,"explanation":"It is irrational."}
    ]}'::text,
    'approved', v_admin
  ) returning id into v_checkpoint;

  insert into public.study_materials (
    title, description, subject, student_class, chapter_title, topic, resource_type,
    academic_session, file_url, markdown_content, review_status, uploaded_by
  ) values (
    'Real Numbers mock paper', 'Objective mock', 'Mathematics', '10', 'Real Numbers', 'Real Numbers',
    'mock_paper', '2026-27', '',
    '{"duration_minutes":30,"sections":[
      {"name":"Section A","marks_per_question":1,"questions":[
        {"prompt":"HCF of 12 and 18?","options":["6","9","12"],"correct_index":0,"explanation":"6 divides both."},
        {"prompt":"Is 1.414... rational?","options":["Yes","No"],"correct_index":1,"explanation":"It is irrational."}
      ]}
    ]}'::text,
    'approved', v_admin
  ) returning id into v_mock;

  insert into public.study_materials (
    title, description, subject, student_class, chapter_title, topic, resource_type,
    academic_session, file_url, markdown_content, review_status, uploaded_by
  ) values (
    'Real Numbers flashcards', 'Teacher card deck', 'Mathematics', '10', 'Real Numbers', 'Real Numbers',
    'flashcards', '2026-27', '',
    '{"cards":[{"front":"What is the HCF of 12 and 18?","back":"6"},{"front":"Is 1.414... rational?","back":"No"}]}'::text,
    'approved', v_admin
  ) returning id into v_flashcard_set;

  -- ---------- Flashcards ----------
  perform pg_temp.learning_login(v_s1);
  v_add := public.study_add_flashcards('[
    {"front":"What is the SI unit of force?","back":"Newton","subject":"Physics","chapter_title":"Force"},
    {"front":"What is the chemical formula of water?","back":"H2O","subject":"Science","chapter_title":"Water"},
    {"front":"What is 7 x 8?","back":"56","subject":"Mathematics","chapter_title":"Multiplication"}
  ]'::jsonb);
  if (v_add->>'added')::int <> 3 then
    raise exception 'expected 3 flashcards added, got %', v_add;
  end if;

  v_add := public.study_add_flashcards('[{"front":"What is the SI unit of force?","back":"Newton","subject":"Physics","chapter_title":"Force"}]'::jsonb);
  if (v_add->>'added')::int <> 0 then
    raise exception 'duplicate flashcard should be skipped, got %', v_add;
  end if;

  v_due := public.study_flashcards_due(30);
  if (v_due->>'due_count')::int <> 3 then
    raise exception 'expected 3 due cards, got %', v_due;
  end if;

  select id into v_card from public.study_flashcards where user_id = v_s1 order by front limit 1;
  v_review := public.study_review_flashcard(v_card, 3);
  if (v_review->>'reps')::int <> 1 or (v_review->>'interval_days')::numeric <> 1 then
    raise exception 'rating 3 should schedule one day, got %', v_review;
  end if;

  v_reward := public.claim_flashcard_reward();
  if (v_reward->>'awarded')::boolean or v_reward->>'reason' <> 'need_more_reviews' then
    raise exception 'reward should require 10 reviews, got %', v_reward;
  end if;

  -- Add ten more cards and review them so the daily reward threshold is met.
  v_add := public.study_add_flashcards((
    select jsonb_agg(jsonb_build_object('front', 'Review card ' || i, 'back', 'Answer ' || i, 'subject', 'Science'))
    from generate_series(1, 10) i
  ));
  if (v_add->>'added')::int <> 10 then
    raise exception 'expected 10 more cards, got %', v_add;
  end if;

  for v_card in
    select id from public.study_flashcards
    where user_id = v_s1 and front like 'Review card %'
    order by front
  loop
    perform public.study_review_flashcard(v_card, 4);
  end loop;

  v_reward := public.claim_flashcard_reward();
  if not (v_reward->>'awarded')::boolean or (v_reward->>'points')::int <> 15 then
    raise exception 'expected 15 point flashcard reward, got %', v_reward;
  end if;
  v_reward := public.claim_flashcard_reward();
  if (v_reward->>'awarded')::boolean or v_reward->>'reason' <> 'already_claimed' then
    raise exception 'second reward claim should be blocked, got %', v_reward;
  end if;

  -- Teacher-approved deck seeds into the student's own deck once.
  v_add := public.study_seed_flashcards(v_flashcard_set);
  if (v_add->>'added')::int <> 2 then
    raise exception 'expected 2 seeded cards, got %', v_add;
  end if;
  v_add := public.study_seed_flashcards(v_flashcard_set);
  if (v_add->>'added')::int <> 0 then
    raise exception 'seeded cards should be idempotent, got %', v_add;
  end if;

  -- ---------- Practice and mastery ----------
  v_practice_result := public.study_record_practice_answer(v_practice, 0, 0);
  if not (v_practice_result->>'recorded')::boolean or not (v_practice_result->>'is_correct')::boolean then
    raise exception 'correct practice answer was not recorded, got %', v_practice_result;
  end if;
  v_practice_result := public.study_record_practice_answer(v_practice, 0, 2);
  if (v_practice_result->>'recorded')::boolean then
    raise exception 'same question cannot be recorded twice in one day, got %', v_practice_result;
  end if;
  perform public.study_record_practice_answer(v_practice, 1, 1);

  select count(*) into v_count
  from public.study_practice_attempts
  where user_id = v_s1 and resource_id = v_practice;
  if v_count <> 2 then
    raise exception 'expected 2 stored practice attempts, got %', v_count;
  end if;

  v_mastery := public.study_mastery_summary('10');
  if jsonb_array_length(v_mastery->'chapters') < 1 then
    raise exception 'mastery summary returned no chapters: %', v_mastery;
  end if;
  if (v_mastery->'chapters'->0->>'attempts')::int < 2 then
    raise exception 'mastery attempts were not aggregated: %', v_mastery;
  end if;

  -- ---------- Checkpoint ----------
  select points into v_points from public.profiles where id = v_s1;
  v_checkpoint_result := public.study_chapter_checkpoint(v_checkpoint, '[0,1]'::jsonb);
  if not (v_checkpoint_result->>'passed')::boolean or (v_checkpoint_result->>'score')::int <> 100 then
    raise exception 'checkpoint should pass at 100, got %', v_checkpoint_result;
  end if;
  if (v_checkpoint_result->>'awarded')::int <> 25 then
    raise exception 'first checkpoint pass should award 25, got %', v_checkpoint_result;
  end if;
  if (select points from public.profiles where id = v_s1) <> v_points + 25 then
    raise exception 'checkpoint points were not added to the profile';
  end if;

  v_checkpoint_result := public.study_chapter_checkpoint(v_checkpoint, '[0,1]'::jsonb);
  if (v_checkpoint_result->>'awarded')::int <> 0 then
    raise exception 'checkpoint must not award twice, got %', v_checkpoint_result;
  end if;
  if (select best_score from public.study_chapter_mastery
      where user_id = v_s1 and class_number = '10' and subject = 'Mathematics' and chapter_title = 'Real Numbers') <> 100 then
    raise exception 'checkpoint best score was not stored';
  end if;

  -- ---------- Mock test ----------
  v_start := public.study_mock_start(v_mock);
  v_attempt := (v_start->>'attempt_id')::uuid;
  if v_start->'paper'->'sections'->0->'questions'->0 ? 'correct_index' then
    raise exception 'mock start leaked correct_index to the client';
  end if;
  if (v_start->'paper'->>'duration_minutes')::int <> 30 then
    raise exception 'mock duration was not preserved: %', v_start;
  end if;

  v_mock_result := public.study_mock_submit(v_attempt, '{"0-0":0,"0-1":0}'::jsonb);
  if (v_mock_result->>'score')::int <> 1 or (v_mock_result->>'max_score')::int <> 2 then
    raise exception 'mock grading should be 1/2, got %', v_mock_result;
  end if;
  if (v_mock_result->>'percent')::int <> 50 then
    raise exception 'mock percent should be 50, got %', v_mock_result;
  end if;

  begin
    perform public.study_mock_submit(v_attempt, '{"0-0":0,"0-1":1}'::jsonb);
    raise exception 'expected mock resubmit to be blocked';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%already submitted%' then raise; end if;
  end;

  -- ---------- Weekly goals and My Day ----------
  v_week := public.study_set_weekly_goal('Mathematics', 2, 10, 60);
  if v_week->>'subject' <> 'Mathematics' then
    raise exception 'weekly goal was not saved: %', v_week;
  end if;

  v_week := public.study_week_progress();
  if jsonb_array_length(v_week->'goals') < 1 then
    raise exception 'weekly progress lost the goal: %', v_week;
  end if;
  if (v_week->'actuals'->>'practice')::int < 4 then
    raise exception 'weekly practice actual should include attempts and checkpoints: %', v_week;
  end if;

  v_today := public.student_today();
  if jsonb_array_length(v_today->'items') = 0 then
    raise exception 'My Day returned no items even with a due exam and cards: %', v_today;
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_today->'items') item where item->>'kind' = 'exam'
  ) then
    raise exception 'My Day did not include the upcoming exam: %', v_today;
  end if;

  v_report := public.student_learning_report(current_date - 30, current_date);
  if (v_report->>'practice_attempts')::int < 4 then
    raise exception 'learning report missed practice attempts: %', v_report;
  end if;
  if (v_report->>'flashcards_practised')::int < 11 then
    raise exception 'learning report missed flashcard reviews: %', v_report;
  end if;

  perform public.study_log_event('test_event', 'feature', 'learning-test', '{"ok":true}'::jsonb);
  if not exists (
    select 1 from public.learning_events where user_id = v_s1 and event = 'test_event'
  ) then
    raise exception 'study_log_event did not record an event';
  end if;

  -- ---------- Student isolation ----------
  perform pg_temp.learning_login(v_s2);
  begin
    perform public.study_review_flashcard(v_card, 3);
    raise exception 'expected cross-student flashcard review to fail';
  exception when others then
    get stacked diagnostics v_msg = message_text;
    if v_msg not like '%Flashcard not found%' then raise; end if;
  end;

  begin
    execute 'set local role authenticated';
    perform pg_temp.learning_login(v_s2);
    select count(*) into v_count from public.study_flashcards where user_id = v_s1;
    if v_count <> 0 then
      raise exception 'student saw another student''s flashcards';
    end if;
    select count(*) into v_count from public.study_practice_attempts where user_id = v_s1;
    if v_count <> 0 then
      raise exception 'student saw another student''s practice attempts';
    end if;
    select count(*) into v_count from public.study_mock_attempts where user_id = v_s1;
    if v_count <> 0 then
      raise exception 'student saw another student''s mock attempts';
    end if;
    select count(*) into v_count from public.exam_schedule where class_number = '9';
    if v_count <> 0 then
      raise exception 'Class 10 student saw a Class 9 exam';
    end if;
    select count(*) into v_count from public.exam_schedule where id = v_exam10;
    if v_count <> 1 then
      raise exception 'Class 10 student could not see their own exam';
    end if;
    execute 'reset role';
  exception when others then
    execute 'reset role';
    get stacked diagnostics v_msg = message_text;
    if v_msg like '%student saw%' or v_msg like '%could not see%' then raise; end if;
    raise notice 'SET ROLE authenticated skipped (%). RPC/table owner checks still ran.', v_msg;
  end;

  -- Exam countdown should be scoped to the student's class.
  v_today := public.student_exam_countdown();
  if v_today->'exam' is null or v_today->'exam'->>'subject' <> 'Mathematics' then
    raise exception 'exam countdown returned the wrong class: %', v_today;
  end if;
  if (v_today->'exam'->>'days_left')::int <> 5 then
    raise exception 'exam countdown days_left should be 5, got %', v_today;
  end if;

  raise notice 'study_learning_loop tests passed';
end;
$$;

-- ---------- Skills Lab ----------
do $$
declare
  v_admin uuid;
  v_student uuid;
  v_track uuid;
  v_lesson uuid;
  v_challenge uuid;
  v_result jsonb;
  v_points int;
begin
  v_admin := pg_temp.learning_make_user('skills-admin@example.invalid', 'admin');
  v_student := pg_temp.learning_make_user('skills-student@example.invalid', 'student', '9');

  insert into public.skill_tracks (slug, title, summary, icon, min_class, max_class, published)
  values ('test-track', 'Test track', 'A test track', 'Code2', '6', '12', true)
  returning id into v_track;

  insert into public.skill_lessons (track_id, slug, title, content_md, est_minutes, published)
  values (
    v_track, 'test-lesson', 'Test lesson',
    'This is a test lesson body that is definitely longer than twenty characters.',
    5, true
  ) returning id into v_lesson;

  insert into public.skill_challenges (lesson_id, title, prompt_md, starter_code, language, published)
  values (
    v_lesson, 'Test challenge',
    'Write a function that returns the number 1.', 'function answer() {}', 'javascript', true
  ) returning id into v_challenge;

  perform pg_temp.learning_login(v_student);
  v_points := (select points from public.profiles where id = v_student);

  v_result := public.skill_complete_lesson(v_lesson);
  if (v_result->>'awarded')::int <> 5 then
    raise exception 'first lesson completion should award 5, got %', v_result;
  end if;
  v_result := public.skill_complete_lesson(v_lesson);
  if (v_result->>'awarded')::int <> 0 or not (v_result->>'already_completed')::boolean then
    raise exception 'repeat lesson completion must not award points, got %', v_result;
  end if;
  if (select points from public.profiles where id = v_student) <> v_points + 5 then
    raise exception 'lesson points were not added to the profile';
  end if;

  v_result := public.skill_submit_challenge(v_challenge, 'function answer() { return 1; }', true, '');
  if (v_result->>'awarded')::int <> 5 then
    raise exception 'first challenge submission should award 5, got %', v_result;
  end if;
  v_result := public.skill_submit_challenge(v_challenge, 'function answer() { return 1; }', true, '');
  if (v_result->>'awarded')::int <> 0 then
    raise exception 'repeat challenge submission must not award points, got %', v_result;
  end if;
  if (select points from public.profiles where id = v_student) <> v_points + 10 then
    raise exception 'challenge points were not added exactly once';
  end if;

  raise notice 'study skills tests passed';
end;
$$;

rollback;
