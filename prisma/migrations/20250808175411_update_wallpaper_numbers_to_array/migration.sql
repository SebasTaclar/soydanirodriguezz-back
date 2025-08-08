/*
  Warnings:

  - You are about to drop the column `wallpaper_number` on the `purchases` table. All the data in the column will be lost.
  - Added the required column `wallpaper_numbers` to the `purchases` table without a default value. This is not possible if the table is not empty.

*/

-- Paso 1: Agregar la nueva columna wallpaper_numbers como nullable temporalmente
ALTER TABLE "purchases" ADD COLUMN "wallpaper_numbers" TEXT;

-- Paso 2: Migrar datos existentes: convertir wallpaper_number individual a array JSON
UPDATE "purchases" 
SET "wallpaper_numbers" = '[' || "wallpaper_number" || ']'
WHERE "wallpaper_numbers" IS NULL;

-- Paso 3: Hacer la columna NOT NULL ahora que tiene datos
ALTER TABLE "purchases" ALTER COLUMN "wallpaper_numbers" SET NOT NULL;

-- Paso 4: Eliminar la columna antigua
ALTER TABLE "purchases" DROP COLUMN "wallpaper_number";
