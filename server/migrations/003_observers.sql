-- Observers point at a competition (competition_id) but are not on its
-- running order, so they never play, judge or appear to other people.
ALTER TABLE users ADD COLUMN observer INTEGER NOT NULL DEFAULT 0;
