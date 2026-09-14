-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "parentPinHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "dailyNewWords" INTEGER NOT NULL DEFAULT 20,
    "avatarEmoji" TEXT NOT NULL DEFAULT '🦊',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChildProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "nameZh" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "sentenceTemplate" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "english" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    "phonetic" TEXT,
    "emoji" TEXT NOT NULL DEFAULT '⭐',
    "collocation" TEXT,
    "example" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "themeId" TEXT NOT NULL,
    CONSTRAINT "Word_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WordProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "srsStep" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" DATETIME,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "correctStreak" INTEGER NOT NULL DEFAULT 0,
    "lastResult" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WordProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WordProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudySession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "wordIds" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudySession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "parentPass" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_slug_key" ON "Theme"("slug");

-- CreateIndex
CREATE INDEX "Word_english_idx" ON "Word"("english");

-- CreateIndex
CREATE UNIQUE INDEX "Word_english_themeId_key" ON "Word"("english", "themeId");

-- CreateIndex
CREATE INDEX "WordProgress_childId_nextReviewAt_idx" ON "WordProgress"("childId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "WordProgress_childId_wrongCount_idx" ON "WordProgress"("childId", "wrongCount");

-- CreateIndex
CREATE UNIQUE INDEX "WordProgress_childId_wordId_key" ON "WordProgress"("childId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "StudySession_childId_dateKey_phase_key" ON "StudySession"("childId", "dateKey", "phase");
