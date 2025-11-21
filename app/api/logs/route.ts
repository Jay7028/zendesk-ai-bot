import { NextResponse } from "next/server";
import { getAllLogs, addLogEntry, LogEntry } from "./data";

export async function GET() {
  return NextResponse.json(getAllLogs());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Omit<LogEntry, "id" | "timestamp">;
  const created = addLogEntry(body);
  return NextResponse.json(created, { status: 201 });
}
