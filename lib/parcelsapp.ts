const BASE = "https://parcelsapp.com/api/v3";

export type ParcelSummary = {
  trackingId: string;
  carrier?: string;
  status?: string;
  substatus?: string;
  eta?: string;
  lastEvent?: string;
  lastLocation?: string;
  updatedAt?: string;
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

export async function initiateTracking(opts: {
  trackingId: string;
  destinationCountry?: string;
  language?: string;
}): Promise<{ uuid: string; fromCache?: boolean }> {
  const apiKey = getApiKey();
  const payload = {
    apiKey,
    language: opts.language || "en",
    shipments: [
      {
        trackingId: opts.trackingId,
        destinationCountry: opts.destinationCountry,
      },
    ],
  };
  const data = await paFetch<{ uuid: string; fromCache?: boolean }>(
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
  const { trackingId, destinationCountry, language } = opts;
  const maxPoll = opts.maxPollMs ?? 4000;
  const interval = opts.pollIntervalMs ?? 500;

  const initRes: any = await initiateTracking({ trackingId, destinationCountry, language });
  const uuid = initRes?.uuid;

  // If cached results returned immediately
  if (initRes?.shipments) {
    return initRes;
  }

  if (!uuid) {
    const err = new Error("Parcelsapp tracking request did not return uuid");
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
  const lastEvent =
    shipment?.lastEvent ||
    shipment?.latestEvent ||
    shipment?.checkpoints?.[shipment.checkpoints.length - 1]?.message;
  const lastLocation =
    shipment?.lastLocation ||
    shipment?.latestLocation ||
    shipment?.checkpoints?.[shipment.checkpoints.length - 1]?.location;
  const updatedAt = shipment?.lastUpdate || shipment?.updatedAt || shipment?.timestamp;

  return {
    trackingId,
    carrier: shipment?.carrier || shipment?.courier || shipment?.provider,
    status,
    substatus,
    eta,
    lastEvent,
    lastLocation,
    updatedAt,
    raw: shipment,
  };
}
