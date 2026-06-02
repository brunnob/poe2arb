"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CURRENCIES } from "@/lib/currencies";
import { PRESETS } from "@/lib/presets";
import {
  DEFAULT_SPEC,
  QuerySpec,
  StatFilter,
  buildCurl,
  buildSearchBody,
} from "@/lib/search";
import type { SearchResultItem } from "@/lib/search";

interface StatDef {
  text: string;
  id: string;
  type: string;
}
interface UiStat {
  key: string;
  text: string;
  id: string;
  min?: number;
  max?: number;
}

const CATEGORIES = [
  "",
  "weapon",
  "weapon.bow",
  "weapon.crossbow",
  "weapon.wand",
  "weapon.sceptre",
  "weapon.staff",
  "weapon.dagger",
  "weapon.claw",
  "weapon.onemace",
  "weapon.spear",
  "armour.chest",
  "armour.helmet",
  "armour.gloves",
  "armour.boots",
  "armour.shield",
  "armour.focus",
  "accessory.amulet",
  "accessory.ring",
  "accessory.belt",
  "jewel",
  "flask.life",
  "flask.mana",
  "gem.activegem",
  "gem.supportgem",
  "map.waystone",
  "currency",
];

const PRICE_CURRENCIES = ["", "exalted", "divine", "chaos", "regal", "vaal", "alch"];

function numOrUndef(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

export default function Builder() {
  // Form state
  const [league, setLeague] = useState("Standard");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"online" | "any">("online");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [priceCur, setPriceCur] = useState("");
  const [ilvlMin, setIlvlMin] = useState("");
  const [qualMin, setQualMin] = useState("");
  const [gemMin, setGemMin] = useState("");
  const [pdps, setPdps] = useState("");
  const [es, setEs] = useState("");
  const [ar, setAr] = useState("");
  const [ev, setEv] = useState("");
  const [corrupted, setCorrupted] = useState<QuerySpec["corrupted"]>("");
  const [identified, setIdentified] = useState<QuerySpec["identified"]>("");
  const [uiStats, setUiStats] = useState<UiStat[]>([]);

  // Stat dataset for autocomplete
  const [statDefs, setStatDefs] = useState<StatDef[]>([]);
  const statByText = useMemo(
    () => new Map(statDefs.map((s) => [s.text, s])),
    [statDefs],
  );

  // Results
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SearchResultItem[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; mock: boolean; queryId: string | null } | null>(
    null,
  );
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/data/stats.json")
      .then((r) => r.json())
      .then((d: StatDef[]) => setStatDefs(d))
      .catch(() => {});
  }, []);

  const spec: QuerySpec = useMemo(() => {
    const stats: StatFilter[] = uiStats
      .filter((s) => s.id)
      .map((s) => ({ id: s.id, min: s.min, max: s.max }));
    const price =
      priceMin || priceMax || priceCur
        ? { min: numOrUndef(priceMin), max: numOrUndef(priceMax), currency: priceCur || undefined }
        : undefined;
    const equipment =
      pdps || es || ar || ev
        ? {
            pdps: numOrUndef(pdps),
            es: numOrUndef(es),
            ar: numOrUndef(ar),
            ev: numOrUndef(ev),
          }
        : undefined;
    return {
      ...DEFAULT_SPEC,
      league,
      name: name || undefined,
      type: type || undefined,
      category: category || undefined,
      status,
      sort,
      price,
      ilvl: ilvlMin ? { min: numOrUndef(ilvlMin) } : undefined,
      quality: qualMin ? { min: numOrUndef(qualMin) } : undefined,
      gemLevel: gemMin ? { min: numOrUndef(gemMin) } : undefined,
      equipment,
      corrupted,
      identified,
      stats,
    };
  }, [
    league, name, type, category, status, sort, priceMin, priceMax, priceCur,
    ilvlMin, qualMin, gemMin, pdps, es, ar, ev, corrupted, identified, uiStats,
  ]);

  const body = useMemo(() => buildSearchBody(spec), [spec]);
  const bodyJson = useMemo(() => JSON.stringify(body, null, 2), [body]);

  function loadPreset(id: string) {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    const s = p.build(league);
    setName(s.name ?? "");
    setType(s.type ?? "");
    setCategory(s.category ?? "");
    setStatus(s.status);
    setSort(s.sort);
    setPriceMin(s.price?.min?.toString() ?? "");
    setPriceMax(s.price?.max?.toString() ?? "");
    setPriceCur(s.price?.currency ?? "");
    setIlvlMin(s.ilvl?.min?.toString() ?? "");
    setQualMin(s.quality?.min?.toString() ?? "");
    setGemMin(s.gemLevel?.min?.toString() ?? "");
    setPdps(s.equipment?.pdps?.toString() ?? "");
    setEs(s.equipment?.es?.toString() ?? "");
    setAr(s.equipment?.ar?.toString() ?? "");
    setEv(s.equipment?.ev?.toString() ?? "");
    setCorrupted(s.corrupted ?? "");
    setIdentified(s.identified ?? "");
    setUiStats(
      s.stats.map((st, i) => {
        const def = statDefs.find((d) => d.id === st.id);
        return {
          key: `${id}-${i}-${Date.now()}`,
          id: st.id,
          text: def?.text ?? st.id,
          min: st.min,
          max: st.max,
        };
      }),
    );
  }

  function addStat() {
    setUiStats((s) => [...s, { key: `s-${Date.now()}`, text: "", id: "", min: undefined }]);
  }
  function updateStat(key: string, patch: Partial<UiStat>) {
    setUiStats((s) => s.map((st) => (st.key === key ? { ...st, ...patch } : st)));
  }
  function removeStat(key: string) {
    setUiStats((s) => s.filter((st) => st.key !== key));
  }
  function onStatText(key: string, text: string) {
    const def = statByText.get(text);
    updateStat(key, { text, id: def?.id ?? "" });
  }

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league, query: body, limit: 20 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Error ${res.status}`);
        setItems(null);
        setMeta(null);
      } else {
        setItems(json.items);
        setMeta({ total: json.total, mock: json.mock, queryId: json.queryId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /* ignore */
    }
  }

  // suggestions for the most recently edited stat input (cap for perf)
  function suggestionsFor(text: string): StatDef[] {
    if (text.length < 2) return [];
    const q = text.toLowerCase();
    const out: StatDef[] = [];
    for (const d of statDefs) {
      if (d.text.toLowerCase().includes(q)) {
        out.push(d);
        if (out.length >= 40) break;
      }
    }
    return out;
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/">← Currency bid-ask</Link>
        <span>Query builder</span>
      </nav>
      <h1>poe2arb · Query builder</h1>
      <p className="sub">
        Compose a Path of Exile 2 item-search query, preview the exact API payload, and run it
        (with mock fallback when no <code>POESESSID</code> is set).
      </p>

      <div className="controls">
        <div className="field">
          <label>Preset</label>
          <select defaultValue="" onChange={(e) => e.target.value && loadPreset(e.target.value)}>
            <option value="">— typical queries —</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id} title={p.description}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>League</label>
          <input type="text" value={league} onChange={(e) => setLeague(e.target.value)} />
        </div>
        <div className="field">
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as "online" | "any")}>
            <option value="online">online</option>
            <option value="any">any</option>
          </select>
        </div>
        <div className="field">
          <label>Sort (price)</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as "asc" | "desc")}>
            <option value="asc">cheapest first</option>
            <option value="desc">priciest first</option>
          </select>
        </div>
      </div>

      <section className="card">
        <h3>Identity</h3>
        <div className="grid">
          <div className="field">
            <label>Name (exact)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Headhunter" />
          </div>
          <div className="field">
            <label>Type / base</label>
            <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Expert Dualstring Bow" />
          </div>
          <div className="field">
            <label>Category</label>
            <input
              type="text"
              list="catlist"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. armour.chest"
            />
            <datalist id="catlist">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Price & properties</h3>
        <div className="grid">
          <div className="field">
            <label>Price min</label>
            <input type="text" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          </div>
          <div className="field">
            <label>Price max</label>
            <input type="text" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          </div>
          <div className="field">
            <label>Price currency</label>
            <select value={priceCur} onChange={(e) => setPriceCur(e.target.value)}>
              {PRICE_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c || "—"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Item level min</label>
            <input type="text" value={ilvlMin} onChange={(e) => setIlvlMin(e.target.value)} />
          </div>
          <div className="field">
            <label>Quality min</label>
            <input type="text" value={qualMin} onChange={(e) => setQualMin(e.target.value)} />
          </div>
          <div className="field">
            <label>Gem level min</label>
            <input type="text" value={gemMin} onChange={(e) => setGemMin(e.target.value)} />
          </div>
        </div>
        <div className="grid">
          <div className="field">
            <label>min Phys DPS</label>
            <input type="text" value={pdps} onChange={(e) => setPdps(e.target.value)} />
          </div>
          <div className="field">
            <label>min Energy Shield</label>
            <input type="text" value={es} onChange={(e) => setEs(e.target.value)} />
          </div>
          <div className="field">
            <label>min Armour</label>
            <input type="text" value={ar} onChange={(e) => setAr(e.target.value)} />
          </div>
          <div className="field">
            <label>min Evasion</label>
            <input type="text" value={ev} onChange={(e) => setEv(e.target.value)} />
          </div>
          <div className="field">
            <label>Corrupted</label>
            <select value={corrupted} onChange={(e) => setCorrupted(e.target.value as QuerySpec["corrupted"])}>
              <option value="">any</option>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
          <div className="field">
            <label>Identified</label>
            <select value={identified} onChange={(e) => setIdentified(e.target.value as QuerySpec["identified"])}>
              <option value="">any</option>
              <option value="true">yes</option>
              <option value="false">no</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>
          Stat filters{" "}
          <span className="muted">({statDefs.length ? `${statDefs.length} stats loaded` : "loading…"})</span>
        </h3>
        {uiStats.map((st) => {
          const listId = `stats-${st.key}`;
          return (
            <div className="statrow" key={st.key}>
              <input
                type="text"
                list={listId}
                value={st.text}
                placeholder="type a stat, e.g. to maximum Life"
                onChange={(e) => onStatText(st.key, e.target.value)}
              />
              <datalist id={listId}>
                {suggestionsFor(st.text).map((d) => (
                  <option key={d.id} value={d.text} />
                ))}
              </datalist>
              <input
                type="text"
                className="num"
                placeholder="min"
                value={st.min ?? ""}
                onChange={(e) => updateStat(st.key, { min: numOrUndef(e.target.value) })}
              />
              <input
                type="text"
                className="num"
                placeholder="max"
                value={st.max ?? ""}
                onChange={(e) => updateStat(st.key, { max: numOrUndef(e.target.value) })}
              />
              <span className={st.id ? "tag ok" : "tag warn"}>{st.id || "no match"}</span>
              <button className="ghost" onClick={() => removeStat(st.key)}>
                ✕
              </button>
            </div>
          );
        })}
        <button className="ghost" onClick={addStat}>
          + add stat filter
        </button>
      </section>

      <section className="card">
        <div className="cardhead">
          <h3>API payload preview</h3>
          <div className="btnrow">
            <button className="ghost" onClick={() => copy(bodyJson, "json")}>
              {copied === "json" ? "copied!" : "copy JSON"}
            </button>
            <button className="ghost" onClick={() => copy(buildCurl(spec), "curl")}>
              {copied === "curl" ? "copied!" : "copy cURL"}
            </button>
          </div>
        </div>
        <p className="sub">
          POST <code>{`https://www.pathofexile.com/api/trade2/search/poe2/${league}`}</code>
        </p>
        <pre>{bodyJson}</pre>
      </section>

      <div className="runbar">
        <button onClick={run} disabled={loading}>
          {loading ? "Searching…" : "Run search"}
        </button>
        {meta && (
          <span className="muted">
            {meta.total.toLocaleString()} total · showing {items?.length ?? 0}
            {meta.queryId && !meta.mock ? ` · query ${meta.queryId}` : ""}
          </span>
        )}
      </div>

      {error && <div className="banner error">{error}</div>}
      {meta?.mock && (
        <div className="banner mock">
          Showing <strong>synthetic results</strong> — set a <code>POESESSID</code> to query live.
        </div>
      )}

      {items && items.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Seller</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>
                  {it.name ? <strong>{it.name}</strong> : null}
                  {it.name && it.typeLine ? " · " : null}
                  {it.typeLine}
                </td>
                <td>
                  {it.priceAmount != null
                    ? `${it.priceAmount} ${it.priceCurrency ?? ""}`
                    : "—"}
                </td>
                <td className={it.status === "afk" ? "afk" : undefined}>{it.accountName}</td>
                <td className={it.status === "offline" ? "muted" : it.status === "afk" ? "afk" : undefined}>
                  {it.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {items && items.length === 0 && <p className="muted">No results.</p>}
    </div>
  );
}
