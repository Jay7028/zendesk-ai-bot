const BASE = "https://parcelsapp.com/api/v3";

export type ParcelSummary = {
  trackingId: string;
  carrier?: string;
  detectedCarrier?: string;
  detectedCarrierSlug?: string;
  status?: string;
  substatus?: string;
  eta?: string;
  lastEvent?: string;
  lastLocation?: string;
  updatedAt?: string;
  scans?: { time?: string; location?: string; message?: string; status?: string }[];
  raw?: unknown;
};

function getApiKey() {
  return process.env.PARCELSAPP_API_KEY || "";
}

async function paFetch<T>(path: string, init: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("PARCELSAPP_API_KEY not set on server");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Parcelsapp returned non-JSON response: ${text}`);
  }
  if (!res.ok) {
    const msg = json?.message || res.statusText;
    const code = json?.code ?? res.status;
    const err = new Error(`Parcelsapp error ${code}: ${msg}`);
    (err as any)._paBody = json;
    throw err;
  }
  return json as T;
}

type InitTrackingResponse = {
  uuid?: string;
  fromCache?: boolean;
  shipments?: any[];
  [key: string]: any;
};

export async function initiateTracking(opts: {
  trackingId: string;
  destinationCountry?: string;
  language?: string;
}): Promise<InitTrackingResponse> {
  const apiKey = getApiKey();
  const shipment: Record<string, any> = {
    trackingId: opts.trackingId,
  };
  // Destination country is normally omitted; include only when explicitly provided (e.g. fallback).
  if (opts.destinationCountry) {
    shipment.destinationCountry = opts.destinationCountry;
  }
  const payload = {
    apiKey,
    language: opts.language || "en",
    shipments: [shipment],
  };
  const data = await paFetch<InitTrackingResponse>(
    "/shipments/tracking",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return data;
}

export async function fetchTracking(uuid: string): Promise<any> {
  const apiKey = getApiKey();
  return paFetch<any>(
    `/shipments/tracking?uuid=${encodeURIComponent(uuid)}&apiKey=${encodeURIComponent(
      apiKey
    )}`,
    { method: "GET" }
  );
}

export async function trackOnce(opts: {
  trackingId: string;
  destinationCountry?: string;
  language?: string;
  maxPollMs?: number;
  pollIntervalMs?: number;
}): Promise<any> {
  const { trackingId, language } = opts;
  const maxPoll = opts.maxPollMs ?? 4000;
  const interval = opts.pollIntervalMs ?? 500;

  const destination =
    opts.destinationCountry?.trim() ||
    process.env.DEFAULT_DESTINATION_COUNTRY?.trim() ||
    "United Kingdom";

  const initRes = await initiateTracking({
    trackingId,
    destinationCountry: destination,
    language,
  });

  const uuid = initRes?.uuid;

  // If cached results returned immediately
  if (initRes?.shipments) {
    return initRes;
  }

  if (!uuid) {
    const msg = initRes?.error
      ? `Parcelsapp init error: ${initRes.error} ${initRes.description || ""}`.trim()
      : "Parcelsapp tracking request did not return uuid";
    const err = new Error(msg);
    (err as any)._paBody = initRes;
    throw err;
  }

  const started = Date.now();

  while (Date.now() - started < maxPoll) {
    const res = await fetchTracking(uuid);
    if (res?.done) return res;
    await new Promise((r) => setTimeout(r, interval));
  }
  // last attempt
  return fetchTracking(uuid);
}

export function summarizeParcel(raw: any, trackingId: string): ParcelSummary {
  const shipment = Array.isArray(raw?.shipments) ? raw.shipments[0] : raw?.shipments || raw;
  const status = shipment?.status || shipment?.statusText || shipment?.trackingStatus;
  const substatus = shipment?.substatus || shipment?.subStatus;
  const eta = shipment?.eta || shipment?.estimatedDeliveryDate || shipment?.expected;
  const detectedCarrier = shipment?.detectedCarrier?.name;
  const detectedCarrierSlug = shipment?.detectedCarrier?.slug;

  const checkpoints: any[] = Array.isArray(shipment?.checkpoints)
    ? shipment.checkpoints
    : Array.isArray(shipment?.events)
    ? shipment.events
    : Array.isArray(shipment?.states)
    ? shipment.states
    : [];

  const scans = checkpoints
    .map((cp) => ({
      time: cp.time || cp.datetime || cp.date,
      location: cp.location || cp.place,
      message: cp.message || cp.status || cp.description,
      status: cp.status || cp.substatus,
      _ts: Date.parse(cp.time || cp.datetime || cp.date || cp.timestamp || "") || 0,
    }))
    .sort((a, b) => b._ts - a._ts)
    .map(({ _ts, ...rest }) => rest);

  const latest = scans[0];
  const lastEvent =
    shipment?.lastEvent ||
    shipment?.latestEvent ||
    latest?.message ||
    latest?.status;
  const lastLocation =
    shipment?.lastLocation ||
    shipment?.latestLocation ||
    latest?.location;
  const updatedAt =
    shipment?.lastUpdate ||
    shipment?.updatedAt ||
    shipment?.timestamp ||
    latest?.time;

  return {
    trackingId,
    carrier: shipment?.carrier || shipment?.courier || shipment?.provider,
    detectedCarrier,
    detectedCarrierSlug,
    status,
    substatus,
    eta,
    lastEvent,
    lastLocation,
    updatedAt,
    scans,
    raw: shipment,
  };
}
