import assert from "node:assert/strict"
import test from "node:test"
import {
  projectOnboardingValidationState,
  validateProjectOnboardingInput,
} from "../../apps/mdr-web/src/lib/forms/project-onboarding"

const validInput = {
  clientId: "client-1",
  code: "PRJ-001",
  name: "Example Project",
  contractNumber: "CON-001",
  driveFolderId: "folder-1",
  driveFolderName: "PRJ-001-Example Project",
}

test("project onboarding accepts and trims a complete project", () => {
  const result = validateProjectOnboardingInput({
    ...validInput,
    name: "  Example Project  ",
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.name, "Example Project")
  }
})

test("project onboarding returns field errors instead of throwing", () => {
  const result = validateProjectOnboardingInput({
    ...validInput,
    code: "-",
    name: "",
  })

  assert.equal(result.success, false)
  if (!result.success) {
    const state = projectOnboardingValidationState(result.error)
    assert.equal(state.status, "error")
    assert.match(state.message, /highlighted fields/i)
    assert.match(state.fieldErrors.code?.[0] ?? "", /project code/i)
    assert.match(state.fieldErrors.name?.[0] ?? "", /project name/i)
  }
})
