-- Insert new interactive games
INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('emoji-book-riddle', 'Emoji Book Riddle', 'Decode famous book titles and literary classics from playful emoji sequences.', 'Sparkles', 'puzzle', 12, 36, 4, 18),
  ('quote-guesser', 'Quote Detective', 'Identify which famous book or legendary author spoke memorable quotes.', 'Trophy', 'trivia', 15, 45, 4, 19),
  ('genre-detective', 'Genre Sorting Rush', 'Rapidly categorize incoming library books into the right shelves and genres.', 'Layers', 'speed', 12, 36, 5, 20),
  ('spine-stacker', 'Book Shelf Stacker', 'Precision timing arcade game to stack books into a towering library pile.', 'Gamepad2', 'reflex', 15, 45, 5, 21),
  ('book-2048', 'Reader''s 2048', 'Merge matching literary steps: Letter → Word → Page → Chapter → Masterpiece!', 'Grid2x2', 'puzzle', 20, 40, 3, 22),
  ('story-sequence', 'Story Chrono', 'Rearrange scrambled plot milestones of beloved tales into the correct chronological order.', 'Shuffle', 'puzzle', 15, 30, 3, 23),
  ('character-clash', 'Character Pair-Up', 'Connect legendary literary characters with their partners, sidekicks, and rivals.', 'Users', 'memory', 10, 40, 5, 24)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  category = EXCLUDED.category,
  points_per_win = EXCLUDED.points_per_win,
  max_points_per_day = EXCLUDED.max_points_per_day,
  daily_play_limit = EXCLUDED.daily_play_limit,
  sort_order = EXCLUDED.sort_order;
