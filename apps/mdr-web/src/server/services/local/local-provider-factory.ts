import "server-only"
import { resolve } from "node:path"
import {
  LocalFilesystemDriveAdapter,
  LocalWorkspaceDirectoryAdapter,
  assertLocalAcceptanceMode,
} from "@dtg/local-acceptance"
import { GoogleDriveStorageAdapter } from "@/server/services/drive/drive-storage-adapter"
import { GoogleWorkspaceDirectoryAdapter } from "@/server/services/identity/directory-sync-service"

function runtimeRoot() {
  const value = process.env.LOCAL_RUNTIME_ROOT?.trim()
  if (!value) throw new Error("LOCAL_RUNTIME_ROOT is required in local mode.")
  return resolve(value)
}

export function createSourceDriveAdapter() {
  if (process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
    return new GoogleDriveStorageAdapter()
  }
  assertLocalAcceptanceMode()
  const root = runtimeRoot()
  return new LocalFilesystemDriveAdapter({
    root: resolve(root, "source-drive"),
    runtimeRoot: root,
    driveId: "local-source-drive",
  })
}

export function createControlledDriveAdapter() {
  if (process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
    return new GoogleDriveStorageAdapter()
  }
  assertLocalAcceptanceMode()
  const root = runtimeRoot()
  return new LocalFilesystemDriveAdapter({
    root: resolve(root, "controlled-documents"),
    runtimeRoot: root,
    driveId: "local-controlled-drive",
  })
}

export function createTemporaryArtifactAdapter() {
  if (process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
    return new GoogleDriveStorageAdapter()
  }
  assertLocalAcceptanceMode()
  const root = runtimeRoot()
  return new LocalFilesystemDriveAdapter({
    root: resolve(root, "temporary-artifacts"),
    runtimeRoot: root,
    driveId: "local-temporary-artifacts",
  })
}

export function createDirectoryAdapter() {
  if (process.env.LOCAL_ACCEPTANCE_MODE !== "true") {
    return new GoogleWorkspaceDirectoryAdapter()
  }
  return new LocalWorkspaceDirectoryAdapter()
}
