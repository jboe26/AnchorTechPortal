-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('internal', 'shared');

-- AlterEnum
ALTER TYPE "NoteSource" ADD VALUE 'client';

-- AlterTable
ALTER TABLE "ClientNote" ADD COLUMN "visibility" "NoteVisibility" NOT NULL DEFAULT 'internal';
