# poe2arb

PoE2 **arb**itrage — a webapp that reads the official **Path of Exile 2** trade API
and surfaces **bid-ask spreads / arbitrage opportunities** in the Currency Exchange
("Ange") market.

Built with **Next.js (App Router, TypeScript)** and designed to deploy on **Vercel**.
The Next.js serverless API routes act as the required server-side proxy to the trade
API (the browser can't call it directly — CORS, the `POESESSID` cookie, and a
`User-Agent` are all enforced server-side).

## How it works

- **`/`** — Currency bid-ask: pick a pair + league and view the spread and both order books.
- **`/builder`** — Query builder: visually compose an item-search query, see the **exact API
  payload** update live, copy it as JSON or **cURL**, and run it. Ships ~10 "typical query"
  presets (unique by name, life+res chest, min-DPS weapon, caster sceptre, gem by level,
  waystone by tier, …) and an autocomplete over **2,000+ real PoE2 stat IDs**.
- **`/api/spread?base=divine&quote=exalted&league=Standard`** — computes the bid-ask spread
  for `base` priced in `quote`: two exchange queries (one per direction), normalized offers,
  best ask/bid, mid, spread %, and a crossed-book arbitrage flag.
- **`/api/search`** (POST `{ league, query, limit }`) — runs the 2-step item search
  (POST search → batched GET fetch, ≤10 ids/call) and returns normalized listings.
- **`/api/currencies`** — the list of supported currency tags.

See **[FINDINGS.md](./FINDINGS.md)** for the full trade API contract, currency tags,
the bid-ask math, and auth/rate-limit details.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in POESESSID for live data (optional)
npm run dev                  # http://localhost:3000
```

Without a `POESESSID` (or with `POE2_MOCK=1`), the API serves **synthetic data** so
the UI works offline — handy for development and for environments where
`pathofexile.com` is unreachable.

### Environment variables

| Var               | Purpose                                                        |
|-------------------|----------------------------------------------------------------|
| `POESESSID`       | Logged-in session cookie from pathofexile.com (required live)  |
| `POE2_LEAGUE`     | Default league (e.g. `Standard`)                               |
| `POE2_USER_AGENT` | Descriptive UA sent to the trade API                           |
| `POE2_MOCK`       | `1` to force synthetic data and never call the live API        |

## Deploying to Vercel

1. Import the repo into Vercel (framework auto-detected as Next.js).
2. Add `POESESSID`, `POE2_LEAGUE`, and `POE2_USER_AGENT` in
   **Project Settings → Environment Variables**.
3. Deploy.

> Note: a single shared `POESESSID` serves all visitors — fine for a personal tool,
> not for a public multi-user product. The rate limiter is per-instance; for
> concurrent traffic, back it with a shared store (e.g. Vercel KV / Upstash).

## Status

Working scaffold: trade-API proxy + bid-ask/arbitrage engine + UI, verified against
mock data. Live verification requires a real `POESESSID` in an environment that can
reach `pathofexile.com`.
