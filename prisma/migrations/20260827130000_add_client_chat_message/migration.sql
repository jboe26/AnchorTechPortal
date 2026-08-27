-- CreateEnum
CREATE TYPE "chat_role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "ClientChatMessage" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" "chat_role" NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientChatMessage_clientId_createdAt_idx" ON "ClientChatMessage"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientChatMessage" ADD CONSTRAINT "ClientChatMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RowLevelSecurity
ALTER TABLE "ClientChatMessage" ENABLE ROW LEVEL SECURITY;
