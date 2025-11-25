import { NextRequest, NextResponse } from "next/server";
import { trackOnce, summarizeParcel } from "../../../lib/parcelsapp";
import { supabaseAdmin } from "../../../lib/supabase";

type TrackRequest = {
  tracking_number?: string;
  courier_code?: string;
  destinationCountry?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TrackRequest;
    const trackingNumber = body.tracking_number?.trim();
    const courierCode = body.courier_code?.trim();
    const destination = body.destinationCountry?.trim();

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "tracking_number is required" },
        { status: 400 }
      );
    }

    const infoRes = await trackOnce({
      trackingId: trackingNumber,
      destinationCountry: destination,
    });
    const summary = summarizeParcel(infoRes, trackingNumber);

    // Store a human-friendly log entry
    try {
      const scans = summary.scans?.slice(0, 3) || [];
      const scanText =
        scans.length > 0
          ? scans
              .map(
                (s) =>
                  `${s.time || ""} ${s.location ? `@ ${s.location}` : ""} ${s.message || ""}`.trim()
              )
              .join(" | ")
          : "";
      await supabaseAdmin.from("logs").insert({
        zendesk_ticket_id: trackingNumber, // no ticket context here; reuse number
        specialist_id: "tracking",
        specialist_name: "Parcelsapp",
        intent_id: null,
        intent_name: "parcel_status",
        input_summary: `Tracking request for ${trackingNumber}`,
        knowledge_sources: [],
        output_summary: [
          `Status: ${summary.status || "unknown"}`,
          `ETA: ${summary.eta || "n/a"}`,
          `Carrier: ${summary.carrier || "n/a"}`,
          `Last: ${summary.lastEvent || "n/a"}`,
          scans.length ? `Recent scans: ${scanText}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
        status: "success",
      });
    } catch (e) {
      console.error("Failed to log tracking lookup", e);
    }

    return NextResponse.json({
      created: infoRes?.data ?? "created or exists",
      info: infoRes,
      summary,
      tracking_number: trackingNumber,
      courier_code: summary.carrier || "",
    });
  } catch (err) {
    console.error("Parcelsapp route error", err);
    return NextResponse.json(
      {
        error: "Failed to process tracking request",
        detail: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
