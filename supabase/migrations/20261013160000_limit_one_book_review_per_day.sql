-- Limit book reviews to at most 1 per day per user
CREATE OR REPLACE FUNCTION public.tg_validate_book_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_text text := btrim(coalesce(NEW.review_text,''));
  v_count int;
  v_words int;
  v_unique_words int;
BEGIN
  IF public.is_staff_or_admin(auth.uid()) AND auth.uid() IS DISTINCT FROM NEW.user_id THEN
    RETURN NEW;
  END IF;
  IF length(v_text) < 400 THEN
    RAISE EXCEPTION 'Review must be at least 400 characters long.';
  END IF;
  -- spam checks: repeated characters, too few distinct words
  IF v_text ~ '(.)\1{6,}' THEN
    RAISE EXCEPTION 'Review looks like spam (repeated characters). Please write genuine thoughts.';
  END IF;
  SELECT count(*), count(DISTINCT lower(w)) INTO v_words, v_unique_words
  FROM regexp_split_to_table(v_text, '\s+') w WHERE length(w) > 0;
  IF v_words < 60 OR v_unique_words < 35 OR v_unique_words::numeric / GREATEST(v_words,1) < 0.4 THEN
    RAISE EXCEPTION 'Review looks repetitive. Please write a genuine review in your own words.';
  END IF;
  -- no copy-pasting the same text across reviews
  IF EXISTS (SELECT 1 FROM public.book_reviews
             WHERE id IS DISTINCT FROM NEW.id
               AND lower(regexp_replace(review_text,'\s+','','g')) = lower(regexp_replace(v_text,'\s+','','g'))) THEN
    RAISE EXCEPTION 'This review text has already been used. Please write an original review.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_count FROM public.book_reviews
    WHERE user_id = NEW.user_id AND created_at >= date_trunc('day', now());
    IF v_count >= 1 THEN
      RAISE EXCEPTION 'You can post at most 1 book review per day. Try again tomorrow.';
    END IF;
  END IF;
  NEW.review_text := v_text;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_book_review ON public.book_reviews;
CREATE TRIGGER trg_validate_book_review BEFORE INSERT OR UPDATE OF review_text ON public.book_reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_validate_book_review();

REVOKE EXECUTE ON FUNCTION public.tg_validate_book_review() FROM public, anon, authenticated;
