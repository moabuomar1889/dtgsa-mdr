import { getApproveHealth } from "../../../operational"

export function GET() {
  return Response.json(getApproveHealth())
}
