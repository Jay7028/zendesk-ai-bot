import { NextRequest, NextResponse } from "next/server";

type TrackRequest = {
  tracking_number?: string;
  courier_code?: string;
};

const TRACKINGMORE_BASE = "https://api.trackingmore.com/v4";

async function tmFetch<T>(
  apiKey: string,
  path: string,
  init: RequestInit
): Promise<T> {
  const res = await fetch(`${TRACKINGMORE_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Tracking-Api-Key": apiKey,
      ...(init.headers || {}),
    },
  });

  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`TrackingMore returned non-JSON response: ${text}`);
  }

  // TrackingMore uses code:200 for success in body
  if (!res.ok || json?.code !== 200) {
    const msg = json?.message || json?.meta?.message || res.statusText;
    const code = json?.code ?? res.status;
    throw new Error(`TrackingMore error ${code}: ${msg}`);
  }

  return json as T;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey =
      process.env.TRACKINGMORE_API_KEY ||
      process.env.TRACKING_MORE_API_KEY ||
      "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "TRACKINGMORE_API_KEY not set on server" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as TrackRequest;
    const trackingNumber = body.tracking_number?.trim();
    const courierCode = (body.courier_code || "hermes-uk").trim();

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "tracking_number is required" },
        { status: 400 }
      );
    }

    // 1) Create/register tracking
    const createRes = await tmFetch<{
      code: number;
      data: unknown;
      message?: string;
    }>(apiKey, "/trackings/create", {
      method: "POST",
      body: JSON.stringify({
        tracking_number: trackingNumber,
        courier_code: courierCode,
      }),
    });

    // 2) Fetch tracking info
    const infoRes = await tmFetch<{
      code: number;
      data: unknown;
      message?: string;
    }>(apiKey, `/trackings/${courierCode}/${trackingNumber}`, {
      method: "GET",
    });

    return NextResponse.json({
      created: createRes.data,
      info: infoRes.data,
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
