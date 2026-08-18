-- Student library card barcodes + DB consistency fixes
-- Adds library_card_barcode to profiles for scannable student ID cards

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS library_card_barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_library_card_barcode
  ON public.profiles (lower(trim(library_card_barcode)))
  WHERE library_card_barcode IS NOT NULL AND trim(library_card_barcode) <> '';

-- Backfill barcodes from admission numbers for approved students
UPDATE public.profiles
SET library_card_barcode = 'KVS-' || upper(trim(admission_number))
WHERE role = 'student'
  AND is_approved = true
  AND admission_number IS NOT NULL
  AND trim(admission_number) <> ''
  AND (library_card_barcode IS NULL OR trim(library_card_barcode) = '');

-- Auto-set barcode on profile insert/update when admission_number is present
CREATE OR REPLACE FUNCTION public.set_student_library_barcode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student'
     AND NEW.admission_number IS NOT NULL
     AND trim(NEW.admission_number) <> ''
     AND (NEW.library_card_barcode IS NULL OR trim(NEW.library_card_barcode) = '') THEN
    NEW.library_card_barcode := 'KVS-' || upper(trim(NEW.admission_number));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_student_library_barcode ON public.profiles;
CREATE TRIGGER trg_set_student_library_barcode
  BEFORE INSERT OR UPDATE OF admission_number, role, library_card_barcode ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_student_library_barcode();

-- Admin delete policy for user_feedback (was missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_feedback' AND policyname = 'Allow admin to delete feedback'
  ) THEN
    CREATE POLICY "Allow admin to delete feedback" ON public.user_feedback
      FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Ensure currently_reading column exists (docs referenced reading_status incorrectly)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currently_reading JSONB;

-- Grant profile column access via existing RLS (users update own profile)
COMMENT ON COLUMN public.profiles.library_card_barcode IS 'Code 39 barcode printed on student library ID card; scanned at circulation desk';
