import { NextResponse } from "next/server";
import { getSpecialist, updateSpecialist, SpecialistConfig } from "../data";

// Note: params is now a Promise, so we await it inside the handler.

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const spec = getSpecialist(id);
  if (!spec) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(spec);
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const existing = getSpecialist(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as SpecialistConfig;
  const updated = updateSpecialist(body);

  return NextResponse.json(updated);
}