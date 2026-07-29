import "server-only"
import { prisma } from "@/lib/prisma/client"
import { downloadFileFromSupabaseStorage } from "@/server/services/storage/storage-service"

export async function inventoryLegacyStorage() {
  const [documentFiles, fileObjects] = await Promise.all([
    prisma.documentFile.count({
      where: { storageProvider: "Supabase", deletedAt: null },
    }),
    prisma.fileObject.count({
      where: { storageProvider: "Supabase", deletedAt: null },
    }),
  ])
  return {
    mode: "DRY_RUN",
    legacyDocumentFiles: documentFiles,
    legacyFileObjects: fileObjects,
    deletionPlanned: false,
  }
}

export async function readLegacyDocumentFile(documentFileId: string) {
  const file = await prisma.documentFile.findUnique({
    where: { id: documentFileId },
  })
  if (
    !file ||
    file.storageProvider !== "Supabase" ||
    !file.storageBucket ||
    !file.storagePath
  ) {
    throw new Error("Legacy file is unavailable.")
  }
  return downloadFileFromSupabaseStorage(file.storageBucket, file.storagePath)
}
