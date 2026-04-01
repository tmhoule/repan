-- CreateTable
CREATE TABLE "saml_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "app_url" TEXT NOT NULL,
    "idp_entity_id" TEXT NOT NULL,
    "idp_sso_url" TEXT NOT NULL,
    "idp_certificate" TEXT NOT NULL,
    "sp_entity_id" TEXT NOT NULL,
    "attr_uid" TEXT NOT NULL DEFAULT 'uid',
    "attr_display_name" TEXT NOT NULL DEFAULT 'displayName',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saml_config_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "sso_uid" TEXT;
ALTER TABLE "users" ADD COLUMN "sso_user" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_sso_uid_key" ON "users"("sso_uid");
