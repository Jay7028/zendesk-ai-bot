import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { error } = await supabaseAdmin
    .from("intent_suggestions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Supabase DELETE /intent-suggestions/:id error", error);
    return NextResponse.json(
      { error: "Failed to delete intent suggestion", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
