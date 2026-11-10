-- Add Task.progress (Int, default 0). Tracks completion percentage 0-100.
ALTER TABLE "tasks"
  ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;