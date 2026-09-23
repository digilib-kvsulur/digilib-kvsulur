-- ============================================================
-- 1. Enforce review_text is required for review points
--    The DB trigger now only awards points if review_text is 
--    non-null AND has at least 20 characters after trimming.
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_review_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pts integer := 15;
BEGIN
  -- Only award points if the student wrote an actual text review
  IF NEW.review_text IS NULL OR length(trim(NEW.review_text)) < 20 THEN
    RETURN NEW; -- no points for star-only reviews
  END IF;

  BEGIN
    SELECT COALESCE((value #>> '{}')::integer, (value)::text::integer, 15)
    INTO v_pts FROM public.system_settings WHERE key = 'points_per_review';
  EXCEPTION WHEN OTHERS THEN
    v_pts := 15;
  END;
  v_pts := COALESCE(v_pts, 15);

  IF v_pts > 0 THEN
    UPDATE public.profiles
    SET points = COALESCE(points, 0) + v_pts
    WHERE id = NEW.user_id;
    PERFORM public.notify_user(
      NEW.user_id,
      'Review points awarded',
      format('Thanks for your written book review! +%s XP added.', v_pts),
      'points'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Re-attach the trigger (it already exists but we replaced the function)
DROP TRIGGER IF EXISTS trg_award_review_points ON public.book_reviews;
CREATE TRIGGER trg_award_review_points
  AFTER INSERT ON public.book_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.award_review_points();


-- ============================================================
-- 2. Seed new riddle game content
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('riddle-rounds','riddle','I hold hundreds of stories without saying a single word, and you must return me or face a fine. What am I?','You borrow me','{"answer":"Library Book"}'),
  ('riddle-rounds','riddle','I have a spine, but I cannot feel pain. I have chapters, but no house. What am I?','A work of fiction','{"answer":"Novel"}'),
  ('riddle-rounds','riddle','I am the first page that tells you the title, the author and the year. What am I?','Front of the book','{"answer":"Title Page"}'),
  ('riddle-rounds','riddle','I list every topic in a book from A to Z at the very back. What am I?','Alphabetical list','{"answer":"Index"}'),
  ('riddle-rounds','riddle','I come before chapter one and set the scene. Authors write me to welcome readers. What am I?','Introduction of a book','{"answer":"Prologue"}'),
  ('riddle-rounds','riddle','I am the force that pulls you to the ground and keeps planets in orbit. What am I?','Newton discovered me','{"answer":"Gravity"}'),
  ('riddle-rounds','riddle','I am made of hydrogen and oxygen. Every living thing needs me. What am I?','H₂O','{"answer":"Water"}'),
  ('riddle-rounds','riddle','Plants make their food using me, water, and sunlight. What process am I?','Green leaves do this','{"answer":"Photosynthesis"}'),
  ('riddle-rounds','riddle','I am the smallest unit of life. Every living organism is made of me. What am I?','Seen under a microscope','{"answer":"Cell"}'),
  ('riddle-rounds','riddle','What has hands but cannot clap?','It tells the time','{"answer":"Clock"}'),
  ('riddle-rounds','riddle','What can you catch but not throw?','You sneeze when you have it','{"answer":"Cold"}'),
  ('riddle-rounds','riddle','I have a head and a tail but no body. What am I?','Currency','{"answer":"Coin"}'),
  ('riddle-rounds','riddle','The more you share me, the more I grow. What am I?','Gained from books','{"answer":"Knowledge"}'),
  ('riddle-rounds','riddle','I run all day and never walk. I have a mouth but never talk. What am I?','Flows to the ocean','{"answer":"River"}'),
  ('riddle-rounds','riddle','What word becomes shorter when you add two letters to it?','Think about the word itself','{"answer":"Short"}'),
  ('riddle-rounds','riddle','What invention lets you look right through a wall?','Found in buildings','{"answer":"Window"}'),
  ('riddle-rounds','riddle','I orbit the Earth, reflect sunlight at night, and cause the tides. What am I?','Earth natural satellite','{"answer":"Moon"}'),
  ('riddle-rounds','riddle','What has an eye but cannot see?','Used for sewing','{"answer":"Needle"}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. Seed literary places content
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('literary-places','place','Hogwarts','School of witchcraft and wizardry','{"answer":"Harry Potter"}'),
  ('literary-places','place','Malgudi','A fictional South Indian town','{"answer":"R. K. Narayan"}'),
  ('literary-places','place','Neverland','Where children never grow old','{"answer":"Peter Pan"}'),
  ('literary-places','place','Wonderland','Down the rabbit hole','{"answer":"Alice in Wonderland"}'),
  ('literary-places','place','Narnia','Through the wardrobe','{"answer":"C.S. Lewis"}'),
  ('literary-places','place','Middle-earth','Home of hobbits and elves','{"answer":"J.R.R. Tolkien"}'),
  ('literary-places','place','Hastinapur','Kingdom of the Pandavas','{"answer":"Mahabharata"}'),
  ('literary-places','place','Lanka','Kingdom of Ravana','{"answer":"Ramayana"}'),
  ('literary-places','place','Oceania','A dystopian state','{"answer":"George Orwell"}'),
  ('literary-places','place','Treasure Island','Where pirates hide their gold','{"answer":"Robert Louis Stevenson"}'),
  ('literary-places','place','Lilliput','Land of tiny people','{"answer":"Jonathan Swift"}'),
  ('literary-places','place','Baker Street','221B is the famous address','{"answer":"Sherlock Holmes"}'),
  ('literary-places','place','Verona','City of star-crossed lovers','{"answer":"Romeo and Juliet"}'),
  ('literary-places','place','Transylvania','Home of the famous vampire','{"answer":"Dracula"}'),
  ('literary-places','place','Pemberley','Mr. Darcy''s estate','{"answer":"Jane Austen"}')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 4. Seed word content for various games
-- ============================================================
INSERT INTO public.game_content (game_key, kind, value, hint, extra) VALUES
  ('reading-wordle','word','FABLE','A short moral story','{}'),
  ('reading-wordle','word','GENRE','Category of books','{}'),
  ('reading-wordle','word','PROSE','Non-verse writing','{}'),
  ('reading-wordle','word','THEME','Central idea of a story','{}'),
  ('reading-wordle','word','VERSE','Poetic lines','{}'),
  ('reading-wordle','word','IRONY','Saying the opposite of what you mean','{}'),
  ('reading-wordle','word','SIMILE','Comparison using like or as','{}'),
  ('reading-wordle','word','ATLAS','Book of maps','{}'),
  ('reading-wordle','word','DRAFT','Early version of writing','{}'),
  ('reading-wordle','word','QUOTE','Exact words from a text','{}'),
  ('word-scramble','word','ALLEGORY','A story with a hidden meaning','{}'  ),
  ('word-scramble','word','PROLOGUE','Introduction before chapter one','{}'),
  ('word-scramble','word','EPILOGUE','Closing section of a book','{}'),
  ('word-scramble','word','NARRATIVE','A story or account','{}'),
  ('word-scramble','word','BIOGRAPHY','Life story of a real person','{}'),
  ('word-scramble','word','ANTHOLOGY','Collection of literary works','{}'),
  ('word-scramble','word','SUSPENSE','Excited uncertainty in a story','{}'),
  ('word-scramble','word','CONFLICT','Struggle between opposing forces','{}'),
  ('word-search','word','NOVEL','Long work of fiction','{}'),
  ('word-search','word','POEM','Verse composition','{}'),
  ('word-search','word','SHELF','Where books rest','{}'),
  ('word-search','word','AUTHOR','Writer of a book','{}'),
  ('word-search','word','INDEX','Alphabetical list at back','{}'),
  ('word-search','word','STORY','Narrative account','{}'),
  ('word-search','word','FABLE','Short moral tale','{}'),
  ('word-search','word','GENRE','Book category','{}'),
  ('word-search','word','ATLAS','Book of maps','{}'),
  ('word-search','word','THEME','Central idea','{}'),
  ('word-search','word','IRONY','Saying opposite','{}'),
  ('spell-bee','word','RHYTHM','Repeated pattern in music or verse','{}'),
  ('spell-bee','word','CATALOGUE','Complete list of items','{}'),
  ('spell-bee','word','LITERATURE','Written works of lasting value','{}'),
  ('spell-bee','word','OCCASION','A particular event or time','{}'),
  ('spell-bee','word','NECESSARY','Essential; required','{}'),
  ('spell-bee','word','BEAUTIFUL','Pleasing to the senses','{}'),
  ('spell-bee','word','EXAGGERATE','To overstate something','{}'),
  ('spell-bee','word','PRIVILEGE','A special right or advantage','{}'),
  ('spell-bee','word','PHILOSOPHY','Study of fundamental questions','{}'),
  ('spell-bee','word','VOCABULARY','All the words a person knows','{}')
ON CONFLICT DO NOTHING;
