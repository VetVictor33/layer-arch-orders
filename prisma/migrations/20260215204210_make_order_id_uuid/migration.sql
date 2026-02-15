-- AlterTable
ALTER TABLE "Order" ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");

-- DropIndex
DROP INDEX "Order_id_key";
