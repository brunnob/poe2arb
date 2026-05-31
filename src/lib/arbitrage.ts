import { fetchExchange } from "./poe";
import {
  ExchangeResponse,
  ListingStatus,
  NormalizedOffer,
  SpreadResult,
} from "./types";

function accountStatus(entry: { listing: { account: { online?: { status?: "afk" } } } }) {
  const online = entry.listing.account.online;
  if (!online) return "offline" as const;
  return online.status === "afk" ? ("afk" as const) : ("online" as const);
}

// Convert a raw exchange response into normalized offers, priced as
// "have currency per 1 want unit", sorted cheapest-first.
export function normalizeOffers(resp: ExchangeResponse): NormalizedOffer[] {
  const offers: NormalizedOffer[] = [];
  for (const entry of Object.values(resp.result)) {
    const offer = entry.listing.offers[0];
    if (!offer || offer.item.amount <= 0 || offer.exchange.amount <= 0) continue;
    offers.push({
      pricePerWant: offer.exchange.amount / offer.item.amount,
      haveAmount: offer.exchange.amount,
      wantAmount: offer.item.amount,
      stock: offer.item.stock,
      accountName: entry.listing.account.name,
      ign: entry.listing.account.lastCharacterName,
      status: accountStatus(entry),
      indexed: entry.listing.indexed,
    });
  }
  offers.sort((a, b) => a.pricePerWant - b.pricePerWant);
  return offers;
}

interface SpreadOptions {
  league: string;
  base: string; // currency being priced
  quote: string; // currency it is priced in
  status?: ListingStatus;
  minimum?: number;
  includeAfk?: boolean;
  mock?: boolean;
}

// Compute the bid-ask spread for `base` priced in `quote`.
//
//  - ASK side  = people selling `base` for `quote`  -> have: quote, want: base
//                pricePerWant is already quote-per-base.
//  - BID side  = people selling `quote` for `base`  -> have: base,  want: quote
//                pricePerWant is base-per-quote; invert to quote-per-base.
export async function computeSpread(opts: SpreadOptions): Promise<SpreadResult> {
  const { league, base, quote } = opts;
  const status = opts.status ?? "online";

  const [askResp, bidResp] = await Promise.all([
    fetchExchange({ league, have: quote, want: base, status, minimum: opts.minimum }),
    fetchExchange({ league, have: base, want: quote, status, minimum: opts.minimum }),
  ]);

  let askOffers = normalizeOffers(askResp);
  let bidRaw = normalizeOffers(bidResp);

  if (!opts.includeAfk) {
    askOffers = askOffers.filter((o) => o.status !== "offline");
    bidRaw = bidRaw.filter((o) => o.status !== "offline");
  }

  // Bid offers, re-expressed as quote-per-base (inverted) and sorted best-first.
  const bidOffers: NormalizedOffer[] = bidRaw
    .map((o) => ({
      ...o,
      pricePerWant: 1 / o.pricePerWant,
    }))
    .sort((a, b) => b.pricePerWant - a.pricePerWant);

  const bestAsk = askOffers.length ? askOffers[0].pricePerWant : null;
  const bestBid = bidOffers.length ? bidOffers[0].pricePerWant : null;

  let mid: number | null = null;
  let spread: number | null = null;
  let spreadPct: number | null = null;
  let isArbitrage = false;

  if (bestAsk != null && bestBid != null) {
    mid = (bestAsk + bestBid) / 2;
    spread = bestAsk - bestBid;
    spreadPct = mid !== 0 ? spread / mid : null;
    isArbitrage = bestBid > bestAsk;
  }

  const mock = process.env.POE2_MOCK === "1" || !process.env.POESESSID;

  return {
    league,
    base,
    quote,
    bestAsk,
    bestBid,
    mid,
    spread,
    spreadPct,
    isArbitrage,
    askOffers: askOffers.slice(0, 10),
    bidOffers: bidOffers.slice(0, 10),
    asOf: new Date().toISOString(),
    mock,
  };
}
