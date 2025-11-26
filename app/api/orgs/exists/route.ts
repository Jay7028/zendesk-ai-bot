import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(req: NextRequest) {
  try {
    const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
    if (!slug) return NextResponse.json({ exists: false });
    const { data, error } = await supabaseAdmin
      .from("organizations")
      .select("id, slug")
      .ilike("slug", slugify(slug))
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ exists: false });
    return NextResponse.json({ exists: true, orgId: data.id, slug: data.slug });
  } catch (e) {
    console.error("GET /api/orgs/exists error", e);
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
