/*
  Warnings:

  - Added the required column `buyer_contact_number` to the `purchases` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable - Add column with default value first, then remove default
ALTER TABLE "purchases" ADD COLUMN "buyer_contact_number" TEXT NOT NULL DEFAULT 'No proporcionado';

-- Update existing records with a placeholder value
UPDATE "purchases" SET "buyer_contact_number" = 'No proporcionado' WHERE "buyer_contact_number" IS NULL;

-- Remove the default value for future inserts
ALTER TABLE "purchases" ALTER COLUMN "buyer_contact_number" DROP DEFAULT;
