import { ExchangeQuery, ExchangeResponse } from "./types";
import { FetchItem, SearchBody } from "./search";
import { mockExchange } from "./mock";

const TRADE_BASE = "https://www.pathofexile.com";

export class TradeApiError extends Error {
  status: number;
  retryAfter?: number;
  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "TradeApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function useMock(): boolean {
  return process.env.POE2_MOCK === "1" || !process.env.POESESSID;
}

function buildHeaders(): Record<string, string> {
  const userAgent =
    process.env.POE2_USER_AGENT ?? "poe2arb/0.1 (+https://github.com/brunnob/poe2arb)";
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": userAgent,
    Cookie: `POESESSID=${process.env.POESESSID}`,
  };
}

function throwForStatus(status: number, headers?: Headers): never {
  if (status === 429) {
    const retryAfter = headers ? Number(headers.get("Retry-After")) || undefined : undefined;
    throw new TradeApiError(429, "Rate limited by the trade API.", retryAfter);
  }
  if (status === 403) {
    throw new TradeApiError(403, "Trade API returned 403 — POESESSID missing or expired.");
  }
  throw new TradeApiError(status, `Trade API error: ${status}`);
}

// ---------------------------------------------------------------------------
// Minimal rate limiter: serialize all trade calls and enforce a minimum gap
// between them. The trade API also returns X-Rate-Limit-* headers; we keep a
// conservative fixed floor and let 429s surface with Retry-After.
// (Serverless instances are short-lived, so this guards per-instance bursts.)
// ---------------------------------------------------------------------------
const MIN_INTERVAL_MS = 2100; // ~2s between calls, per FINDINGS.md
let chain: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await delay(wait);
    lastCallAt = Date.now();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then(fn);
}

// ---- Currency exchange ("Ange") ----

function buildExchangeBody(q: ExchangeQuery) {
  return {
    engine: "new" as const,
    query: {
      status: { option: q.status ?? "online" },
      have: [q.have],
      want: [q.want],
      ...(q.minimum != null ? { minimum: q.minimum } : {}),
    },
    sort: { have: "asc" as const },
  };
}

export async function fetchExchange(q: ExchangeQuery): Promise<ExchangeResponse> {
  if (useMock()) return mockExchange(q);

  const url = `${TRADE_BASE}/api/trade2/exchange/${encodeURIComponent(q.league)}`;
  return schedule(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(buildExchangeBody(q)),
      cache: "no-store",
    });
    if (!res.ok) throwForStatus(res.status, res.headers);
    return (await res.json()) as ExchangeResponse;
  });
}

// ---- Item search (POST search -> GET fetch) ----

export interface SearchListResponse {
  id: string;
  result: string[];
  total: number;
  inexact?: boolean;
}

export async function postSearch(
  league: string,
  body: SearchBody,
): Promise<SearchListResponse> {
  const url = `${TRADE_BASE}/api/trade2/search/poe2/${encodeURIComponent(league)}`;
  return schedule(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throwForStatus(res.status, res.headers);
    return (await res.json()) as SearchListResponse;
  });
}

// Fetch up to 10 listing hashes in a single call.
export async function getListings(
  ids: string[],
  queryId: string,
): Promise<FetchItem[]> {
  if (!ids.length) return [];
  const url = `${TRADE_BASE}/api/trade2/fetch/${ids.join(",")}?query=${encodeURIComponent(
    queryId,
  )}&realm=poe2`;
  return schedule(async () => {
    const res = await fetch(url, { headers: buildHeaders(), cache: "no-store" });
    if (!res.ok) throwForStatus(res.status, res.headers);
    const data = (await res.json()) as { result: FetchItem[] };
    return data.result ?? [];
  });
}
