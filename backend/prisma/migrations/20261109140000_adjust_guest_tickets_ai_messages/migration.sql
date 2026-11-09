-- Add new AI flag kind before changing rows.
ALTER TYPE "AiFlagKind" ADD VALUE 'TASK_OVERDUE';

-- Teacher email is optional for code-ticket-only access.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- AI cards can carry an action name and structured payload.
ALTER TABLE "group_messages"
  ADD COLUMN "action" TEXT,
  ADD COLUMN "payload" JSONB;

-- Overdue flags can target a group/task instead of a member.
ALTER TABLE "ai_flags" ALTER COLUMN "memberId" DROP NOT NULL;

-- Convert guest student tickets from User IDs to RoomParticipant IDs.
ALTER TABLE "student_code_tickets" ADD COLUMN "participantId" TEXT;

UPDATE "student_code_tickets" AS ticket
SET "participantId" = participant.id
FROM "room_participants" AS participant
WHERE participant."roomId" = ticket."roomId"
  AND participant."userId" = ticket."studentId";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "student_code_tickets" WHERE "participantId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate student tickets: participant mapping is missing';
  END IF;
END $$;

ALTER TABLE "student_code_tickets" ALTER COLUMN "participantId" SET NOT NULL;
ALTER TABLE "student_code_tickets" DROP CONSTRAINT "student_code_tickets_studentId_fkey";
DROP INDEX "student_code_tickets_studentId_idx";
ALTER TABLE "student_code_tickets" DROP COLUMN "studentId";

CREATE INDEX "student_code_tickets_participantId_idx" ON "student_code_tickets"("participantId");
ALTER TABLE "student_code_tickets"
  ADD CONSTRAINT "student_code_tickets_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "room_participants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
