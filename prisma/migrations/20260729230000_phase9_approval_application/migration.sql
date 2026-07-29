ALTER TABLE "ReviewSession"
  ADD COLUMN "firstOpenedAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "approximateActiveSeconds" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ReviewPageEvent" (
  "id" TEXT NOT NULL,
  "reviewSessionId" TEXT NOT NULL,
  "pageNumber" INTEGER NOT NULL,
  "eventType" TEXT NOT NULL,
  "activeSeconds" INTEGER NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReviewPageEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReviewPageEvent_session_fkey"
    FOREIGN KEY ("reviewSessionId") REFERENCES "ReviewSession"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ReviewPageEvent_page_check" CHECK ("pageNumber" > 0),
  CONSTRAINT "ReviewPageEvent_active_check"
    CHECK ("activeSeconds" >= 0 AND "activeSeconds" <= 300)
);

CREATE INDEX "ReviewSession_userId_expiresAt_revokedAt_idx"
  ON "ReviewSession"("userId", "expiresAt", "revokedAt");
CREATE INDEX "ReviewPageEvent_reviewSessionId_occurredAt_idx"
  ON "ReviewPageEvent"("reviewSessionId", "occurredAt");
CREATE INDEX "ReviewPageEvent_reviewSessionId_pageNumber_idx"
  ON "ReviewPageEvent"("reviewSessionId", "pageNumber");

ALTER TABLE "Comment"
  ADD COLUMN "parentCommentId" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "responsibleDepartmentId" TEXT,
  ADD COLUMN "closureVerifiedByUserId" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3),
  ADD COLUMN "reopenedAt" TIMESTAMP(3);

CREATE INDEX "Comment_parentCommentId_createdAt_idx"
  ON "Comment"("parentCommentId", "createdAt");
CREATE INDEX "Comment_responsibleDepartmentId_state_idx"
  ON "Comment"("responsibleDepartmentId", "state");

CREATE OR REPLACE FUNCTION prevent_review_page_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Review page events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ReviewPageEvent_append_only_update"
BEFORE UPDATE ON "ReviewPageEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_review_page_event_mutation();

CREATE TRIGGER "ReviewPageEvent_append_only_delete"
BEFORE DELETE ON "ReviewPageEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_review_page_event_mutation();
