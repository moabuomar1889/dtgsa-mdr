import { verifyConfiguration } from "../../../operational"

export function GET() {
  return Response.json(verifyConfiguration.build)
}
