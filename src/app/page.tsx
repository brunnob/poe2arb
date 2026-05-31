"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@/lib/currencies";
import type { NormalizedOffer, SpreadResult } from "@/lib/types";

function fmt(n: number | null, digits = 4): string {
  if (n == null) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function OfferTable({
  offers,
  base,
  quote,
}: {
  offers: NormalizedOffer[];
  base: string;
  quote: string;
}) {
  if (!offers.length) return <p className="muted">No offers.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Seller</th>
          <th>{quote} / {base}</th>
          <th>Stock</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((o, i) => (
          <tr key={i}>
            <td className={o.status === "afk" ? "afk" : undefined}>
              {o.accountName}
              {o.status === "afk" ? " (afk)" : ""}
            </td>
            <td>{fmt(o.pricePerWant)}</td>
            <td>{o.stock.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Home() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [base, setBase] = useState("divine");
  const [quote, setQuote] = useState("exalted");
  const [league, setLeague] = useState("Standard");
  const [includeAfk, setIncludeAfk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SpreadResult | null>(null);

  useEffect(() => {
    fetch("/api/currencies")
      .then((r) => r.json())
      .then((d) => setCurrencies(d.currencies ?? []))
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        base,
        quote,
        league,
        includeAfk: includeAfk ? "1" : "0",
      });
      const res = await fetch(`/api/spread?${qs}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        setData(null);
      } else {
        setData(json as SpreadResult);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <h1>poe2arb · Currency Exchange bid-ask</h1>
      <p className="sub">
        Bid-ask spreads &amp; arbitrage in the Path of Exile 2 Currency Exchange
        (&ldquo;Ange&rdquo;) market.
      </p>

      <div className="controls">
        <div className="field">
          <label>Base (priced)</label>
          <select value={base} onChange={(e) => setBase(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.tag} value={c.tag}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Quote (in)</label>
          <select value={quote} onChange={(e) => setQuote(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.tag} value={c.tag}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>League</label>
          <input
            type="text"
            value={league}
            onChange={(e) => setLeague(e.target.value)}
          />
        </div>
        <div className="field checkbox">
          <input
            id="afk"
            type="checkbox"
            checked={includeAfk}
            onChange={(e) => setIncludeAfk(e.target.checked)}
          />
          <label htmlFor="afk">include offline/afk</label>
        </div>
        <button onClick={load} disabled={loading || base === quote}>
          {loading ? "Loading…" : "Get spread"}
        </button>
      </div>

      {base === quote && (
        <div className="banner error">Base and quote must be different currencies.</div>
      )}
      {error && <div className="banner error">{error}</div>}
      {data?.mock && (
        <div className="banner mock">
          Showing <strong>synthetic data</strong> — no <code>POESESSID</code> configured (or
          <code> POE2_MOCK=1</code>). Set a session to query the live trade API.
        </div>
      )}
      {data?.isArbitrage && (
        <div className="banner arb">
          ⚡ Crossed book — best bid ({fmt(data.bestBid)}) &gt; best ask ({fmt(data.bestAsk)}).
          Potential arbitrage (before fees &amp; effort).
        </div>
      )}

      {data && (
        <>
          <div className="summary">
            <div className="stat">
              <div className="k">Best ask (buy {data.base})</div>
              <div className="v ask">{fmt(data.bestAsk)}</div>
            </div>
            <div className="stat">
              <div className="k">Best bid (sell {data.base})</div>
              <div className="v bid">{fmt(data.bestBid)}</div>
            </div>
            <div className="stat">
              <div className="k">Mid</div>
              <div className="v">{fmt(data.mid)}</div>
            </div>
            <div className="stat">
              <div className="k">Spread</div>
              <div className="v">
                {data.spreadPct != null ? `${(data.spreadPct * 100).toFixed(2)}%` : "—"}
              </div>
            </div>
          </div>

          <div className="books">
            <div className="book">
              <h3 className="ask">Asks · sellers of {data.base}</h3>
              <OfferTable offers={data.askOffers} base={data.base} quote={data.quote} />
            </div>
            <div className="book">
              <h3 className="bid">Bids · buyers of {data.base}</h3>
              <OfferTable offers={data.bidOffers} base={data.base} quote={data.quote} />
            </div>
          </div>

          <p className="sub" style={{ marginTop: 16 }}>
            Prices shown as <strong>{data.quote} per {data.base}</strong>. As of{" "}
            {new Date(data.asOf).toLocaleTimeString()} · league {data.league}.
          </p>
        </>
      )}
    </div>
  );
}
