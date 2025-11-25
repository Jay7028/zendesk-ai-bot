import { NextRequest, NextResponse } from "next/server";
import {
  ensureTrackingAndFetch,
  summarizeTracking,
} from "../../../lib/trackingmore";
import { supabaseAdmin } from "../../../lib/supabase";

type TrackRequest = {
  tracking_number?: string;
  courier_code?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TrackRequest;
    const trackingNumber = body.tracking_number?.trim();
    const courierCode = (body.courier_code || "hermes-uk").trim();

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "tracking_number is required" },
        { status: 400 }
      );
    }

    const infoRes = await ensureTrackingAndFetch(trackingNumber, courierCode);
    const summary = summarizeTracking(infoRes, trackingNumber, courierCode);

    // Store a human-friendly log entry
    try {
      await supabaseAdmin.from("logs").insert({
        zendesk_ticket_id: trackingNumber, // no ticket context here; reuse number
        specialist_id: "tracking",
        specialist_name: "TrackingMore",
        intent_id: null,
        intent_name: "parcel_status",
        input_summary: `Tracking request for ${trackingNumber} (${courierCode})`,
        knowledge_sources: [],
        output_summary: `Status: ${summary.status || "unknown"} | ETA: ${
          summary.eta || "n/a"
        } | Last: ${summary.lastEvent || "n/a"}`,
        status: "success",
      });
    } catch (e) {
      console.error("Failed to log tracking lookup", e);
    }

    return NextResponse.json({
      created: infoRes?.data ?? "created or exists",
      info: infoRes.data,
      summary,
      tracking_number: trackingNumber,
      courier_code: courierCode,
    });
  } catch (err) {
    console.error("TrackingMore route error", err);
    return NextResponse.json(
      {
        error: "Failed to process tracking request",
        detail: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
