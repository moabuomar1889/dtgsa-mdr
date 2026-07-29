import { getApproveReadiness } from "../../../operational"

export function GET() {
  return Response.json(getApproveReadiness())
}
