-- CreateTable
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "wallpaper_number" INTEGER NOT NULL,
    "buyer_email" TEXT NOT NULL,
    "buyer_name" TEXT NOT NULL,
    "buyer_identification" TEXT NOT NULL,
    "mercadopago_payment_id" TEXT,
    "preference_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_mercadopago_payment_id_key" ON "purchases"("mercadopago_payment_id");
