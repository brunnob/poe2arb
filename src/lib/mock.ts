import { ExchangeQuery, ExchangeResponse, ExchangeResultEntry } from "./types";

// Deterministic synthetic exchange data so the app works without a POESESSID
// (and in environments where pathofexile.com is unreachable). Enabled when
// POE2_MOCK=1 or no POESESSID is configured.

// Rough reference values in "chaos per unit" to make pairs look plausible.
const CHAOS_VALUE: Record<string, number> = {
  divine: 320,
  exalted: 8,
  chaos: 1,
  regal: 2,
  vaal: 1.5,
  alch: 0.5,
  chance: 0.8,
  aug: 0.2,
  transmute: 0.1,
  mirror: 1_800_000,
};

function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function mockExchange(q: ExchangeQuery): ExchangeResponse {
  const haveVal = CHAOS_VALUE[q.have] ?? 1;
  const wantVal = CHAOS_VALUE[q.want] ?? 1;
  // Fair price: how much `have` currency for 1 `want` unit.
  const fair = wantVal / haveVal;

  const rng = seeded(hash(`${q.league}:${q.have}:${q.want}`));
  const result: Record<string, ExchangeResultEntry> = {};
  const count = 8;

  for (let i = 0; i < count; i++) {
    // Sellers of `want` ask a bit above fair; spread widens down the book.
    const markup = 1 + 0.01 + rng() * 0.06 + i * 0.01;
    const price = fair * markup;
    // Express as integer-ish amounts: per `wantUnit` of want, pay `haveAmount`.
    const wantUnit = Math.max(1, Math.round(1 / Math.min(1, fair)) || 1);
    const haveAmount = Math.max(1, Math.round(price * wantUnit));

    const hashId = `mock-${q.have}-${q.want}-${i}`;
    result[hashId] = {
      id: hashId,
      listing: {
        indexed: new Date(Date.now() - i * 90_000).toISOString(),
        offers: [
          {
            exchange: { currency: q.have, amount: haveAmount },
            item: { amount: wantUnit, stock: Math.round(5 + rng() * 200) },
          },
        ],
        account: {
          name: `Exile_${(hash(hashId) % 9000) + 1000}`,
          lastCharacterName: `Char_${(hash(hashId + "c") % 900) + 100}`,
          online: i % 4 === 3 ? { status: "afk" } : {},
        },
      },
    };
  }

  return { id: `mockquery-${hash(`${q.have}${q.want}`)}`, total: count, result };
}
