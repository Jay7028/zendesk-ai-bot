import { NextRequest, NextResponse } from "next/server";

type RegisterInput = {
  number: string;
  carrier?: string;
  order?: string;
  destination?: string;
  customer?: string;
  phone?: string;
  email?: string;
  postalCode?: string;
  shipper?: string;
};

type TrackAction = "register" | "info" | "register_and_fetch";

const BASE_URL = "https://api.17track.net/track/v2";

const TEST_NUMBERS = {
  ups: "1Z999AA10123456784",
  usps: "9400110898825022579493",
  fedexSmartPost: "9274899991899154345251",
  dhlGm: "GM1234567890123456",
  seventeenTrackTest: "EZ1000000001",
};

async function call17Track<T>(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<{ code: number; data: T; message?: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": token,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`17TRACK HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as { code: number; data: T; message?: string };
  if (typeof json.code !== "number") {
    throw new Error("17TRACK response missing code");
  }
  if (json.code !== 0) {
    throw new Error(`17TRACK error code ${json.code}: ${json.message || "Unknown error"}`);
  }
  return json;
}

function normalizeNumbers(rawNumbers: unknown, fallbackCarrier?: string): RegisterInput[] {
  if (!Array.isArray(rawNumbers)) return [];
  return rawNumbers
    .map((item) => {
      if (typeof item === "string") {
        return { number: item.trim(), carrier: fallbackCarrier };
      }
      if (item && typeof item === "object") {
        const maybe = item as Partial<RegisterInput>;
        return { ...maybe, number: String(maybe.number || "").trim() };
      }
      return null;
    })
    .filter((n): n is RegisterInput => !!n && !!n.number)
    .slice(0, 40); // API hard limit per call
}

export async function GET() {
  return NextResponse.json({
    message: "17TRACK quick-start",
    samplePayload: {
      action: "register_and_fetch" as TrackAction,
      carrier: "usps",
      numbers: [
        TEST_NUMBERS.seventeenTrackTest,
        TEST_NUMBERS.usps,
        TEST_NUMBERS.ups,
      ],
      realtime: false,
    },
    docs: "https://api.17track.net/en/doc?version=v2.4",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action: TrackAction = body.action || "register_and_fetch";
    const realtime: boolean = Boolean(body.realtime);
    const carrier: string | undefined = typeof body.carrier === "string" ? body.carrier : undefined;

    const numbers = normalizeNumbers(body.numbers, carrier);
    if (!numbers.length) {
      return NextResponse.json(
        { error: "Provide an array of numbers (strings or objects with a number field)." },
        { status: 400 }
      );
    }

    const token =
      process.env.SEVENTEENTRACK_API_TOKEN ||
      process.env["17TRACK_API_TOKEN"] ||
      "";
    if (!token) {
      return NextResponse.json(
        { error: "Missing SEVENTEENTRACK_API_TOKEN in server environment." },
        { status: 500 }
      );
    }

    const response: {
      registered?: unknown;
      refreshed?: unknown;
      trackInfo?: unknown;
    } = {};

    if (action === "register" || action === "register_and_fetch") {
      const registerPayload = {
        numbers: numbers.map(({ carrier: c, ...rest }) =>
          c ? { ...rest, carrier: c } : rest
        ),
      };
      const registerRes = await call17Track(token, "/register", registerPayload);
      response.registered = registerRes.data;
    }

    if (realtime) {
      const realtimeRes = await call17Track(token, "/realtime", {
        numbers: numbers.map((n) => n.number),
      });
      response.refreshed = realtimeRes.data;
    }

    if (action === "info" || action === "register_and_fetch") {
      const infoRes = await call17Track(token, "/gettrackinfo", {
        numbers: numbers.map((n) => n.number),
      });
      response.trackInfo = infoRes.data;
    }

    return NextResponse.json({
      ...response,
      usedNumbers: numbers.map((n) => n.number),
    });
  } catch (err) {
    console.error("17TRACK route error", err);
    return NextResponse.json(
      { error: "Failed to process tracking request", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
