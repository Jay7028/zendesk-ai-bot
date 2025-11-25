import { NextRequest, NextResponse } from "next/server";
import {
  ensureTrackingAndFetch,
  summarizeTracking,
} from "../../../lib/trackingmore";

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
