import { ExchangeQuery, ExchangeResponse } from "./types";
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

function useMock(): boolean {
  return process.env.POE2_MOCK === "1" || !process.env.POESESSID;
}

// ---------------------------------------------------------------------------
// Minimal rate limiter: serialize all exchange calls and enforce a minimum
// gap between them. The trade API also returns X-Rate-Limit-* headers; we
// keep a conservative fixed floor and back off harder on 429s.
// (Serverless instances are short-lived, so this guards per-instance bursts.)
// ---------------------------------------------------------------------------
const MIN_INTERVAL_MS = 2100; // ~2s between calls, per FINDINGS.md
let chain: Promise<void> = Promise.resolve();
let lastCallAt = 0;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await delay(wait);
    lastCallAt = Date.now();
  });
  // Keep the chain alive regardless of individual call outcomes.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run.then(fn);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildBody(q: ExchangeQuery) {
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
  if (useMock()) {
    return mockExchange(q);
  }

  const url = `${TRADE_BASE}/api/trade2/exchange/${encodeURIComponent(q.league)}`;
  const userAgent =
    process.env.POE2_USER_AGENT ?? "poe2arb/0.1 (+https://github.com/brunnob/poe2arb)";

  return schedule(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": userAgent,
        Cookie: `POESESSID=${process.env.POESESSID}`,
      },
      body: JSON.stringify(buildBody(q)),
      cache: "no-store",
    });

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
      throw new TradeApiError(429, "Rate limited by the trade API.", retryAfter);
    }
    if (res.status === 403) {
      throw new TradeApiError(403, "Trade API returned 403 — POESESSID missing or expired.");
    }
    if (!res.ok) {
      throw new TradeApiError(res.status, `Trade API error: ${res.status}`);
    }

    return (await res.json()) as ExchangeResponse;
  });
}
