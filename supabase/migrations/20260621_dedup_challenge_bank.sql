-- Deduplicate challenge_bank by title, keeping the oldest row for each title.
-- Then add a UNIQUE constraint so future seeds/admin inserts cannot create duplicates.

-- 1. Remove duplicates (keep earliest created_at, tie-break by smallest id)
DELETE FROM public.challenge_bank a
USING public.challenge_bank b
WHERE a.id <> b.id
  AND a.title = b.title
  AND (
    a.created_at > b.created_at
    OR (a.created_at = b.created_at AND a.id > b.id)
  );

-- 2. Add unique constraint on title
ALTER TABLE public.challenge_bank
  ADD CONSTRAINT challenge_bank_title_unique UNIQUE (title);
