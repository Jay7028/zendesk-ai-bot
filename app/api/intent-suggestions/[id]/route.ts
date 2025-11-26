import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { HttpError, requireOrgContext } from "../../../../lib/auth";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId } = await requireOrgContext(req);
    const { id } = await context.params;
    const { error } = await supabaseAdmin
      .from("intent_suggestions")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId);

    if (error) {
      console.error("Supabase DELETE /intent-suggestions/:id error", error);
      return NextResponse.json(
        { error: "Failed to delete intent suggestion", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
