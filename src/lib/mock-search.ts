import { FetchItem, SearchBody } from "./search";

// Deterministic synthetic search results so the builder works without a
// POESESSID (and where pathofexile.com is unreachable). Enabled via useMock().

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function labelFor(body: SearchBody): { name: string; type: string } {
  const q = body.query as Record<string, any>;
  const name = typeof q.name === "string" ? q.name : "";
  const type = typeof q.type === "string" ? q.type : "";
  const category = q.filters?.type_filters?.filters?.category?.option as string | undefined;
  if (name) return { name, type: type || "Item" };
  if (type) return { name: "", type };
  if (category) return { name: "", type: category.replace(/\./g, " ") };
  return { name: "", type: "Item" };
}

export function mockSearch(body: SearchBody, count = 12): FetchItem[] {
  const { name, type } = labelFor(body);
  const q = body.query as Record<string, any>;
  const priceFilter = q.filters?.trade_filters?.filters?.price as
    | { min?: number; max?: number; option?: string }
    | undefined;
  const currency = priceFilter?.option ?? "exalted";
  const basePrice = priceFilter?.max ?? priceFilter?.min ?? 5;
  const desc = `${name}|${type}|${JSON.stringify(q.stats ?? [])}`;
  const rng = seeded(hash(desc));
  const desc_asc = body.sort.price === "desc";

  const items: FetchItem[] = [];
  for (let i = 0; i < count; i++) {
    const step = i + (desc_asc ? count : 1);
    const amount = Math.max(1, Math.round(basePrice * (0.6 + i * 0.12) * 10) / 10);
    const id = `mocklisting-${hash(desc + i).toString(16)}`;
    items.push({
      id,
      item: {
        name,
        typeLine: type,
        baseType: type,
        icon: "",
      },
      listing: {
        indexed: new Date(Date.now() - step * 120_000).toISOString(),
        price: { amount, currency },
        account: {
          name: `Exile_${(hash(id) % 9000) + 1000}`,
          lastCharacterName: `Char_${(hash(id + "c") % 900) + 100}`,
          online: i % 5 === 4 ? { status: "afk" } : { status: undefined },
        },
      },
    });
  }
  if (desc_asc) items.reverse();
  return items;
}
