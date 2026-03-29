import { FeaturePlaceholder } from "@/components/app/feature-placeholder"

export default function AdminUsersPage() {
  return (
    <FeaturePlaceholder
      badge="Users & Roles"
      title="User administration will combine system roles, project roles, signatures, and permission-driven access."
      description="The RBAC foundation is seeded at the database level and mirrored in code. The next slice will add user screens, project-role assignment, and signature-profile management."
      nextSteps={[
        "Manage users, activation state, and profile details.",
        "Assign global roles and project-scoped roles safely.",
        "Collect signature profiles for preparer, reviewer, and approver actions.",
      ]}
    />
  )
}
