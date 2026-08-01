import "server-only"

import { GeneratedDocumentKind, WorkflowStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"

export async function loadTransmittalOverviewRecords() {
  const [projects, eligibleRevisions, transmittals] = await Promise.all([
    prisma.project.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        client: {
          select: {
            id: true,
            code: true,
            name: true,
            setting: {
              select: {
                defaultTransmittalMaxMb: true,
                settings: true,
              },
            },
          },
        },
      },
    }),
    prisma.documentRevision.findMany({
      where: {
        deletedAt: null,
        isCurrent: true,
        workflowStatus: WorkflowStatus.ReadyToSubmit,
        document: {
          deletedAt: null,
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        document: {
          select: {
            id: true,
            title: true,
            dtgsaDocumentNumber: true,
            clientDocumentNumber: true,
            projectId: true,
            project: {
              select: {
                id: true,
                code: true,
                name: true,
                client: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        files: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ createdAt: "desc" }],
          select: {
            id: true,
            type: true,
            fileName: true,
            fileSizeBytes: true,
          },
        },
      },
    }),
    prisma.transmittal.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        project: {
          select: {
            id: true,
            code: true,
            name: true,
            client: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        items: {
          orderBy: [{ itemOrder: "asc" }],
          include: {
            documentRevision: {
              include: {
                document: {
                  select: {
                    title: true,
                    dtgsaDocumentNumber: true,
                  },
                },
              },
            },
          },
        },
        generatedDocuments: {
          where: {
            kind: GeneratedDocumentKind.TRANSMITTAL_PDF,
          },
          orderBy: [{ createdAt: "desc" }],
          take: 1,
        },
      },
    }),
  ])

  return {
    projects,
    eligibleRevisions,
    transmittals,
  }
}
