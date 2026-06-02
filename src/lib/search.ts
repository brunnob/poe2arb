// Shared, pure helpers for building PoE2 item-search queries.
// Safe to import from both client (live JSON preview) and server (proxy).
// Schema verified against the live trade client — see FINDINGS.md.

export interface Range {
  min?: number;
  max?: number;
}

export interface StatFilter {
  id: string; // e.g. "explicit.stat_3299347043"
  min?: number;
  max?: number;
  disabled?: boolean;
}

export type OptionTri = "" | "true" | "false";

export interface QuerySpec {
  league: string;
  name?: string; // exact item name (e.g. a unique)
  type?: string; // base type
  category?: string; // type_filters.category option (e.g. "armour.chest")
  status: "online" | "any";
  sort: "asc" | "desc"; // by price
  price?: { min?: number; max?: number; currency?: string };
  ilvl?: Range;
  quality?: Range;
  gemLevel?: Range;
  // minimum equipment values
  equipment?: { pdps?: number; edps?: number; dps?: number; ar?: number; ev?: number; es?: number };
  corrupted?: OptionTri;
  identified?: OptionTri;
  stats: StatFilter[];
}

export interface SearchBody {
  query: Record<string, unknown>;
  sort: { price: "asc" | "desc" };
}

export const DEFAULT_SPEC: QuerySpec = {
  league: "Standard",
  status: "online",
  sort: "asc",
  stats: [],
};

function range(r?: Range): Range | undefined {
  if (!r) return undefined;
  const out: Range = {};
  if (r.min != null && !Number.isNaN(r.min)) out.min = r.min;
  if (r.max != null && !Number.isNaN(r.max)) out.max = r.max;
  return Object.keys(out).length ? out : undefined;
}

function nonEmpty<T extends object>(o: T): T | undefined {
  return Object.keys(o).length ? o : undefined;
}

export function buildSearchBody(spec: QuerySpec): SearchBody {
  const filters: Record<string, unknown> = {};

  const typeF: Record<string, unknown> = {};
  if (spec.category) typeF.category = { option: spec.category };
  const ilvl = range(spec.ilvl);
  if (ilvl) typeF.ilvl = ilvl;
  const quality = range(spec.quality);
  if (quality) typeF.quality = quality;
  const tf = nonEmpty(typeF);
  if (tf) filters.type_filters = { filters: tf };

  const eq = spec.equipment ?? {};
  const eqF: Record<string, unknown> = {};
  (["pdps", "edps", "dps", "ar", "ev", "es"] as const).forEach((k) => {
    const v = eq[k];
    if (v != null && !Number.isNaN(v)) eqF[k] = { min: v };
  });
  const ef = nonEmpty(eqF);
  if (ef) filters.equipment_filters = { filters: ef };

  const miscF: Record<string, unknown> = {};
  if (spec.corrupted) miscF.corrupted = { option: spec.corrupted };
  if (spec.identified) miscF.identified = { option: spec.identified };
  const gem = range(spec.gemLevel);
  if (gem) miscF.gem_level = gem;
  const mf = nonEmpty(miscF);
  if (mf) filters.misc_filters = { filters: mf };

  const tradeF: Record<string, unknown> = {};
  if (spec.price) {
    const price: Record<string, unknown> = {};
    if (spec.price.min != null && !Number.isNaN(spec.price.min)) price.min = spec.price.min;
    if (spec.price.max != null && !Number.isNaN(spec.price.max)) price.max = spec.price.max;
    if (spec.price.currency) price.option = spec.price.currency;
    if (Object.keys(price).length) tradeF.price = price;
  }
  const trf = nonEmpty(tradeF);
  if (trf) filters.trade_filters = { filters: trf };

  const statFilters = spec.stats
    .filter((s) => s.id && !s.disabled)
    .map((s) => {
      const value = range({ min: s.min, max: s.max });
      return value ? { id: s.id, value } : { id: s.id };
    });
  const stats = statFilters.length ? [{ type: "and", filters: statFilters }] : [];

  const query: Record<string, unknown> = {
    status: { option: spec.status },
    stats,
  };
  if (spec.name) query.name = spec.name;
  if (spec.type) query.type = spec.type;
  if (Object.keys(filters).length) query.filters = filters;

  return { query, sort: { price: spec.sort } };
}

const TRADE_BASE = "https://www.pathofexile.com";

export function searchUrl(league: string): string {
  return `${TRADE_BASE}/api/trade2/search/poe2/${encodeURIComponent(league)}`;
}

// A copy-pasteable cURL for the search POST (with a POESESSID placeholder),
// mirroring the "Copy as cURL" workflow from the reference PDF.
export function buildCurl(spec: QuerySpec): string {
  const body = JSON.stringify(buildSearchBody(spec));
  return [
    `curl '${searchUrl(spec.league)}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -H 'User-Agent: poe2arb/0.1 (+https://github.com/brunnob/poe2arb)' \\`,
    `  -b 'POESESSID=YOUR_SESSION_ID' \\`,
    `  --data-raw '${body.replace(/'/g, "'\\''")}'`,
  ].join("\n");
}

// ---- result shapes (subset of the fetch response we display) ----

export interface FetchItem {
  id: string;
  item?: {
    icon?: string;
    name?: string;
    typeLine?: string;
    baseType?: string;
  };
  listing?: {
    indexed?: string;
    price?: { amount?: number; currency?: string };
    account?: { name?: string; lastCharacterName?: string; online?: { status?: string } };
  };
}

export interface SearchResultItem {
  id: string;
  name: string;
  typeLine: string;
  icon?: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  accountName: string;
  ign?: string;
  status: "online" | "afk" | "offline";
  indexed: string;
}

export function normalizeListing(r: FetchItem): SearchResultItem {
  const online = r.listing?.account?.online;
  const status: SearchResultItem["status"] = !online
    ? "offline"
    : online.status === "afk"
      ? "afk"
      : "online";
  const name = (r.item?.name || "").trim();
  return {
    id: r.id,
    name,
    typeLine: r.item?.typeLine || r.item?.baseType || "",
    icon: r.item?.icon,
    priceAmount: r.listing?.price?.amount ?? null,
    priceCurrency: r.listing?.price?.currency ?? null,
    accountName: r.listing?.account?.name || "unknown",
    ign: r.listing?.account?.lastCharacterName,
    status,
    indexed: r.listing?.indexed || "",
  };
}
