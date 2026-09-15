-- Migration: Refresh and Reseed NCERT Books Vault with Official Verified Chapters
-- Deletes corrupt/legacy records and populates authentic textbook chapters from Class 1 to 12

DELETE FROM public.ncert_books;

INSERT INTO public.ncert_books (class_number, subject, book_name, chapter_title, chapter_number, file_url) VALUES
-- Class 1
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 1 – Finding The Furry Cat (Shapes and Space)', 1, 'https://ncert.nic.in/textbook/pdf/aemh101.pdf'),
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 2 – What is Long? What is Round?', 2, 'https://ncert.nic.in/textbook/pdf/aemh102.pdf'),
('1', 'Mathematics', 'Joyful Mathematics – Class 1', 'Chapter 3 – Mango Treat (Numbers 1 to 9)', 3, 'https://ncert.nic.in/textbook/pdf/aemh103.pdf'),
('1', 'English', 'Mridang – Class 1', 'Unit 1 – My Family and Me', 1, 'https://ncert.nic.in/textbook/pdf/aeen101.pdf'),
('1', 'Hindi', 'Sarangi – Class 1', 'पाठ 1 – परिवार (कविता)', 1, 'https://ncert.nic.in/textbook/pdf/ahhn101.pdf'),

-- Class 2
('2', 'Mathematics', 'Joyful Mathematics – Class 2', 'Chapter 1 – A Day at the Beach', 1, 'https://ncert.nic.in/textbook/pdf/bemh101.pdf'),
('2', 'Mathematics', 'Joyful Mathematics – Class 2', 'Chapter 2 – Shapes Around Us', 2, 'https://ncert.nic.in/textbook/pdf/bemh102.pdf'),
('2', 'English', 'Mridang – Class 2', 'Unit 1 – My Bicycle', 1, 'https://ncert.nic.in/textbook/pdf/been101.pdf'),
('2', 'Hindi', 'Sarangi – Class 2', 'पाठ 1 – नीम की सीख', 1, 'https://ncert.nic.in/textbook/pdf/bhhn101.pdf'),

-- Class 3
('3', 'Mathematics', 'Math-Magic – Class 3', 'Chapter 1 – Where to Look From', 1, 'https://ncert.nic.in/textbook/pdf/cemh101.pdf'),
('3', 'Mathematics', 'Math-Magic – Class 3', 'Chapter 2 – Fun with Numbers', 2, 'https://ncert.nic.in/textbook/pdf/cemh102.pdf'),
('3', 'Environmental Science', 'Looking Around – Class 3', 'Chapter 1 – Poonam Day Out', 1, 'https://ncert.nic.in/textbook/pdf/ceev101.pdf'),
('3', 'English', 'Santoor – Class 3', 'Unit 1 – Colours', 1, 'https://ncert.nic.in/textbook/pdf/ceen101.pdf'),
('3', 'Hindi', 'Veena – Class 3', 'पाठ 1 – सीखो', 1, 'https://ncert.nic.in/textbook/pdf/chhn101.pdf'),

-- Class 4
('4', 'Mathematics', 'Math-Magic – Class 4', 'Chapter 1 – Building with Bricks', 1, 'https://ncert.nic.in/textbook/pdf/demh101.pdf'),
('4', 'Mathematics', 'Math-Magic – Class 4', 'Chapter 2 – Long and Short', 2, 'https://ncert.nic.in/textbook/pdf/demh102.pdf'),
('4', 'Environmental Science', 'Looking Around – Class 4', 'Chapter 1 – Going to School', 1, 'https://ncert.nic.in/textbook/pdf/deev101.pdf'),
('4', 'English', 'Marigold – Class 4', 'Unit 1 – Wake Up! & Neha Alarm Clock', 1, 'https://ncert.nic.in/textbook/pdf/deen101.pdf'),

-- Class 5
('5', 'Mathematics', 'Math-Magic – Class 5', 'Chapter 1 – The Fish Tale', 1, 'https://ncert.nic.in/textbook/pdf/eemh101.pdf'),
('5', 'Mathematics', 'Math-Magic – Class 5', 'Chapter 2 – Shapes and Angles', 2, 'https://ncert.nic.in/textbook/pdf/eemh102.pdf'),
('5', 'Environmental Science', 'Looking Around – Class 5', 'Chapter 1 – Super Senses', 1, 'https://ncert.nic.in/textbook/pdf/eeev101.pdf'),
('5', 'English', 'Marigold – Class 5', 'Unit 1 – Ice-cream Man', 1, 'https://ncert.nic.in/textbook/pdf/eeen101.pdf'),

-- Class 6
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 1 – Patterns in Mathematics', 1, 'https://ncert.nic.in/textbook/pdf/femh101.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 2 – Lines and Angles', 2, 'https://ncert.nic.in/textbook/pdf/femh102.pdf'),
('6', 'Mathematics', 'Ganita Prakash – Class 6', 'Chapter 3 – Number Play', 3, 'https://ncert.nic.in/textbook/pdf/femh103.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 1 – The Wonderful World of Science', 1, 'https://ncert.nic.in/textbook/pdf/fesc101.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 2 – Diversity in the Living World', 2, 'https://ncert.nic.in/textbook/pdf/fesc102.pdf'),
('6', 'Science', 'Curiosity – Class 6', 'Chapter 3 – Mindful Eating: A Path to a Healthy Body', 3, 'https://ncert.nic.in/textbook/pdf/fesc103.pdf'),
('6', 'Social Science', 'Exploring Society: India and Beyond – Class 6', 'Chapter 1 – Locating Places on the Earth', 1, 'https://ncert.nic.in/textbook/pdf/fess101.pdf'),
('6', 'English', 'Poorvi – Class 6', 'Unit 1 – Fables and Folk Tales', 1, 'https://ncert.nic.in/textbook/pdf/feen101.pdf'),
('6', 'Hindi', 'Malhar – Class 6', 'पाठ 1 – मातृभूमि (कविता)', 1, 'https://ncert.nic.in/textbook/pdf/fhhn101.pdf'),

-- Class 7
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 1 – Integers', 1, 'https://ncert.nic.in/textbook/pdf/gemh101.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 2 – Fractions and Decimals', 2, 'https://ncert.nic.in/textbook/pdf/gemh102.pdf'),
('7', 'Mathematics', 'Mathematics – Class 7', 'Chapter 3 – Data Handling', 3, 'https://ncert.nic.in/textbook/pdf/gemh103.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 1 – Nutrition in Plants', 1, 'https://ncert.nic.in/textbook/pdf/gesc101.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 2 – Nutrition in Animals', 2, 'https://ncert.nic.in/textbook/pdf/gesc102.pdf'),
('7', 'Science', 'Science – Class 7', 'Chapter 3 – Heat', 3, 'https://ncert.nic.in/textbook/pdf/gesc103.pdf'),
('7', 'Social Science', 'Our Pasts II – Class 7', 'Chapter 1 – Tracing Changes Through a Thousand Years', 1, 'https://ncert.nic.in/textbook/pdf/gess101.pdf'),
('7', 'English', 'Honeycomb – Class 7', 'Unit 1 – Three Questions', 1, 'https://ncert.nic.in/textbook/pdf/gehn101.pdf'),

-- Class 8
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 1 – Rational Numbers', 1, 'https://ncert.nic.in/textbook/pdf/hemh101.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 2 – Linear Equations in One Variable', 2, 'https://ncert.nic.in/textbook/pdf/hemh102.pdf'),
('8', 'Mathematics', 'Mathematics – Class 8', 'Chapter 3 – Understanding Quadrilaterals', 3, 'https://ncert.nic.in/textbook/pdf/hemh103.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 1 – Crop Production and Management', 1, 'https://ncert.nic.in/textbook/pdf/hesc101.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 2 – Microorganisms: Friend and Foe', 2, 'https://ncert.nic.in/textbook/pdf/hesc102.pdf'),
('8', 'Science', 'Science – Class 8', 'Chapter 3 – Coal and Petroleum', 3, 'https://ncert.nic.in/textbook/pdf/hesc103.pdf'),
('8', 'Social Science', 'Our Pasts III – Class 8', 'Chapter 1 – How, When and Where', 1, 'https://ncert.nic.in/textbook/pdf/hess101.pdf'),
('8', 'English', 'Honeydew – Class 8', 'Unit 1 – The Best Christmas Present in the World', 1, 'https://ncert.nic.in/textbook/pdf/hehd101.pdf'),

-- Class 9
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 1 – Number Systems', 1, 'https://ncert.nic.in/textbook/pdf/iemh101.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/iemh102.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 3 – Coordinate Geometry', 3, 'https://ncert.nic.in/textbook/pdf/iemh103.pdf'),
('9', 'Mathematics', 'Mathematics – Class 9', 'Chapter 4 – Linear Equations in Two Variables', 4, 'https://ncert.nic.in/textbook/pdf/iemh104.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 1 – Matter in Our Surroundings', 1, 'https://ncert.nic.in/textbook/pdf/iesc101.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 2 – Is Matter Around Us Pure', 2, 'https://ncert.nic.in/textbook/pdf/iesc102.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 5 – The Fundamental Unit of Life', 5, 'https://ncert.nic.in/textbook/pdf/iesc105.pdf'),
('9', 'Science', 'Science – Class 9', 'Chapter 7 – Motion', 7, 'https://ncert.nic.in/textbook/pdf/iesc107.pdf'),
('9', 'Social Science', 'India and the Contemporary World I – Class 9', 'Chapter 1 – The French Revolution', 1, 'https://ncert.nic.in/textbook/pdf/iess101.pdf'),
('9', 'Social Science', 'Democratic Politics I – Class 9', 'Chapter 1 – What is Democracy? Why Democracy?', 1, 'https://ncert.nic.in/textbook/pdf/iess401.pdf'),
('9', 'English', 'Beehive – Class 9', 'Chapter 1 – The Fun They Had', 1, 'https://ncert.nic.in/textbook/pdf/iebe101.pdf'),

-- Class 10
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 1 – Real Numbers', 1, 'https://ncert.nic.in/textbook/pdf/jemh101.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 2 – Polynomials', 2, 'https://ncert.nic.in/textbook/pdf/jemh102.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 3 – Pair of Linear Equations in Two Variables', 3, 'https://ncert.nic.in/textbook/pdf/jemh103.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 4 – Quadratic Equations', 4, 'https://ncert.nic.in/textbook/pdf/jemh104.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 6 – Triangles', 6, 'https://ncert.nic.in/textbook/pdf/jemh106.pdf'),
('10', 'Mathematics', 'Mathematics – Class 10', 'Chapter 8 – Introduction to Trigonometry', 8, 'https://ncert.nic.in/textbook/pdf/jemh108.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 1 – Chemical Reactions and Equations', 1, 'https://ncert.nic.in/textbook/pdf/jesc101.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 2 – Acids, Bases and Salts', 2, 'https://ncert.nic.in/textbook/pdf/jesc102.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 3 – Metals and Non-metals', 3, 'https://ncert.nic.in/textbook/pdf/jesc103.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 5 – Life Processes', 5, 'https://ncert.nic.in/textbook/pdf/jesc105.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 9 – Light – Reflection and Refraction', 9, 'https://ncert.nic.in/textbook/pdf/jesc109.pdf'),
('10', 'Science', 'Science – Class 10', 'Chapter 11 – Electricity', 11, 'https://ncert.nic.in/textbook/pdf/jesc111.pdf'),
('10', 'Social Science', 'India and the Contemporary World II – Class 10', 'Chapter 1 – The Rise of Nationalism in Europe', 1, 'https://ncert.nic.in/textbook/pdf/jess101.pdf'),
('10', 'English', 'First Flight – Class 10', 'Chapter 1 – A Letter to God', 1, 'https://ncert.nic.in/textbook/pdf/jeff101.pdf'),

-- Class 11
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 1 – Sets', 1, 'https://ncert.nic.in/textbook/pdf/kemh101.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 2 – Relations and Functions', 2, 'https://ncert.nic.in/textbook/pdf/kemh102.pdf'),
('11', 'Mathematics', 'Mathematics – Class 11', 'Chapter 3 – Trigonometric Functions', 3, 'https://ncert.nic.in/textbook/pdf/kemh103.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 1 – Units and Measurements', 1, 'https://ncert.nic.in/textbook/pdf/keph101.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 2 – Motion in a Straight Line', 2, 'https://ncert.nic.in/textbook/pdf/keph102.pdf'),
('11', 'Physics', 'Physics Part I – Class 11', 'Chapter 3 – Motion in a Plane', 3, 'https://ncert.nic.in/textbook/pdf/keph103.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 1 – Some Basic Concepts of Chemistry', 1, 'https://ncert.nic.in/textbook/pdf/kech101.pdf'),
('11', 'Chemistry', 'Chemistry Part I – Class 11', 'Chapter 2 – Structure of Atom', 2, 'https://ncert.nic.in/textbook/pdf/kech102.pdf'),
('11', 'Biology', 'Biology – Class 11', 'Chapter 1 – The Living World', 1, 'https://ncert.nic.in/textbook/pdf/kebo101.pdf'),
('11', 'Computer Science', 'Computer Science – Class 11', 'Chapter 1 – Computer System', 1, 'https://ncert.nic.in/textbook/pdf/kecs101.pdf'),

-- Class 12
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 1 – Relations and Functions', 1, 'https://ncert.nic.in/textbook/pdf/lemh101.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 2 – Inverse Trigonometric Functions', 2, 'https://ncert.nic.in/textbook/pdf/lemh102.pdf'),
('12', 'Mathematics', 'Mathematics Part I – Class 12', 'Chapter 3 – Matrices', 3, 'https://ncert.nic.in/textbook/pdf/lemh103.pdf'),
('12', 'Mathematics', 'Mathematics Part II – Class 12', 'Chapter 7 – Integrals', 7, 'https://ncert.nic.in/textbook/pdf/lemh201.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 1 – Electric Charges and Fields', 1, 'https://ncert.nic.in/textbook/pdf/leph101.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 2 – Electrostatic Potential and Capacitance', 2, 'https://ncert.nic.in/textbook/pdf/leph102.pdf'),
('12', 'Physics', 'Physics Part I – Class 12', 'Chapter 3 – Current Electricity', 3, 'https://ncert.nic.in/textbook/pdf/leph103.pdf'),
('12', 'Physics', 'Physics Part II – Class 12', 'Chapter 9 – Ray Optics and Optical Instruments', 9, 'https://ncert.nic.in/textbook/pdf/leph201.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 1 – Solutions', 1, 'https://ncert.nic.in/textbook/pdf/lech101.pdf'),
('12', 'Chemistry', 'Chemistry Part I – Class 12', 'Chapter 2 – Electrochemistry', 2, 'https://ncert.nic.in/textbook/pdf/lech102.pdf'),
('12', 'Biology', 'Biology – Class 12', 'Chapter 1 – Sexual Reproduction in Flowering Plants', 1, 'https://ncert.nic.in/textbook/pdf/lebo101.pdf'),
('12', 'Computer Science', 'Computer Science – Class 12', 'Chapter 1 – Python Revision Tour', 1, 'https://ncert.nic.in/textbook/pdf/lecs101.pdf');
