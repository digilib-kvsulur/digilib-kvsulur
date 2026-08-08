-- Insert the remaining developed games if they do not exist
INSERT INTO public.games (key, name, description, icon_name, category, points_per_win, max_points_per_day, daily_play_limit, sort_order) VALUES
  ('reading-wordle', 'Reading Wordle', 'Guess the 5-letter book-related word in 6 tries.', 'Sparkles', 'word', 10, 40, 5, 7),
  ('book-hangman', 'Book Hangman', 'Guess the letters to solve the secret book title or literary word.', 'Gamepad2', 'word', 8, 40, 5, 8),
  ('spell-bee', 'Spell Bee', 'Listen to or read a hint and spell the library term correctly.', 'Trophy', 'word', 10, 30, 3, 9),
  ('word-chain', 'Word Chain', 'Build a chain of words where each starts with the last letter of the previous.', 'Shuffle', 'word', 10, 40, 5, 10),
  ('word-search', 'Word Search', 'Find hidden library and literary words in the puzzle grid.', 'Grid3x3', 'word', 12, 36, 4, 11),
  ('speed-typing', 'Speed Typing', 'Test your words-per-minute rate by typing literary quotes.', 'Zap', 'speed', 10, 40, 5, 12),
  ('quick-draw', 'Quick Draw', 'Draw and sketch the given book themed prompt before time runs out.', 'Sparkles', 'creative', 15, 30, 3, 13),
  ('spot-difference', 'Spot the Difference', 'Compare book cover images or patterns and find the odd one.', 'Layers', 'puzzle', 8, 40, 5, 14),
  ('riddle-rounds', 'Riddle Rounds', 'Solve clever riddles about popular library books and authors.', 'Gamepad2', 'puzzle', 12, 36, 4, 15),
  ('literary-places', 'Literary Places', 'Trivia challenge: Guess the book setting, country or location.', 'Layers', 'trivia', 15, 30, 3, 16),
  ('reaction-test', 'Reaction Test', 'Click as fast as you can when the screen changes color.', 'Zap', 'reflex', 8, 40, 5, 17)
ON CONFLICT (key) DO NOTHING;
