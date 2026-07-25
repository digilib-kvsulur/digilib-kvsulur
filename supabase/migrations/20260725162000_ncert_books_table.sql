-- Create NCERT Books table
CREATE TABLE public.ncert_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  book_name TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_number INT,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ncert_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view ncert books"
ON public.ncert_books FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and teachers can insert ncert books"
ON public.ncert_books FOR INSERT TO authenticated
WITH CHECK (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can update ncert books"
ON public.ncert_books FOR UPDATE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

CREATE POLICY "Admins and teachers can delete ncert books"
ON public.ncert_books FOR DELETE TO authenticated
USING (get_profile_role(auth.uid()) IN ('admin', 'teacher'));

-- Seed some initial NCERT Book chapters
INSERT INTO public.ncert_books (class_number, subject, book_name, chapter_title, chapter_number, file_url) VALUES
('6', 'Mathematics', 'Mathematics – Class 6', 'Chapter 1 – Knowing Our Numbers', 1, 'https://ncert.nic.in/textbook/pdf/femh101.pdf'),
('6', 'Mathematics', 'Mathematics – Class 6', 'Chapter 2 – Whole Numbers', 2, 'https://ncert.nic.in/textbook/pdf/femh102.pdf'),
('6', 'Science', 'Science – Class 6', 'Chapter 1 – Food: Where Does It Come From?', 1, 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'),
('6', 'Science', 'Science – Class 6', 'Chapter 2 – Components of Food', 2, 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 1 – Integers', 1, 'https://ncert.nic.in/textbook/pdf/gemh101.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 1 – Nutrition in Plants', 1, 'https://ncert.nic.in/textbook/pdf/gesc101.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 1 – Rational Numbers', 1, 'https://ncert.nic.in/textbook/pdf/hemh101.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 1 – Crop Production and Management', 1, 'https://ncert.nic.in/textbook/pdf/hesc101.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 1 – Number Systems', 1, 'https://ncert.nic.in/textbook/pdf/iemh101.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 1 – Matter in Our Surroundings', 1, 'https://ncert.nic.in/textbook/pdf/iesc101.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 1 – Real Numbers', 1, 'https://ncert.nic.in/textbook/pdf/jemh101.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 1 – Chemical Reactions and Equations', 1, 'https://ncert.nic.in/textbook/pdf/jesc101.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 1 – Sets', 1, 'https://ncert.nic.in/textbook/pdf/kemh101.pdf'),
('11', 'Physics', 'Physics Part I & II – Class 11', 'Chapter 1 – Physical World', 1, 'https://ncert.nic.in/textbook/pdf/keph101.pdf'),
('12', 'Mathematics', 'Mathematics Part I & II – Class 12', 'Chapter 1 – Relations and Functions', 1, 'https://ncert.nic.in/textbook/pdf/lemh101.pdf'),
('12', 'Physics', 'Physics Part I & II – Class 12', 'Chapter 1 – Electric Charges and Fields', 1, 'https://ncert.nic.in/textbook/pdf/leph101.pdf');
