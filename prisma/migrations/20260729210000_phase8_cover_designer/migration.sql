ALTER TABLE "CoverTemplateVersion"
  ADD COLUMN "schemaVersion" TEXT NOT NULL DEFAULT '1',
  ADD COLUMN "customWidthPt" DECIMAL(65,30),
  ADD COLUMN "customHeightPt" DECIMAL(65,30),
  ADD COLUMN "contentHash" TEXT,
  ADD COLUMN "snapshot" JSONB,
  ADD COLUMN "supersededAt" TIMESTAMP(3),
  ADD COLUMN "publishedByUserId" TEXT,
  ADD COLUMN "legacyFallback" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "CoverLayoutElement"
  ADD COLUMN "zIndex" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "SignatureBox"
  ADD COLUMN "roleLabel" TEXT,
  ADD COLUMN "specificAssignment" TEXT,
  ADD COLUMN "displayOptions" JSONB;

ALTER TABLE "GeneratedCover"
  ADD COLUMN "outputHash" TEXT,
  ADD COLUMN "rendererVersion" TEXT,
  ADD COLUMN "templateSnapshot" JSONB;

ALTER TABLE "CoverTemplateInheritanceRule"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "CoverLayoutElement"
  ADD CONSTRAINT "CoverLayoutElement_relative_bounds"
  CHECK (
    "x" >= 0 AND "y" >= 0 AND "width" > 0 AND "height" > 0
    AND "x" + "width" <= 1 AND "y" + "height" <= 1
  );

ALTER TABLE "SignatureBox"
  ADD CONSTRAINT "SignatureBox_relative_bounds"
  CHECK (
    "x" >= 0 AND "y" >= 0 AND "width" > 0 AND "height" > 0
    AND "x" + "width" <= 1 AND "y" + "height" <= 1
  );

CREATE OR REPLACE FUNCTION "prevent_cover_version_mutation"()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" IN ('Published', 'Superseded') THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Published'
     AND NEW."status" = 'Superseded'
     AND NEW."templateId" = OLD."templateId"
     AND NEW."version" = OLD."version"
     AND NEW."pageSize" = OLD."pageSize"
     AND NEW."orientation" = OLD."orientation"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" = OLD."createdAt"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."customWidthPt" IS NOT DISTINCT FROM OLD."customWidthPt"
     AND NEW."customHeightPt" IS NOT DISTINCT FROM OLD."customHeightPt"
     AND NEW."contentHash" IS NOT DISTINCT FROM OLD."contentHash"
     AND NEW."snapshot" IS NOT DISTINCT FROM OLD."snapshot"
     AND NEW."publishedByUserId" IS NOT DISTINCT FROM OLD."publishedByUserId"
     AND NEW."legacyFallback" = OLD."legacyFallback"
     AND NEW."supersededAt" IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD."status" = 'Superseded'
     AND NEW."status" = 'Archived'
     AND NEW."templateId" = OLD."templateId"
     AND NEW."version" = OLD."version"
     AND NEW."pageSize" = OLD."pageSize"
     AND NEW."orientation" = OLD."orientation"
     AND NEW."publishedAt" IS NOT DISTINCT FROM OLD."publishedAt"
     AND NEW."createdAt" = OLD."createdAt"
     AND NEW."schemaVersion" = OLD."schemaVersion"
     AND NEW."customWidthPt" IS NOT DISTINCT FROM OLD."customWidthPt"
     AND NEW."customHeightPt" IS NOT DISTINCT FROM OLD."customHeightPt"
     AND NEW."contentHash" IS NOT DISTINCT FROM OLD."contentHash"
     AND NEW."snapshot" IS NOT DISTINCT FROM OLD."snapshot"
     AND NEW."publishedByUserId" IS NOT DISTINCT FROM OLD."publishedByUserId"
     AND NEW."legacyFallback" = OLD."legacyFallback"
     AND NEW."supersededAt" IS NOT DISTINCT FROM OLD."supersededAt" THEN
    RETURN NEW;
  END IF;
  IF OLD."status" IN ('Published', 'Superseded', 'Archived')
     AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Published version records are immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER "CoverTemplateVersion_published_immutable"
  ON "CoverTemplateVersion";

CREATE TRIGGER "CoverTemplateVersion_published_immutable"
BEFORE UPDATE OR DELETE ON "CoverTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION "prevent_cover_version_mutation"();

CREATE OR REPLACE FUNCTION "prevent_published_cover_content_mutation"()
RETURNS trigger AS $$
DECLARE
  parent_status "FoundationRecordStatus";
  parent_version_id TEXT;
BEGIN
  parent_version_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD."versionId"
    ELSE NEW."versionId"
  END;
  SELECT "status" INTO parent_status
  FROM "CoverTemplateVersion"
  WHERE "id" = parent_version_id;
  IF parent_status IN ('Published', 'Superseded', 'Archived') THEN
    RAISE EXCEPTION 'Published cover content is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
