-- Older tenant databases may already have game_duel_rooms from before duel
-- activation timestamps were introduced. CREATE TABLE IF NOT EXISTS does not
-- add newly declared columns to an existing table, so make the schema upgrade
-- explicit and safe to rerun.
ALTER TABLE public.game_duel_rooms
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

-- Preserve already-running/completed duels on upgraded tenants. The room's
-- creation time is a safe lower bound for sessions started in those matches.
UPDATE public.game_duel_rooms
SET activated_at = created_at
WHERE activated_at IS NULL
  AND status IN ('active', 'completed')
  AND guest_id IS NOT NULL;
