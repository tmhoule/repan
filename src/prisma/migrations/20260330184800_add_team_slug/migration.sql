-- AlterTable
ALTER TABLE "teams" ADD COLUMN "slug" TEXT;

-- Backfill slugs from existing team names (lowercase, replace spaces/special chars with hyphens)
UPDATE "teams" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) WHERE "slug" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");
