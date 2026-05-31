// Shapes for the PoE2 trade "exchange" (Currency Exchange / "Ange") API.
// See FINDINGS.md for the full contract.

export interface ExchangeOffer {
  exchange: { currency: string; amount: number };
  item: { amount: number; stock: number };
}

export interface ExchangeAccount {
  name: string;
  lastCharacterName?: string;
  online?: { status?: "afk" };
}

export interface ExchangeListing {
  indexed: string;
  offers: ExchangeOffer[];
  account: ExchangeAccount;
}

export interface ExchangeResultEntry {
  id: string;
  listing: ExchangeListing;
}

export interface ExchangeResponse {
  id: string;
  total: number;
  result: Record<string, ExchangeResultEntry>;
}

export type ListingStatus = "online" | "onlineleague" | "any";

export interface ExchangeQuery {
  league: string;
  have: string;
  want: string;
  minimum?: number;
  status?: ListingStatus;
}

// Normalized, UI-friendly view of a single side of the book.
export interface NormalizedOffer {
  // Price expressed as "have currency per 1 want unit".
  pricePerWant: number;
  haveAmount: number;
  wantAmount: number;
  stock: number;
  accountName: string;
  ign?: string;
  status: "online" | "afk" | "offline";
  indexed: string;
}

export interface SpreadResult {
  league: string;
  base: string; // the currency we price (the "want" of the ask side)
  quote: string; // the currency it is priced in
  // Best ask: cheapest place to BUY `base` using `quote`. quote-per-base.
  bestAsk: number | null;
  // Best bid: most `quote` you can GET by SELLING `base`. quote-per-base.
  bestBid: number | null;
  mid: number | null;
  spread: number | null; // bestAsk - bestBid (in quote per base)
  spreadPct: number | null; // spread / mid
  isArbitrage: boolean; // bestBid > bestAsk (crossed book)
  askOffers: NormalizedOffer[]; // selling base for quote (you buy base)
  bidOffers: NormalizedOffer[]; // selling quote for base (you sell base)
  asOf: string;
  mock: boolean;
}
