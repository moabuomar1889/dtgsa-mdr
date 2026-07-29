import { getVerifyHealth } from "../../../operational"

export function GET() {
  return Response.json(getVerifyHealth())
}
