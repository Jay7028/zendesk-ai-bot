import { NextResponse } from "next/server";
import {
  getAllSpecialists,
  createSpecialist,
  SpecialistConfig,
} from "./data";

export async function GET() {
  // return all specialists
  return NextResponse.json(getAllSpecialists());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<SpecialistConfig, "id">;
  const created = createSpecialist(body);
  return NextResponse.json(created, { status: 201 });
}
