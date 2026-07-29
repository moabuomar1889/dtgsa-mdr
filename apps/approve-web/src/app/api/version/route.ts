import { approveConfiguration } from "../../../operational"

export function GET() {
  return Response.json(approveConfiguration.build)
}
