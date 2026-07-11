-- PiForum D1 schema upgrade: Best Answer system + generalized Attachment model

-- Thread: add bestAnswerId (unique), bestAnswerSelectedAt, bestAnswerSelectedBy
ALTER TABLE "Thread" ADD COLUMN "bestAnswerId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Thread.bestAnswerId_unique" ON "Thread"("bestAnswerId");
ALTER TABLE "Thread" ADD COLUMN "bestAnswerSelectedAt" INTEGER;
ALTER TABLE "Thread" ADD COLUMN "bestAnswerSelectedBy" TEXT;
CREATE INDEX IF NOT EXISTS "Thread_solved_idx" ON "Thread"("solved");

-- Post: add isBestAnswer
ALTER TABLE "Post" ADD COLUMN "isBestAnswer" BOOLEAN NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "Post_isBestAnswer_idx" ON "Post"("isBestAnswer");

-- Attachment: recreate with nullable postId + new userId, purpose columns
CREATE TABLE "Attachment_new" (
    id TEXT NOT NULL PRIMARY KEY,
    postId TEXT,
    userId TEXT,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    mimeType TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'post',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE
);
INSERT INTO "Attachment_new" (id, postId, url, filename, size, mimeType, createdAt, purpose)
    SELECT id, postId, url, filename, size, mimeType, createdAt, 'post' FROM "Attachment";
DROP TABLE "Attachment";
ALTER TABLE "Attachment_new" RENAME TO "Attachment";
CREATE INDEX IF NOT EXISTS "Attachment_postId_idx" ON "Attachment"("postId");
CREATE INDEX IF NOT EXISTS "Attachment_userId_idx" ON "Attachment"("userId");
CREATE INDEX IF NOT EXISTS "Attachment_purpose_idx" ON "Attachment"("purpose");
