/*
  Warnings:

  - You are about to drop the column `buyer_identification` on the `purchases` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `purchases` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `Integer`.
  - Added the required column `buyer_identification_number` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `external_reference` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `purchases` table without a default value. This is not possible if the table is not empty.
  - Made the column `preference_id` on table `purchases` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "purchases_mercadopago_payment_id_key";

-- AlterTable
ALTER TABLE "purchases" DROP COLUMN "buyer_identification",
ADD COLUMN     "buyer_identification_number" TEXT NOT NULL,
ADD COLUMN     "external_reference" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "preference_id" SET NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING',
ALTER COLUMN "amount" SET DEFAULT 15000,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;
