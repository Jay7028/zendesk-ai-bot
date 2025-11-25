const TRACKINGMORE_BASE = "https://api.trackingmore.com/v4";

export type TrackingSummary = {
  trackingNumber: string;
  courierCode: string;
  status?: string;
  substatus?: string;
  eta?: string;
  lastEvent?: string;
  lastLocation?: string;
  updatedAt?: string;
  raw?: unknown;
};

function getApiKey() {
  return (
    process.env.TRACKINGMORE_API_KEY ||
    process.env.TRACKING_MORE_API_KEY ||
    ""
  );
}

async function tmFetch<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("TRACKINGMORE_API_KEY not set on server");
  }

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

  const isSuccessCode = (val: unknown) => {
    if (val === undefined || val === null) return false;
    const num = Number(val);
    return !Number.isNaN(num) && num === 200;
  };
  const okBody =
    isSuccessCode(json?.code) ||
    isSuccessCode(json?.meta?.code) ||
    (json?.code === undefined && res.ok); // fall back to HTTP ok when code is absent

  if (!res.ok || !okBody) {
    const msg = json?.message || json?.meta?.message || res.statusText;
    const code = json?.code ?? json?.meta?.code ?? res.status;
    const err = new Error(`TrackingMore error ${code}: ${msg}`);
    (err as any)._tmBody = json;
    throw err;
  }

  return json as T;
}

export async function createTracking(
  trackingNumber: string,
  courierCode: string
) {
  return tmFetch<{
    code: number;
    data: unknown;
    message?: string;
  }>("/trackings/create", {
    method: "POST",
    body: JSON.stringify({
      tracking_number: trackingNumber,
      courier_code: courierCode,
    }),
  });
}

export async function fetchTrackingInfo(
  trackingNumber: string,
  courierCode: string
) {
  return tmFetch<{
    code: number;
    data: unknown;
    message?: string;
  }>(`/trackings/${courierCode}/${trackingNumber}`, {
    method: "GET",
  });
}

export async function ensureTrackingAndFetch(
  trackingNumber: string,
  courierCode: string
) {
  try {
    await createTracking(trackingNumber, courierCode);
  } catch (err: any) {
    const msg = err?.message || "";
    const body = err?._tmBody;
    const alreadyExists =
      msg.toLowerCase().includes("already exists") ||
      body?.meta?.message?.toLowerCase?.().includes("already exists");
    if (!alreadyExists) {
      throw err;
    }
  }
  return fetchTrackingInfo(trackingNumber, courierCode);
}

export function summarizeTracking(raw: any, trackingNumber: string, courierCode: string): TrackingSummary {
  const item = Array.isArray(raw?.data?.items)
    ? raw.data.items[0]
    : raw?.data?.items || raw?.data || raw;

  const status =
    item?.status ||
    item?.status_info ||
    item?.status_info?.status ||
    item?.status_description ||
    item?.substatus;

  const substatus =
    item?.substatus ||
    item?.sub_status ||
    item?.status_info?.sub_status ||
    item?.status_info?.substatus;

  const eta =
    item?.expected_delivery ||
    item?.expected_delivery_time ||
    item?.eta ||
    item?.delivery_date;

  const lastEvent =
    item?.last_event ||
    item?.lastest_checkpoint?.message ||
    item?.lastest_checkpoint?.status ||
    item?.checkpoint?.description;

  const lastLocation =
    item?.last_location ||
    item?.lastest_checkpoint?.location ||
    item?.checkpoint?.location;

  const updatedAt =
    item?.last_update_time ||
    item?.last_updated_at ||
    item?.update_time;

  return {
    trackingNumber,
    courierCode,
    status,
    substatus,
    eta,
    lastEvent,
    lastLocation,
    updatedAt,
    raw: item,
  };
}
