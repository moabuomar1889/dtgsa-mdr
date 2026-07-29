import { getVerifyReadiness } from "../../../operational"

export function GET() {
  return Response.json(getVerifyReadiness())
}
