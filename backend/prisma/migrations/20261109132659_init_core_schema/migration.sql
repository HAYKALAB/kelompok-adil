-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('GOOGLE_DOCS', 'SLIDE', 'HANDWRITTEN_PHOTO', 'WEB_LINK');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('VALID', 'INCOMPLETE', 'SUSPICIOUS', 'PENDING');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DOCUMENT', 'COMMENT', 'LOG', 'UPLOAD');

-- CreateEnum
CREATE TYPE "AiSuggestionType" AS ENUM ('ROLE_SPLIT', 'ASSIGNEE');

-- CreateEnum
CREATE TYPE "AiSuggestionStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AiFlagKind" AS ENUM ('GHOSTING', 'LOW_CONTRIBUTION');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "className" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "deadline" TIMESTAMP(3),
    "teacherId" TEXT NOT NULL,
    "targetGroups" INTEGER NOT NULL DEFAULT 4,
    "status" "RoomStatus" NOT NULL DEFAULT 'LOBBY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_participants" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT,

    CONSTRAINT "room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "evidenceType" "EvidenceType",
    "evidenceUrl" TEXT,
    "evidenceStatus" "EvidenceStatus",
    "evidenceFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peer_reports" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "peer_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_messages" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_suggestions" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "type" "AiSuggestionType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_flags" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "kind" "AiFlagKind" NOT NULL,
    "detail" JSONB NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_code_tickets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_code_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_code_tickets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_code_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_pin_key" ON "rooms"("pin");

-- CreateIndex
CREATE INDEX "rooms_teacherId_idx" ON "rooms"("teacherId");

-- CreateIndex
CREATE INDEX "room_participants_roomId_idx" ON "room_participants"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "room_participants_roomId_name_key" ON "room_participants"("roomId", "name");

-- CreateIndex
CREATE INDEX "groups_roomId_idx" ON "groups"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_roomId_groupNumber_key" ON "groups"("roomId", "groupNumber");

-- CreateIndex
CREATE INDEX "tasks_groupId_idx" ON "tasks"("groupId");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_idx" ON "tasks"("assigneeId");

-- CreateIndex
CREATE INDEX "activities_groupId_createdAt_idx" ON "activities"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_memberId_createdAt_idx" ON "activities"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "peer_reports_roomId_idx" ON "peer_reports"("roomId");

-- CreateIndex
CREATE INDEX "peer_reports_groupId_idx" ON "peer_reports"("groupId");

-- CreateIndex
CREATE INDEX "group_messages_groupId_createdAt_idx" ON "group_messages"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_suggestions_groupId_createdAt_idx" ON "ai_suggestions"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_flags_groupId_createdAt_idx" ON "ai_flags"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_flags_memberId_idx" ON "ai_flags"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_code_tickets_code_key" ON "teacher_code_tickets"("code");

-- CreateIndex
CREATE INDEX "teacher_code_tickets_roomId_idx" ON "teacher_code_tickets"("roomId");

-- CreateIndex
CREATE INDEX "teacher_code_tickets_teacherId_idx" ON "teacher_code_tickets"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "student_code_tickets_code_key" ON "student_code_tickets"("code");

-- CreateIndex
CREATE INDEX "student_code_tickets_roomId_idx" ON "student_code_tickets"("roomId");

-- CreateIndex
CREATE INDEX "student_code_tickets_studentId_idx" ON "student_code_tickets"("studentId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "room_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "room_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reports" ADD CONSTRAINT "peer_reports_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reports" ADD CONSTRAINT "peer_reports_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reports" ADD CONSTRAINT "peer_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "room_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_reports" ADD CONSTRAINT "peer_reports_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "room_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_suggestions" ADD CONSTRAINT "ai_suggestions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_flags" ADD CONSTRAINT "ai_flags_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_flags" ADD CONSTRAINT "ai_flags_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "room_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_code_tickets" ADD CONSTRAINT "teacher_code_tickets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_code_tickets" ADD CONSTRAINT "teacher_code_tickets_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_code_tickets" ADD CONSTRAINT "student_code_tickets_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_code_tickets" ADD CONSTRAINT "student_code_tickets_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
